/**
 * Plan guard for the old-ops sweep's fleet-wide BOUNDARY SCAN, on a REAL PostgreSQL —
 * production's major version, not PGlite's.
 *
 * WHAT WENT WRONG. `deleteOldSyncedOpsForAllUsers` opens with one fleet-wide `groupBy`
 * that computes every user's causal boundary:
 *
 *   SELECT user_id, MAX(server_seq) FROM operations
 *   WHERE server_seq > 1 AND <CAUSAL_FULL_STATE_OPERATION_WHERE>
 *   GROUP BY user_id
 *
 * It is the ONLY statement in that function outside the per-candidate `try`, so its
 * failure is not one user's skip — it is the whole fleet's retention pass. On 2026-08-29
 * it was cancelled at the 60s `statement_timeout` (57014) and the sweep pruned nothing:
 * an ERROR line with no accompanying "removed N", the exact signature `cleanup.ts` logs
 * unconditionally to make visible. The sibling specs pin the PROBE
 * (old-ops-probe-plan) and the DELETE batches (old-ops-delete-plan); this statement — the
 * one that actually aborted the sweep — had no plan guard at all.
 *
 * WHY IT WAS SLOW. Production measured the index side at 2.5ms / 92 buffers and the
 * Bitmap Heap Scan at 33,728ms / 3,930 heap blocks: ~100% of the runtime is random heap
 * access, because `op_type` and `repair_base_server_seq` are not in the broad partial
 * index and the residual Filter costs one heap visit per candidate row. At the host's
 * ~150 IOPS those blocks are ~24s of pure I/O, which is why the statement sat BISTABLE
 * around the 60s cap — 33.7s with a half-warm cache, over the cap whenever an autovacuum
 * was competing for the same disk. So the budget that matters here is HEAP FETCHES, not
 * wall time and not `blocks` (a warm page is a hit and hides the whole problem).
 *
 * WHY `INCLUDE` WAS NOT THE FIX, which is what this file's first test really pins.
 * `predicate_implied_by` cannot prove `(A OR B) => op_type IN (3-set)`: predtest.c's rule
 * for a disjunctive predicate is "the clause implies SOME ONE disjunct", and a clause that
 * is itself an OR needs case analysis the prover does not do. So no index-only path is
 * generated at all and the only route into the broad index is `generate_bitmap_or_paths`
 * splitting the OR into two provable arms — the duplicated `BitmapOr` in the production
 * plan, the same index scanned twice and OR'd with itself. A Bitmap Heap Scan discards the
 * index tuple, so INCLUDE columns are unreachable by construction. Migration
 * 20260829000000 instead gives the index the causal predicate VERBATIM, so
 * `create_indexscan_plan` drops the whole OR as implied-by-predicate and `server_seq`
 * answers what is left as a key column.
 *
 * MEASURED UNDER force_custom_plan — deliberately, and this file is the exception to
 * explain-plan.helper.ts's "never measure the custom plan" rule. A PARTIAL index is
 * unreachable under a generic plan at all: with `Param` nodes there are no `Const`s for
 * `operator_predicate_proof`, so `predOK` is false for every partial index on this table.
 * Production measured custom = BitmapOr cost 22,844 against generic = Parallel Seq Scan
 * cost 982,701, and `choose_custom_plan` adopts the generic plan only when its cost is at
 * or below the average custom cost — a 43x margin that pins this statement on custom
 * plans. That margin is a load-bearing assumption rather than a detail, so the third test
 * asserts it directly. If it ever inverts, CI fails instead of production.
 *
 * THE PARTIAL INDEXES ARE CREATED BY THIS SPEC, not by the schema. Prisma has no
 * partial-index syntax, so both live only in raw migrations and a `prisma db push`
 * database has NEITHER (#9192) — which is how CI provisions
 * (supersync-server-tests.yml), so dropping them again in `afterAll` restores the exact
 * starting state. Their DDL is READ OUT OF the migration files rather than copied, so
 * this file cannot drift into measuring a world that does not ship.
 *
 * Prerequisites, as for the other *.integration.spec.ts files: a real PostgreSQL with the
 * schema applied (`prisma db push`) and DATABASE_URL set; skipped entirely when unset.
 *
 *   DATABASE_URL=postgresql://... npx vitest run --config vitest.integration.config.ts \
 *     tests/integration/old-ops-boundary-plan.integration.spec.ts
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  explainCustom,
  explainGeneric,
  type ExplainRunner,
  type Measured,
} from '../explain-plan.helper';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;

const NOW = 1_760_000_000_000;

/**
 * Large enough that the fleet-wide aggregate is a real aggregate. Production groups 2,933
 * users out of ~11.5k; a handful of users would make every candidate plan look cheap and
 * the file would prove nothing.
 */
