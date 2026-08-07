import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import {
  detectConflictForEntities,
  getEntityConflictKey,
  prefetchLatestEntityOpsForBatch,
} from '../src/sync/conflict';
import type { Operation } from '../src/sync/sync.types';

/**
 * Production incident #9503: `detectConflictForEntities` was cancelled by
 * `statement_timeout` (SQLSTATE 57014) every 5-12 minutes on the production instance,
 * inside the upload transaction. The sibling spec covers the SINGLE-entity lookup;
 * nothing measured the two BATCH queries until this file (#9192, #9205).
 *
 * WHAT THE PLAN ACTUALLY WAS — measured, not reasoned. #9503 hypothesised an unbounded
 * `DISTINCT ON`. It is not that. The combined `(entity_ids && $arr OR entity_id = ANY($arr))`
 * spans the entity_ids GIN and the (user_id, entity_type, entity_id, server_seq) btree, and
 * the planner abandons both to slice-scan the btree: on the seed below, PG16.14 and PGlite
 * both discard the probed user's WHOLE (user_id, entity_type) slice — 2520 rows — for a
 * 100-id probe that matches nothing. `prefetchLatestEntityOpsForBatch` carries no
 * `entity_type` predicate at all, so it discarded 20020: the user's ENTIRE history.
 * That is the same OR-across-two-indexes degeneracy as the 2026-07-20 outage, which
 * conflict.ts flagged as "not excluded" for these paths. `DISTINCT ON` is not what made
 * it expensive; the OR is.
 *
 * MEASURE WITH `force_generic_plan`, NEVER WITH LITERALS — the reasoning is documented
 * once, in the sibling conflict-entity-lookup-plan.pglite.spec.ts header. The production
 * tagged templates are rendered through the real `Prisma.sql`, so the SQL under test is
 * byte-for-byte what conflict.ts sends, including nested `Prisma.join` fragments.
 *
 * WHY THIS SEED DIFFERS FROM THE SIBLING SPEC — do not "align" them:
 *
 *  - The sibling keeps `entity_ids` empty on EVERY row because array-element statistics
 *    disarm ITS regression. That does NOT apply here, and it was checked rather than
 *    assumed: the batch mis-plan reproduces identically at 0% and at 10% multi-entity
 *    rows (the same slice either way), because the OR never lets the planner consider the
 *    GIN in the first place. So this seed DOES populate a minority of rows — otherwise
 *    the array branch of the fix is never exercised at all.
 *  - `fastupdate = off` is set explicitly, matching production (migration
 *    20260720000000, #9213), rather than left at the default as the sibling does. It
 *    decides which plan the array branch gets, so leaving it implicit would measure a
 *    state production is not in. The last describe pins the opposite state on purpose.
 *  - The seed carries a WIDE-array population (see WIDE_WIDTH) as well as the width-2
 *    majority. The first fix for #9503 regressed only on wide arrays, and a width-2
 *    seed cannot express that: see the two "does not fan out" tests.
 *  - Every user gets DISJOINT entity ids, so nothing here measures the array branch's
 *    cross-tenant cost, which is linear in rows across ALL tenants carrying a probed id.
 *    So "bounded" in this file means "bounded given disjoint ids". The shared-literal
 *    case ('KANBAN_DEFAULT' &c.) is documented with numbers at arrayBranchCandidatesCte
 *    in conflict.ts and tracked in #9510; it is not guarded anywhere. Do not read these
 *    tests as covering it.
 *
 * REMAINING FIDELITY LIMITS — PGlite is PG18, and the planner differences from
 * production's PG 16.14 are real, not theoretical. Measured during review of #9503
 * (2026-08, a one-off manual check against postgres:16-alpine, NOT re-run by this file):
 * PG 16.14 plans the array-branch join as a HASH join where PGlite uses a nested loop,
 * so `Rows Removed by Join Filter` reads 0 there for a plan that is still 80x too
 * expensive. That is exactly why `rowsTouched` is the primary assertion — see walk().
 * Blocks are also unmodellable here: PGlite reports every block as a cache hit, so these
 * counts cannot stand in for production's cold-cache I/O. The plan SHAPE transfers; the
 * absolute numbers below do not.
 */

