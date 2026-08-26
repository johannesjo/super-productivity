/**
 * Plan guard for the old-ops sweep's fresh-prefix probe, on a REAL PostgreSQL —
 * production's major version, not PGlite's.
 *
 * WHAT WENT WRONG. `deleteOldSyncedOpsForAllUsers` asks, once per candidate, "does this
 * user still hold an op below the causal boundary but inside the retention window?"
 *
 *   findFirst({ where: { userId, serverSeq: { lt }, receivedAt: { gte } },
 *               orderBy: { receivedAt: 'asc' }, select: { serverSeq: true } })
 *
 * The predicate is a 2D range and NO index answers both sides as search bounds, so one
 * side is always a residual Filter and there are two candidate plans:
 *
 *   A  operations_user_id_received_at_idx   — bounded by the RETENTION WINDOW
 *   B  operations_user_id_server_seq_key    — bounded by the user's ENTIRE AGED PREFIX
 *
 * B is what hit the 60s `statement_timeout` (57014) on production, and because the throw
 * escaped the per-candidate loop it cost the WHOLE FLEET its nightly retention pass. B is
 * worst precisely on the deepest histories — the cohort the sweep exists to prune — so it
 * degrades every day it fails.
 *
 * WHY IT WAS A COIN FLIP, WHICH IS THE ACTUAL DEFECT. Without the ORDER BY, A and B are
 * not merely close: on the seed below PostgreSQL 16 costs them BIT-IDENTICALLY (both
 * `0.29..32.17 rows=2`), because under a generic plan each is "equality on user_id plus
 * one range with default selectivity". Measured, A touches 9 buffers and B touches
 * 60,329 — a ~6700x difference the cost model cannot see at all. Which one you get is
 * settled by tie-breaking no version promises to keep stable, so the same statement can
 * be instant on one server and fatal on another, or flip after a REINDEX. The second test
 * below pins that tie, because the tie IS the bug.
 *
 * SO THE CANDIDATES ARE MEASURED ONE AT A TIME, each with the other's index dropped inside
 * a rolled-back transaction, and no test asserts which one an unordered EXPLAIN returns.
 * That return is the flip itself, and it really does differ between machines: the seed
 * below yields the window index on one PostgreSQL 16 install and the prefix index on
 * GitHub Actions' 16.15. Reading it as "the candidate the planner chose" is how the first
 * version of this file came to fail CI while asserting something true.
 *
 * WHAT THE ORDER BY DOES. It is not a hint and it does not "prefer" A. It changes the
 * problem so the candidates stop being equivalent: A already emits `received_at` order
 * under an equality qual on `user_id`, so it sorts for free AND keeps LIMIT-1 pushdown
 * (cost 16.23), while B must add a blocking Sort over the whole matching set, losing the
 * early exit (cost 30.86). An exact tie becomes a ~2x margin and the coin flip is gone.
 * The ordering is also free of SEMANTIC risk: the probe asks only whether such a row
 * EXISTS, so which qualifying row comes back cannot change the sweep's decision.
 *
 * MEASURED UNDER force_generic_plan. Prisma sends prepared statements, so the plan is
 * built with the parameter values invisible — which is what makes the candidates tie in
 * the first place. `EXPLAIN` with literals shows a different, healthier world and would
 * hide this entirely. See explain-plan.helper.ts.
 *
 * THE SEED IS THE WHOLE TEST — do not shrink it. Under `force_generic_plan` the planner
 * estimates `user_id = $1` at ntuples/n_distinct, so a two-user seed makes that estimate
 * accurate, both candidates look cheap, and the file proves nothing. Production has ~11.5k
 * users. Hence USER_COUNT, and hence the CANARY: if B ever stops being catastrophic on
 * this seed, the seed has stopped reproducing production and every other assertion here is
 * vacuous — which is a FAILURE, not a pass.
 *
 * Prerequisites, as for the other *.integration.spec.ts files: a real PostgreSQL with the
 * schema applied (`prisma db push`) and DATABASE_URL set; skipped entirely when unset.
 *
 *   DATABASE_URL=postgresql://... npx vitest run --config vitest.integration.config.ts \
 *     tests/integration/old-ops-probe-plan.integration.spec.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  explainGeneric,
  type ExplainRunner,
  type Measured,
} from '../explain-plan.helper';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_760_000_000_000;
const CUTOFF = NOW - 45 * DAY_MS;

/**
 * Large enough that `n_distinct(user_id)` makes the generic estimate for `user_id = $1`
 * far smaller than the real slice — the statistics trap that produces the tie.
 */