const USER_COUNT = 2_000;
/** Ops per user. USER_COUNT x OPS_PER_USER rows have to span enough heap pages that the
 *  canary's scattered fetches are visibly catastrophic — see the CANARY test. */
const OPS_PER_USER = 30;
/** Every user's causal import lands here; every user's REPAIR here. Both > 1, so neither
 *  is excluded by the sweep's `server_seq > 1` (which skips users whose only boundary is
 *  the initial import at seq 1). */
const IMPORT_SEQ = 10;
const REPAIR_SEQ = 20;

/**
 * Production's shape: 3,162 causal rows, 651 legacy REPAIRs discarded by the Filter, 2,933
 * groups. Reproduced here as one import per user plus a REPAIR for every user, of which
 * every 4th carries NO base cursor and must be excluded.
 */
const LEGACY_REPAIR_USERS = USER_COUNT / 4;
const CAUSAL_ROWS = USER_COUNT + (USER_COUNT - LEGACY_REPAIR_USERS);

const CAUSAL_IDX = 'operations_user_id_causal_full_state_server_seq_idx';
const BROAD_IDX = 'operations_user_id_full_state_server_seq_idx';

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../prisma/migrations',
);

/**
 * The shipped `CREATE INDEX` for one index, READ OUT OF ITS MIGRATION rather than copied
 * here. Copying the predicate would make this file's whole claim conditional on a comment
 * asking future authors to keep two places in step: the specs measure what ships only for
 * as long as the copy is accurate, and a drifted copy fails silently by measuring a world
 * that does not exist. Extracting it means a migration whose shape changes makes this
 * throw — loudly, at setup — instead.
 *
 * `CONCURRENTLY` is stripped: it cannot run inside a transaction and buys nothing here.
 */
const createIndexFromMigration = (migrationDir: string, indexName: string): string => {
  const sql = readFileSync(join(migrationsDir, migrationDir, 'migration.sql'), 'utf8');
  const statement = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`CREATE INDEX CONCURRENTLY "${indexName}"`));
  if (!statement) {
    throw new Error(
      `no CREATE INDEX CONCURRENTLY "${indexName}" found in ${migrationDir}/migration.sql`,
    );
  }
  return statement.replace(' CONCURRENTLY', '');
};

const CREATE_BROAD_IDX = createIndexFromMigration(
  '20260512000000_add_full_state_sequence_index_drop_redundant_indexes',
  BROAD_IDX,
);
const CREATE_CAUSAL_IDX = createIndexFromMigration(
  '20260829000000_add_causal_full_state_index',
  CAUSAL_IDX,
);

/**
 * The statement under test. Hand-written rather than captured, because the sweep issues it
 * through Prisma's `groupBy` (not a tagged template), so there is no production
 * `Prisma.sql` to render. Keep the WHERE identical to
 * CAUSAL_FULL_STATE_OPERATION_WHERE (sync.types.ts) as the sweep spreads it — the OR shape
 * IS the subject of this file, so "simplifying" it here would measure a different query.
 */
const BOUNDARY_SQL = `SELECT "user_id", MAX("server_seq") AS "max_server_seq"
   FROM "operations"
  WHERE "server_seq" > $1
    AND ( "op_type" IN ($2, $3)
          OR ("op_type" = $4 AND "repair_base_server_seq" IS NOT NULL) )
  GROUP BY "user_id"`;
const BOUNDARY_PARAMS = [1, 'SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR'] as const;

/**
 * Every row in ONE scrambled INSERT, which is load-bearing rather than tidy. Full-state
 * rows written as a separate trailing batch would land on consecutive heap pages, the
 * bitmap heap scan would fetch a few dozen blocks instead of hundreds, and the canary
 * would pass while measuring nothing. Production interleaves every tenant's concurrent
 * writes, so a user's full-state ops virtually never share a page — `ORDER BY md5(...)`
 * restores that.
 */