const OWN_OPS = 20_000;
const OTHER_OPS = 20_000;
const USER_ID = 1;
const PROBE_SIZE = 100;
/** Entity types are spread across the seed so the btree slice is N/(users x types). */
const ENTITY_TYPES = [
  'TASK',
  'PROJECT',
  'TAG',
  'NOTE',
  'BOARD',
  'GLOBAL_CONFIG',
  'SIMPLE_COUNTER',
  'TASK_REPEAT_CFG',
];

const CREATE_TABLE = `
  CREATE TABLE operations (
    id             text PRIMARY KEY,
    user_id        integer NOT NULL,
    client_id      text NOT NULL,
    server_seq     integer NOT NULL,
    action_type    text NOT NULL,
    entity_type    text NOT NULL,
    entity_id      text,
    entity_ids     text[] NOT NULL DEFAULT '{}',
    schema_version integer NOT NULL DEFAULT 1,
    vector_clock   jsonb NOT NULL
  );
`;

const createIndexes = (fastupdate: 'on' | 'off'): string => `
  CREATE UNIQUE INDEX operations_user_id_server_seq_key
    ON operations (user_id, server_seq);
  CREATE INDEX operations_user_id_entity_type_entity_id_server_seq_idx
    ON operations (user_id, entity_type, entity_id, server_seq);
  CREATE INDEX operations_entity_ids_gin ON operations USING GIN (entity_ids)
    WITH (fastupdate = ${fastupdate});
`;

const INSERT_COLS =
  'id,user_id,client_id,server_seq,action_type,entity_type,entity_id,entity_ids,' +
  'schema_version,vector_clock';

type PlanNode = Record<string, unknown>;
type Measured = {
  blocks: number;
  rowsTouched: number;
  rowsFiltered: number;
  rowsJoinFiltered: number;
  tempBlocks: number;
  nodes: string;
};

/**
 * `rowsTouched` — Actual Rows x Actual Loops summed over the tree — is the PRIMARY
 * signal, and it is the only one here that is planner-independent.
 *
 * Two rounds of review were defeated by picking a counter instead. Round 1 asserted
 * `Rows Removed by Filter`, and the fan-out moved the work into a JOIN, where Postgres
 * reports `Rows Removed by Join Filter` — a different key, so 59.8M discarded rows
 * scored 0. Round 2 added that key, and it too fails on PG 16.14 (production's version),
 * where the same fan-out is planned as a HASH join and attributes nothing to a join
 * filter: both counters read 0 while the query touches 2.2M rows against the shipped
 * form's 12.5k. `tempBlocks` catches it only at low `work_mem` — the shipped
 * docker-compose sets 4MB, but at 64MB an 80x regression passes clean.
 *
 * Rows touched separates the two by ~177x on BOTH PG 16.14 and PGlite and assumes
 * nothing about join strategy or `work_mem`. Keep the discarded-row counters as
 * secondary signals for the OR mis-plan, but do not rely on them alone again.
 *
 * `Actual Loops` multiplication is not cosmetic: Postgres divides the discarded-row
 * counters by loops (`explain.c:show_instrumentation_count`), so a filter inside a
 * per-probe nested loop is reported at 1/100th of what it discarded.
 */
const walk = (
  node: PlanNode,
  acc: { touched: number; filtered: number; joinFiltered: number; nodes: string[] },
): void => {
  const loops = (node['Actual Loops'] as number) ?? 1;
  acc.touched += ((node['Actual Rows'] as number) ?? 0) * loops;
  acc.filtered += ((node['Rows Removed by Filter'] as number) ?? 0) * loops;
  acc.joinFiltered += ((node['Rows Removed by Join Filter'] as number) ?? 0) * loops;
  acc.nodes.push(
    `${node['Node Type']}${node['Scan Direction'] ? ' ' + node['Scan Direction'] : ''}` +
      `${node['Index Name'] ? ' on ' + node['Index Name'] : ''}`,
  );
  for (const child of (node.Plans as PlanNode[]) ?? []) walk(child, acc);
};

const toSqlLiteral = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return `ARRAY[${value.map(toSqlLiteral).join(',')}]::text[]`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