const USER_COUNT = 2_000;
/** The deep aged prefix the sweep would prune. All of it sits BELOW the boundary. */
const AGED_PREFIX = 30_000;
/** Recent activity, all ABOVE the boundary, so the honest answer for that user is NO. */
const WINDOW_OPS = 200;
const BOUNDARY_SEQ = AGED_PREFIX + 1;

const WINDOW_IDX = 'operations_user_id_received_at_idx';
const PREFIX_IDX = 'operations_user_id_server_seq_key';

/**
 * The two shapes under test. Hand-written rather than captured, because the sweep issues
 * this through the Prisma model API (not a tagged template), so there is no production
 * `Prisma.sql` to render. Keep the WHERE identical to storage-quota.service.ts's probe —
 * `orderBy` is the ONLY difference between them, which is the entire point.
 */
const WHERE_CLAUSE = `FROM "operations"
   WHERE "user_id" = $1 AND "server_seq" < $2 AND "received_at" >= $3`;
const ORDERED_SQL = `SELECT "server_seq" ${WHERE_CLAUSE} ORDER BY "received_at" ASC LIMIT 1`;
const UNORDERED_SQL = `SELECT "server_seq" ${WHERE_CLAUSE} LIMIT 1`;

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
  estimatedCost: number;
  nodes: string;
};

const toPlan = (m: Measured): Plan => ({
  // ROWS EXAMINED, not `rowsTouched` alone. `rowsTouched` is Actual Rows x Loops — what a
  // node EMITS — and a NO answer emits zero down BOTH candidates, so on its own it cannot
  // tell them apart. The entire cost of the bad plan lands in `Rows Removed by Filter`.
  examined: m.rowsTouched + m.rowsFiltered + m.rowsJoinFiltered,
  estimatedCost: m.estimatedCost,
  nodes: m.nodes,
});

/**
 * PREPARE/EXECUTE is SESSION state and Prisma's pool hands out a connection per query, so
 * the EXPLAIN would otherwise land on a different backend than the PREPARE. One
 * interactive transaction pins a single connection.
 */
const measure = async (sql: string, params: readonly unknown[]): Promise<Plan> =>
  prisma.$transaction(async (tx) =>
    toPlan(await explainGeneric(runnerFor(tx), sql, params)),
  );

const ROLLBACK_SENTINEL = 'rollback-after-measuring';

/**
 * Measures ONE candidate in isolation, by dropping the index that backs the other. DDL is
 * transactional in PostgreSQL, so dropping the index and then forcing a rollback leaves the
 * schema untouched; throwing is the only way to make Prisma roll an interactive transaction
 * back.
 *
 * This is how the file compares candidates without a hint extension. `pg_hint_plan` is not
 * installed on production, and installing it to test what production does would defeat the
 * purpose.
 *
 * Both index names below are plain indexes rather than constraint-backed ones — `@@unique`
 * renders as `CREATE UNIQUE INDEX` in 0_init and under `prisma db push` alike — so a bare
 * `DROP INDEX` reaches either.
 */