const SEED_SQL = `INSERT INTO "operations" (
     "id","user_id","client_id","server_seq","action_type","op_type","entity_type",
     "entity_id","payload","vector_clock","schema_version","client_timestamp",
     "received_at","repair_base_server_seq"
   )
   SELECT 'op-' || u || '-' || g, u, 'c-' || u, g, 'ADD',
          CASE WHEN g = ${IMPORT_SEQ} THEN 'SYNC_IMPORT'
               WHEN g = ${REPAIR_SEQ} THEN 'REPAIR'
               ELSE 'CRT' END,
          'TASK', 'e' || g, '{}'::jsonb, '{}'::jsonb, 1, ${NOW}, ${NOW} - g * 1000,
          CASE WHEN g = ${REPAIR_SEQ} AND u % 4 <> 0 THEN 5 ELSE NULL END
   FROM generate_series(1, ${USER_COUNT}) u, generate_series(1, ${OPS_PER_USER}) g
   ORDER BY md5((u * 1000 + g)::text)`;

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL ?? '' } } });

const runnerFor = (tx: Prisma.TransactionClient): ExplainRunner => ({
  exec: (sql) => tx.$executeRawUnsafe(sql),
  query: async (sql) => ({
    rows: (await tx.$queryRawUnsafe(sql)) as Array<Record<string, unknown>>,
  }),
});

type Plan = {
  /** Rows the plan actually walked: emitted PLUS discarded by a Filter. */
  examined: number;
  /** Root-node shared hit+read blocks. */
  blocks: number;
  /** Tuples whose page the visibility map did NOT mark all-visible. THE budget here. */
  heapFetches: number;
  rowsFiltered: number;
  estimatedCost: number;
  nodes: string;
};

const toPlan = (m: Measured): Plan => ({
  examined: m.rowsTouched + m.rowsFiltered + m.rowsJoinFiltered,
  blocks: m.blocks,
  heapFetches: m.heapFetches,
  rowsFiltered: m.rowsFiltered,
  estimatedCost: m.estimatedCost,
  nodes: m.nodes,
});

/**
 * PREPARE/EXECUTE is SESSION state and Prisma's pool hands out a connection per query, so
 * the EXPLAIN would otherwise land on a different backend than the PREPARE. One
 * interactive transaction pins a single connection.
 */
const measureCustom = async (): Promise<Plan> =>
  prisma.$transaction(async (tx) =>
    toPlan(await explainCustom(runnerFor(tx), BOUNDARY_SQL, BOUNDARY_PARAMS)),
  );

const measureGeneric = async (): Promise<Plan> =>
  prisma.$transaction(async (tx) =>
    toPlan(await explainGeneric(runnerFor(tx), BOUNDARY_SQL, BOUNDARY_PARAMS)),
  );

const ROLLBACK_SENTINEL = 'rollback-after-measuring';

/**
 * Runs `ddl`, measures under a custom plan, then forces a rollback. DDL is transactional
 * in PostgreSQL, so dropping an index and rolling back leaves the schema untouched;
 * throwing is the only way to make Prisma roll an interactive transaction back.
 */
const measureCustomUnderDdl = async (ddl: readonly string[]): Promise<Plan> => {
  let captured: Plan | undefined;
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const statement of ddl) await tx.$executeRawUnsafe(statement);
        captured = toPlan(
          await explainCustom(runnerFor(tx), BOUNDARY_SQL, BOUNDARY_PARAMS),
        );
        throw new Error(ROLLBACK_SENTINEL);
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if ((error as Error)?.message !== ROLLBACK_SENTINEL) throw error;
  }
  if (!captured) throw new Error('the plan under the DDL variant was never captured');
  return captured;
};