let preparedCounterId = 0;
const explainGeneric = async (
  db: PGlite,
  sql: string,
  params: readonly unknown[],
): Promise<Measured> => {
  const name = `batch_plan_probe_${preparedCounterId++}`;
  const args = params.map(toSqlLiteral).join(', ');
  await db.exec(`SET plan_cache_mode = force_generic_plan`);
  await db.exec(`PREPARE ${name} AS ${sql}`);
  try {
    const res = await db.query<Record<string, unknown>>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) EXECUTE ${name}${args ? `(${args})` : ''}`,
    );
    const plan = (res.rows[0]['QUERY PLAN'] as PlanNode[])[0].Plan as PlanNode;
    const acc = { touched: 0, filtered: 0, joinFiltered: 0, nodes: [] as string[] };
    walk(plan, acc);
    return {
      blocks:
        ((plan['Shared Hit Blocks'] as number) ?? 0) +
        ((plan['Shared Read Blocks'] as number) ?? 0),
      rowsTouched: acc.touched,
      rowsFiltered: acc.filtered,
      rowsJoinFiltered: acc.joinFiltered,
      tempBlocks: (plan['Temp Written Blocks'] as number) ?? 0,
      nodes: acc.nodes.join(' -> '),
    };
  } finally {
    await db.exec(`DEALLOCATE ${name}`);
    await db.exec(`SET plan_cache_mode = auto`);
  }
};

/**
 * Renders the PRODUCTION tagged template through the real `Prisma.sql` (so nested
 * `Prisma.Sql` / `Prisma.join` fragments and their `$n` numbering are Prisma's own),
 * EXPLAINs it, then executes it for real so the caller still gets its rows.
 */
const makeExplainingTx = (db: PGlite, measured: Measured[]): Prisma.TransactionClient => {
  const adapter = {
    $queryRaw: async <T>(
      strings: TemplateStringsArray,
      ...values: Array<Prisma.Sql | Prisma.Sql['values'][number]>
    ): Promise<T> => {
      const query = Prisma.sql(strings, ...values);
      measured.push(await explainGeneric(db, query.text, query.values));
      return (await db.query(query.text, query.values)).rows as T;
    },
    // prefetch only reaches this for a GLOBAL_CONFIG:tasks pair, which these probes
    // never request. Present so a future probe fails loudly instead of silently.
    operation: {
      findFirst: async (): Promise<null> => {
        throw new Error('unexpected legacy-misc findFirst in a plan probe');
      },
    },
  };
  return adapter as unknown as Prisma.TransactionClient;
};

const incomingOp = (): Operation =>
  ({
    id: 'op-incoming',
    clientId: 'uploader',
    actionType: '[Task] Update',
    opType: 'UPD',
    entityType: 'TASK',
    vectorClock: { uploader: 1 },
    timestamp: 1,
    schemaVersion: 1,
  }) as unknown as Operation;

/** The pathological input: a full batch that matches nothing (all-new entities). */
const brandNewIds = (): string[] =>
  Array.from({ length: PROBE_SIZE }, (_, i) => `task-brand-new-${i}`);

/**
 * The OTHER pathological input, and the one a width-2 seed cannot express: repeated bulk
 * ops over the SAME wide id set. `planTasksForToday`, `updateTasks`, `moveToArchive` and
 * the board/planner reorders all emit the full id list (`task-shared.actions.ts`), and
 * `detectConflictForEntities` probes the incoming op's OWN ids — so probe and stored
 * `entity_ids` overlap MAXIMALLY here, by construction. That overlap is the multiplier in
 * any array-branch fan-out, so this is where such a regression shows up and nowhere else.
 */
const WIDE_OPS = 20;
/**
 * Deliberately WIDER than PROBE_SIZE, so the two cost models separate numerically and a
 * fan-out cannot hide inside the fan-out-free ceiling: without fan-out the array branch
 * handles |probe| x WIDE_OPS candidate rows regardless of how wide the stored arrays
 * are; with it, every candidate is re-expanded by WIDE_WIDTH.
 */
const WIDE_WIDTH = 300;
const wideIds = (): string[] =>
  Array.from({ length: WIDE_WIDTH }, (_, i) => `wide-task-${i}`);
/** Probe a strict subset, as a client re-uploading part of a bulk selection would. */
const wideProbeIds = (): string[] => wideIds().slice(0, PROBE_SIZE);

const seed = async (db: PGlite, fastupdate: 'on' | 'off'): Promise<void> => {
  await db.exec(CREATE_TABLE);
  // BEFORE the rows, as in production: rows arrive one op at a time against a
  // pre-existing index, which is what puts entries in the GIN pending list.
  await db.exec(createIndexes(fastupdate));

  let rows: string[] = [];
  const flush = async (): Promise<void> => {
    if (rows.length === 0) return;
    await db.exec(`INSERT INTO operations (${INSERT_COLS}) VALUES ${rows.join(',')}`);
    rows = [];
  };
  const entityTypeFor = (n: number): string => ENTITY_TYPES[n % ENTITY_TYPES.length];
  // Every 10th op is multi-entity, mirroring that batch ops are a real but minority
  // shape in production (typical entity_ids length is 2, not the 1000 the wire cap
  // allows). Without any, the fix's array branch would never be exercised.
  const entityIdsFor = (n: number, id: string): string =>
    n % 10 === 0 ? `'{"${id}","co-${n}"}'` : `'{}'`;

  for (let seq = 1; seq <= OWN_OPS; seq++) {
    rows.push(
      `('op-${seq}', ${USER_ID}, 'seed-client', ${seq}, '[Task] Update',` +
        ` '${entityTypeFor(seq)}', 'task-${seq}', ${entityIdsFor(seq, `task-${seq}`)},` +
        ` 1, '{"seed-client":${seq}}')`,
    );
    if (rows.length === 1000) await flush();
  }
  // A second population of comparable size spread over ~20k OTHER users, so the
  // per-user btree slice is a small fraction of the table the GIN estimate sees.
  for (let i = 1; i <= OTHER_OPS; i++) {
    rows.push(
      `('other-${i}', ${1000 + i}, 'seed-other', ${i}, '[Task] Update',` +
        ` '${entityTypeFor(i)}', 'otask-${i}', ${entityIdsFor(i, `otask-${i}`)},` +
        ` 1, '{"seed-other":${i}}')`,
    );
    if (rows.length === 1000) await flush();
  }
  await flush();

  // The wide-array population (see wideIds): WIDE_OPS ops all carrying the SAME
  // WIDE_WIDTH ids, as a repeated bulk action produces.
  const wide = wideIds()
    .map((id) => `"${id}"`)
    .join(',');
  for (let k = 1; k <= WIDE_OPS; k++) {
    rows.push(
      `('op-wide-${k}', ${USER_ID}, 'seed-client', ${OWN_OPS + k}, '[Task] Update',` +
        ` 'TASK', 'wide-task-0', '{${wide}}', 1, '{"seed-client":${OWN_OPS + k}}')`,
    );
  }
  await flush();

  // ANALYZE so the planner works from real statistics. Deliberately NOT VACUUM: that
  // would flush the GIN pending list and measure the freshly-vacuumed best case.
  await db.exec('ANALYZE operations');
};

const GIN_INDEX = 'operations_entity_ids_gin';
const BTREE_INDEX = 'operations_user_id_entity_type_entity_id_server_seq_idx';

/**
 * NO BLOCK BUDGET HERE, unlike the sibling spec — tried and rejected on evidence. On the
 * all-new probe the fix reads 600 blocks against the OR form's 810 (detect) and 438
 * (prefetch): the regression reads FEWER blocks than the fix in one of the two cases, so
 * no threshold can separate them, and any budget wide enough not to flake would pass the
 * very mis-plan this file exists to catch. (The sibling's budget works because its
 * regression is 816 against a fixed 143.) `Measured.blocks` is therefore reported for
 * debugging and deliberately never asserted.
 *
 * Discarded-row counts carry the signal instead. They are the regressions' actual
 * signatures — "read history and threw it away" for the OR form, "expanded every
 * candidate and threw it away" for the fan-out — and unlike blocks they are scale-free.
 * The index-name assertions pin the same property structurally: the OR mis-plan is
 * precisely the one that rides NEITHER index usefully.
 *
 * `maxJoinFiltered` is 0 for every query with no join left to mis-plan. The one exception
 * is prefetchLatestEntityOpsForBatch, whose array branch must still confirm a by-id GIN
 * match against the requested (entity_type, entity_id) PAIR. Under `force_generic_plan`
 * Postgres cannot see the parameter values and plans that semi-join as a nested loop, so
 * it compares |cand| x |touched| — bounded by the batch size and INDEPENDENT of how wide
 * the stored arrays are, which is exactly what separates it from a fan-out.
 */
const expectBounded = (measured: Measured, maxRowsTouched: number): void => {
  expect(measured.rowsTouched).toBeLessThanOrEqual(maxRowsTouched);
  expect(measured.tempBlocks).toBe(0);
  expect(measured.nodes).not.toContain('Seq Scan');
  expect(measured.nodes).toContain(GIN_INDEX);
  expect(measured.nodes).toContain(BTREE_INDEX);
};

/**
 * Row-touch ceilings, each ~2x the measured value so a planner shift does not flake
 * while any fan-out still fails by orders of magnitude.
 *
 * All-new probe: nothing matches, so both queries only pay the per-probe index seeks.
 * Wide probe: |cand| is |probe| x WIDE_OPS = 2000 and the branches feed DISTINCT ON, so
 * ~12.5k rows move. The round-1 fan-out re-expanded each candidate by WIDE_WIDTH and
 * touched 2.2M on PG 16.14 / 21M on PGlite — 177x and 1700x over these ceilings.
 */
const MAX_ROWS_TOUCHED_ALL_NEW = 3_000;
const MAX_ROWS_TOUCHED_WIDE = 30_000;
/**
 * Prefetch's wide case is higher (measured 115_505) because its array branch must
 * re-check each candidate against the requested (entity_type, entity_id) PAIR, and under
 * `force_generic_plan` PGlite runs that semi-join as a nested loop over `touched`:
 * |cand| x |touched| on top of the rows the branches actually produce. PG 16.14 plans it
 * as a hash join and pays none of this, so the ceiling is sized for the pessimistic
 * planner. Still ~400x below the round-1 fan-out on the same seed.
 */
const MAX_ROWS_TOUCHED_WIDE_PAIRS = 250_000;

describe('batch conflict detection does not scan the history (PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    await seed(db, 'off');
  }, 180_000);

  afterAll(async () => {
    await db.close();
  });

  it('detectConflictForEntities reads a bounded amount for an all-new batch (#9503)', async () => {
    const measured: Measured[] = [];
    const result = await detectConflictForEntities(
      USER_ID,
      incomingOp(),
      brandNewIds(),
      makeExplainingTx(db, measured),
    );

    expect(result.hasConflict).toBe(false);
    expect(measured).toHaveLength(1);
    expectBounded(measured[0], MAX_ROWS_TOUCHED_ALL_NEW);
  });

  it('detectConflictForEntities does not fan out on wide entity_ids (#9503)', async () => {
    // REGRESSION GUARD. The first fix for #9503 tagged nothing onto the array-branch
    // candidates and re-derived the matched id with `unnest(entity_ids) JOIN probe`.
    // Because `cand` already holds one copy of an op per matching probe id, that emitted
    // |probe n entity_ids| squared rows per op: on this seed 59.8M join-filtered rows
    // (= |cand| 2000 x WIDE_WIDTH x PROBE_SIZE, less the 200k that match) / 2211 temp
    // blocks / ~23s, against zero and ~8ms for the shipped form. It passed the all-new
    // test above untouched, because a batch that matches NOTHING has no fan-out to
    // multiply — which is exactly why this seed needs a wide, MATCHING population.
    const measured: Measured[] = [];
    const result = await detectConflictForEntities(
      USER_ID,
      incomingOp(),
      wideProbeIds(),
      makeExplainingTx(db, measured),
    );

    expect(result.hasConflict).toBe(true);
    expect(measured).toHaveLength(1);
    expectBounded(measured[0], MAX_ROWS_TOUCHED_WIDE);
  });

  it('prefetchLatestEntityOpsForBatch reads a bounded amount for an all-new batch (#9503)', async () => {
    const measured: Measured[] = [];
    const pairs = brandNewIds().map((entityId) => ({ entityType: 'TASK', entityId }));

    const latest = await prefetchLatestEntityOpsForBatch(
      USER_ID,
      pairs,
      makeExplainingTx(db, measured),
    );

    expect(latest.size).toBe(0);
    expect(measured).toHaveLength(1);
    expectBounded(measured[0], MAX_ROWS_TOUCHED_ALL_NEW);
  });

  it('prefetchLatestEntityOpsForBatch does not fan out on wide entity_ids (#9503)', async () => {
    // Same guard for the sibling shape, which fanned out harder still (it re-joined
    // `touched` on two columns): 36.8s at the 1000-id wire cap before the fix.
    const measured: Measured[] = [];
    const latest = await prefetchLatestEntityOpsForBatch(
      USER_ID,
      wideProbeIds().map((entityId) => ({ entityType: 'TASK', entityId })),
      makeExplainingTx(db, measured),
    );

    expect(latest.size).toBe(PROBE_SIZE);
    expect(measured).toHaveLength(1);
    expectBounded(measured[0], MAX_ROWS_TOUCHED_WIDE_PAIRS);
  });

  it('still finds the latest op per entity for a batch that DOES match', async () => {
    const measured: Measured[] = [];
    // seq % 8 === 0 puts the op on the TASK slice and seq % 10 === 0 makes it
    // multi-entity, so multiples of 40 are both and carry a 'co-<seq>' array member.
    const taskSeqs = [40, 80, 120, 160];
    const ids = taskSeqs.map((seq) => `task-${seq}`);

    const latest = await prefetchLatestEntityOpsForBatch(
      USER_ID,
      ids.map((entityId) => ({ entityType: 'TASK', entityId })),
      makeExplainingTx(db, measured),
    );

    for (const seq of taskSeqs) {
      expect(latest.get(getEntityConflictKey('TASK', `task-${seq}`))?.serverSeq).toBe(
        seq,
      );
    }
    // 'co-N' is only ever a NON-first member of a multi-entity op's array, so this
    // pins that the array branch is really consulted, not just the scalar one.
    const viaArray = await prefetchLatestEntityOpsForBatch(
      USER_ID,
      [{ entityType: 'TASK', entityId: 'co-40' }],
      makeExplainingTx(db, measured),
    );
    expect(viaArray.get(getEntityConflictKey('TASK', 'co-40'))?.serverSeq).toBe(40);
  });

  it('CANARY: the shipped OR form still reproduces the mis-plan on this seed', async () => {
    // If this stops discarding the slice, the seed no longer models the incident and
    // the assertions above prove nothing — fix the seed, not this test.
    const ids = brandNewIds();
    const regressed = await explainGeneric(
      db,
      `SELECT DISTINCT ON (eid)
         eid AS "entityId", o.client_id, o.action_type, o.vector_clock
       FROM operations o
       CROSS JOIN LATERAL unnest(
         o.entity_ids || CASE WHEN o.entity_id IS NULL THEN '{}'::text[] ELSE ARRAY[o.entity_id] END
       ) AS eid
       WHERE o.user_id = $1 AND o.entity_type = $2
         AND (o.entity_ids && $3::text[] OR o.entity_id = ANY($3::text[]))
         AND eid = ANY($3::text[])
       ORDER BY eid, o.server_seq DESC`,
      [USER_ID, 'TASK', ids],
    );

    // The whole probed (user_id, 'TASK') slice, read and discarded. A lower bound, not
    // an equality: the exact count is a planner artefact that a PGlite bump can shift,
    // while "it still reads the slice" is the property this canary exists to assert.
    expect(regressed.rowsFiltered).toBeGreaterThanOrEqual(OWN_OPS / ENTITY_TYPES.length);
    // ...and the structural cause: the OR makes the GIN unusable, so the plan rides
    // only the btree and uses it as a filter rather than a seek.
    expect(regressed.nodes).not.toContain(GIN_INDEX);
    expect(regressed.nodes).toContain(BTREE_INDEX);
  });
});

/**
 * The array branch must ride the GIN even when the pending list is DIRTY.
 *
 * `fastupdate = off` is set by raw migration 20260720000000 and CANNOT be expressed in
 * schema.prisma, so every `prisma db push` database — CI, the E2E stack, the documented
 * manual setup — has it ON. Measured on this seed: a single 100-key `entity_ids && $arr`
 * probe costs enough under a dirty pending list that the planner abandons the GIN for a
 * SEQ SCAN of the whole table (40000 rows discarded) — at production's 6.97M rows that
 * is far worse than the slice scan being fixed. Probing per id with a 1-key `@>` keeps
 * the GIN chosen in BOTH states; it costs ~100 extra blocks when the reloption is right,
 * and it is the same shape detectConflictForEntity already ships.
 *
 * So this is not a micro-optimisation: it is why the array branch is written as a
 * per-id lateral rather than one `&&`. Do not "simplify" it back.
 */
describe('batch conflict array branch survives a dirty GIN pending list (PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    await seed(db, 'on');
  }, 180_000);

  afterAll(async () => {
    await db.close();
  });

  it('does not fall back to a Seq Scan with fastupdate=on', async () => {
    const measured: Measured[] = [];
    await detectConflictForEntities(
      USER_ID,
      incomingOp(),
      brandNewIds(),
      makeExplainingTx(db, measured),
    );

    expect(measured[0].rowsFiltered).toBe(0);
    expect(measured[0].rowsJoinFiltered).toBe(0);
    expect(measured[0].nodes).not.toContain('Seq Scan');
    expect(measured[0].nodes).toContain('operations_entity_ids_gin');
  });
});