const measureWithout = async (
  droppedIdx: string,
  sql: string,
  params: readonly unknown[],
): Promise<Plan> => {
  let captured: Plan | undefined;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DROP INDEX ${droppedIdx}`);
      captured = toPlan(await explainGeneric(runnerFor(tx), sql, params));
      throw new Error(ROLLBACK_SENTINEL);
    });
  } catch (error) {
    if ((error as Error)?.message !== ROLLBACK_SENTINEL) throw error;
  }
  if (!captured) throw new Error(`the plan without ${droppedIdx} was never captured`);
  return captured;
};

/** Candidate A alone — with the prefix index gone, the window index is what serves `user_id`. */
const measureWindowCandidate = (sql: string, params: readonly unknown[]): Promise<Plan> =>
  measureWithout(PREFIX_IDX, sql, params);

/** Candidate B alone — the plan the planner would have had, had the window index not existed. */
const measurePrefixCandidate = (sql: string, params: readonly unknown[]): Promise<Plan> =>
  measureWithout(WINDOW_IDX, sql, params);

describeWithDb('Old-ops fresh-prefix probe plan (PostgreSQL)', () => {
  /** The deep-prefix user: the cohort the sweep exists to prune, and the one that timed out. */
  let deepUserId = 0;
  /** A user whose prefix DOES hold an in-window op — the `skippedFreshPrefix` answer. */
  let freshUserId = 0;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "operations", "users" RESTART IDENTITY CASCADE',
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "users" ("email") SELECT 'plan-' || g || '@test.invalid' FROM generate_series(1, ${USER_COUNT}) g`,
    );
    const ids = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      'SELECT id FROM "users" ORDER BY id LIMIT 2',
    );
    deepUserId = ids[0].id;
    freshUserId = ids[1].id;

    const seedOps = (
      userId: number,
      fromSeq: number,
      count: number,
      receivedAt: string,
    ): string =>
      `INSERT INTO "operations" (
         "id","user_id","client_id","server_seq","action_type","op_type","entity_type",
         "entity_id","payload","vector_clock","schema_version","client_timestamp","received_at"
       )
       SELECT '${userId}-' || (${fromSeq} + g - 1), ${userId}, 'c-${userId}',
              ${fromSeq} + g - 1, 'ADD', 'CRT', 'TASK', 'e' || (${fromSeq} + g - 1),
              '{}'::jsonb, '{}'::jsonb, 1, ${NOW}, ${receivedAt}
       FROM generate_series(1, ${count}) g`;

    // Deep user: a long AGED prefix, then recent activity strictly ABOVE the boundary.
    // `+ 1 - g` and not `- g`: the newest aged row has to land strictly BELOW the cutoff,
    // or it satisfies `received_at >= $3`, the deep user's honest answer flips from NO to
    // YES, and every assertion here quietly stops meaning anything.
    await prisma.$executeRawUnsafe(
      seedOps(deepUserId, 1, AGED_PREFIX, `${CUTOFF} - (${AGED_PREFIX} + 1 - g) * 1000`),
    );
    await prisma.$executeRawUnsafe(
      seedOps(deepUserId, BOUNDARY_SEQ, WINDOW_OPS, `${CUTOFF} + g * 1000`),
    );

    // Fresh user: an in-window op sits BELOW the boundary, so the probe must answer YES.
    await prisma.$executeRawUnsafe(seedOps(freshUserId, 1, 100, `${CUTOFF} - g * 1000`));
    await prisma.$executeRawUnsafe(
      seedOps(freshUserId, 101, 200, `${CUTOFF} + g * 1000`),
    );

    // Every other user gets a handful of rows: n_distinct is what produces the tie, so the
    // population has to be real even though only two users are ever probed.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "operations" (
         "id","user_id","client_id","server_seq","action_type","op_type","entity_type",
         "entity_id","payload","vector_clock","schema_version","client_timestamp","received_at"
       )
       SELECT 'bulk-' || u || '-' || g, u, 'c-' || u, g, 'ADD', 'CRT', 'TASK', 'e' || g,
              '{}'::jsonb, '{}'::jsonb, 1, ${NOW}, ${CUTOFF} - g * 1000
       FROM generate_series(3, ${USER_COUNT}) u, generate_series(1, 5) g`,
    );

    // Without this the planner works from empty statistics and every assertion is noise.
    await prisma.$executeRawUnsafe('ANALYZE "operations"');

    // The deep user's answer MUST be NO, or this file tests nothing. Assert the fixture
    // rather than trusting the arithmetic above.
    const hit = await prisma.operation.findFirst({
      where: {
        userId: deepUserId,
        serverSeq: { lt: BOUNDARY_SEQ },
        receivedAt: { gte: BigInt(CUTOFF) },
      },
      select: { serverSeq: true },
    });
    if (hit) {
      throw new Error(
        `seed is wrong: deep user answers YES at serverSeq ${hit.serverSeq}`,
      );
    }
  }, 180_000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "operations", "users" RESTART IDENTITY CASCADE',
    );
    await prisma.$disconnect();
  });

  it('CANARY: the prefix-bound candidate is catastrophic on this seed', async () => {
    // If this ever comes back cheap, the seed has stopped reproducing production's shape
    // and every other assertion in this file is vacuous. Failing here is the point.
    const prefixCandidate = await measurePrefixCandidate(UNORDERED_SQL, [
      deepUserId,
      BOUNDARY_SEQ,
      CUTOFF,
    ]);

    expect(prefixCandidate.nodes).toContain(PREFIX_IDX);
    expect(prefixCandidate.examined).toBeGreaterThan(AGED_PREFIX / 2);
  });

  it('without the ORDER BY the candidates are cost-tied, so the choice is luck', async () => {
    // THIS IS THE DEFECT. Not "the planner prefers the wrong index" — it cannot tell the
    // two apart AT ALL, while one of them is orders of magnitude more expensive to run. A
    // tie is settled by internals no version promises to keep stable, so the same
    // statement can be instant here and fatal on the production server.
    //
    // BOTH CANDIDATES ARE MEASURED IN ISOLATION, and the plan the planner hands back is
    // deliberately not treated as one of them, because that hand-back IS the coin flip:
    // this exact seed returns the window index on one PostgreSQL 16 install and the prefix
    // index on GitHub Actions' 16.15, where reading the winner as "the cheap candidate"
    // made the ratio below 1 and failed the run. A spec that passes or fails by the very
    // luck it exists to document is measuring the luck, not the tie.
    const windowCandidate = await measureWindowCandidate(UNORDERED_SQL, [
      deepUserId,
      BOUNDARY_SEQ,
      CUTOFF,
    ]);
    const prefixCandidate = await measurePrefixCandidate(UNORDERED_SQL, [
      deepUserId,
      BOUNDARY_SEQ,
      CUTOFF,
    ]);

    expect(windowCandidate.nodes).toContain(WINDOW_IDX);
    expect(prefixCandidate.nodes).toContain(PREFIX_IDX);
    // Not "close enough" — bit-identical, to the planner's own precision.
    expect(prefixCandidate.estimatedCost).toBeCloseTo(windowCandidate.estimatedCost, 5);
    // ...and the tie is emphatically not benign: same predicted cost, ~100x the work.
    expect(
      prefixCandidate.examined / Math.max(windowCandidate.examined, 1),
    ).toBeGreaterThan(50);

    // The planner is choosing blind BETWEEN THESE TWO, at the tied cost — which is the
    // claim. Which of them comes back is not asserted, only that it is one of them: pin
    // the winner and this test starts failing on whichever machine loses the flip.
    const chosen = await measure(UNORDERED_SQL, [deepUserId, BOUNDARY_SEQ, CUTOFF]);
    expect(chosen.nodes).toMatch(new RegExp(`${WINDOW_IDX}|${PREFIX_IDX}`));
    expect(chosen.estimatedCost).toBeCloseTo(windowCandidate.estimatedCost, 5);
  });

  it('the ORDER BY breaks that tie by making the prefix candidate pay a Sort', async () => {
    const chosen = await measure(ORDERED_SQL, [deepUserId, BOUNDARY_SEQ, CUTOFF]);
    const prefixCandidate = await measurePrefixCandidate(ORDERED_SQL, [
      deepUserId,
      BOUNDARY_SEQ,
      CUTOFF,
    ]);

    // The window index emits `received_at` order for free, so it keeps LIMIT-1 pushdown.
    // Asserting the WINNER is legitimate here and only here: the margin below is what took
    // the choice away from the tie-break, so there is no longer a flip to lose.
    expect(chosen.nodes).toContain(WINDOW_IDX);
    expect(chosen.nodes).not.toContain('Sort');
    // The prefix candidate cannot, so it must materialise and sort — losing the early exit
    // and, with it, the tie.
    expect(prefixCandidate.nodes).toContain('Sort');
    expect(prefixCandidate.estimatedCost).toBeGreaterThan(chosen.estimatedCost * 1.5);
  });

  it('bounds a NO answer by the retention window, not by history depth', async () => {
    const { examined, nodes } = await measure(ORDERED_SQL, [
      deepUserId,
      BOUNDARY_SEQ,
      CUTOFF,
    ]);

    expect(nodes).toContain(WINDOW_IDX);
    expect(examined).toBeLessThanOrEqual(WINDOW_OPS * 2);
    // Bounded by recent activity rather than by depth is the whole claim: assert the RATIO
    // too, so the test keeps meaning the same thing if the seed sizes are ever retuned.
    expect(examined).toBeLessThan(AGED_PREFIX / 10);
  });

  it('short-circuits a YES answer on the first row', async () => {
    // `asc` and not `desc`: the in-window ops most likely to sit BELOW the boundary are
    // the oldest ones in the window, so ascending stops earliest on this cohort.
    const { examined } = await measure(ORDERED_SQL, [freshUserId, 300, CUTOFF]);

    expect(examined).toBeLessThanOrEqual(2);
  });
});