describeWithDb('Old-ops boundary scan plan (PostgreSQL)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "operations", "users" RESTART IDENTITY CASCADE',
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "users" ("email") SELECT 'boundary-' || g || '@test.invalid' FROM generate_series(1, ${USER_COUNT}) g`,
    );
    await prisma.$executeRawUnsafe(SEED_SQL);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS ${BROAD_IDX}`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS ${CAUSAL_IDX}`);
    await prisma.$executeRawUnsafe(CREATE_BROAD_IDX);
    await prisma.$executeRawUnsafe(CREATE_CAUSAL_IDX);
    // VACUUM, not just ANALYZE: `Heap Fetches: 0` is a claim about the VISIBILITY MAP,
    // which only vacuum populates. ANALYZE rides along because the planner otherwise
    // works from empty statistics.
    await prisma.$executeRawUnsafe('VACUUM (ANALYZE) "operations"');

    // Assert the FIXTURE, not the arithmetic above: if these counts drift, every budget
    // below silently stops meaning what its comment says.
    const rows = await prisma.$queryRawUnsafe<Array<{ causal: bigint; legacy: bigint }>>(
      `SELECT
         count(*) FILTER (
           WHERE op_type IN ('SYNC_IMPORT','BACKUP_IMPORT')
              OR (op_type = 'REPAIR' AND repair_base_server_seq IS NOT NULL)
         ) AS causal,
         count(*) FILTER (
           WHERE op_type = 'REPAIR' AND repair_base_server_seq IS NULL
         ) AS legacy
       FROM "operations"`,
    );
    if (Number(rows[0].causal) !== CAUSAL_ROWS) {
      throw new Error(
        `seed is wrong: ${rows[0].causal} causal rows, expected ${CAUSAL_ROWS}`,
      );
    }
    if (Number(rows[0].legacy) !== LEGACY_REPAIR_USERS) {
      throw new Error(
        `seed is wrong: ${rows[0].legacy} legacy REPAIRs, expected ${LEGACY_REPAIR_USERS}`,
      );
    }
  }, 180_000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "operations", "users" RESTART IDENTITY CASCADE',
    );
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS ${CAUSAL_IDX}`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS ${BROAD_IDX}`);
    await prisma.$disconnect();
  });

  it('answers the boundary scan without touching the heap', async () => {
    const plan = await measureCustom();

    // THE budget. `blocks` cannot carry this claim: a heap page still in shared_buffers
    // is a hit, so a fully degraded scan reads cheap here and is catastrophic on a
    // production host where that page is cold — which is exactly how this statement
    // measured 33.7s on one run and blew a 60s cap on another.
    expect(plan.heapFetches).toBe(0);
    // Every causal row is emitted; nothing is discarded by a residual Filter, because the
    // OR is dropped as implied-by-predicate rather than re-checked per row.
    expect(plan.rowsFiltered).toBe(0);
    // `examined` sums Actual Rows over the WHOLE tree (see explain-plan.helper.ts), so a
    // scan-plus-aggregate plan reports the causal rows AND one row per group. Asserting
    // the exact total is deliberate: a plan that grows a node — a Gather, a re-check, a
    // second scan of the same index — changes this number, and that is a regression this
    // file should catch rather than tolerate.
    expect(plan.examined).toBe(CAUSAL_ROWS + USER_COUNT);
    // Scales with full-state rows, not with the table: this is the causal index's own
    // page count and nothing else (measured 12 on PG 16.15, against the canary's 1,099).
    // Loose enough to survive different page packing, tight enough that a plan which
    // starts touching the heap again cannot pass.
    expect(plan.blocks).toBeLessThan(50);
  });

  it('CANARY: without the causal index the same query is heap-bound', async () => {
    const degraded = await measureCustomUnderDdl([`DROP INDEX ${CAUSAL_IDX}`]);

    // The pre-migration world: the broad index cannot answer `repair_base_server_seq`, so
    // every candidate row costs a heap visit and the legacy REPAIRs are discarded only
    // after being fetched. If this ever goes cheap, the SEED has stopped reproducing
    // production and the first test is vacuous — which is a FAILURE, not a pass.
    expect(degraded.rowsFiltered).toBe(LEGACY_REPAIR_USERS);
    expect(degraded.blocks).toBeGreaterThan(300);
    expect(degraded.blocks).toBeGreaterThan(10 * (await measureCustom()).blocks);
  });

  it('pins the custom-plan margin the fix depends on', async () => {
    const custom = await measureCustom();
    const generic = await measureGeneric();

    // A partial index is unreachable under a generic plan: with `Param` nodes there are no
    // `Const`s for operator_predicate_proof, so predOK is false for BOTH partial indexes
    // and the planner is left with a sequential scan.
    expect(generic.nodes).toContain('Seq Scan');
    expect(custom.nodes).not.toContain('Seq Scan');

    // The load-bearing assumption, stated as an assertion. `choose_custom_plan` adopts the
    // generic plan only when its cost is at or below the average custom cost; production
    // measured 982,701 against 22,844. A margin this wide is why the sweep can rely on a
    // custom plan without a $queryRaw — and why a third copy of the causal predicate was
    // NOT added to src/. If this inverts, that reasoning is dead and the fix needs
    // literals in the SQL.
    expect(generic.estimatedCost).toBeGreaterThan(5 * custom.estimatedCost);
  });
});
