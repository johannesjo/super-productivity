import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import {
  detectConflictForEntities,
  getEntityConflictKey,
  prefetchLatestEntityOpsForBatch,
} from '../src/sync/conflict';
import { explainGeneric, type Measured } from './explain-plan.helper';
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
 * (2026-08, one-off manual checks against postgres:16-alpine, NOT re-run by this file):
 * PG 16.14 plans the array-branch join as a HASH join where PGlite uses a nested loop,
 * so `Rows Removed by Join Filter` reads 0 there for a plan that is still 80x too
 * expensive. That is exactly why `rowsTouched` is the primary assertion — see
 * explain-plan.helper.ts. The two versions also disagree on plan SHAPE under a dirty
 * pending list (PG 16.14 stays on the GIN where PG18 seq-scans), which is why the last
 * describe asserts cost and not nodes. Blocks are unmodellable here in the other
 * direction too: PGlite reports every block as a cache hit, so these counts cannot stand
 * in for production's cold-cache I/O. The plan shape mostly transfers; the absolute
 * numbers below do not.
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
 * all-new probe the fix reads 501 blocks against the OR form's 810 (detect) and 438
 * (prefetch): the regression reads FEWER blocks than the fix in one of the two cases, so
 * no threshold can separate them, and any budget wide enough not to flake would pass the
 * very mis-plan this file exists to catch. (The sibling's budget works because its
 * regression is 816 against a fixed 143.) `Measured.blocks` is therefore reported for
 * debugging and asserted only in the dirty-pending-list describe, where it is a RATIO
 * between two probe sizes rather than an absolute.
 *
 * `rowsTouched` carries the signal instead: it is scale-free, planner-independent, and
 * it is the fan-out's actual signature — "expanded every candidate and threw it away".
 * The index-name assertions pin the OTHER regression structurally: the OR mis-plan is
 * precisely the one that rides NEITHER index usefully, so requiring both here fails it
 * even if a future seed stops blowing the row ceiling. Those node assertions hold under
 * production's `fastupdate = off`; do NOT copy them into the dirty describe, where the
 * cheapest plan is a seq scan.
 */
const expectBounded = (measured: Measured, maxRowsTouched: number): void => {
  expect(measured.rowsTouched).toBeLessThanOrEqual(maxRowsTouched);
  expect(measured.tempBlocks).toBe(0);
  expect(measured.nodes).not.toContain('Seq Scan');
  expect(measured.nodes).toContain(GIN_INDEX);
  expect(measured.nodes).toContain(BTREE_INDEX);
};

/**
 * Row-touch ceilings. They are deliberately LOOSE — the point is to fail a fan-out by
 * orders of magnitude, not to pin a number a planner change can move.
 *
 * All-new probe: nothing matches, so both queries only pay the index seeks. Measured 401.
 * Wide probe: |cand| is |probe| x WIDE_OPS = 2000 and the branches feed DISTINCT ON.
 * Measured 11_047 (detect) and 13_347 (prefetch). The round-1 fan-out re-expanded each
 * candidate by WIDE_WIDTH and touched 2.2M on PG 16.14 / 21M on PGlite, so it fails
 * these by ~75x and ~700x.
 */
const MAX_ROWS_TOUCHED_ALL_NEW = 3_000;
const MAX_ROWS_TOUCHED_WIDE = 30_000;
/**
 * Prefetch keeps its own, much looser ceiling because its array branch must re-check
 * each candidate against the requested (entity_type, entity_id) PAIR, and the cost of
 * that semi-join is PLANNER-DEPENDENT by an order of magnitude: a hash semi-join (what
 * both PGlite and PG 16.14 currently choose) touches the 13_347 above, while a nested
 * loop over `touched` — which PGlite chose for the pre-`&&` shape of this same query —
 * costs |cand| x |touched| and touched 115_505. The ceiling sits above the pessimistic
 * plan on purpose, so a planner shift is not a red build. Still ~180x below the round-1
 * fan-out on this seed, which is the regression it exists to catch.
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
 * The array branch must stay CHEAP when the GIN pending list is DIRTY — and the shape
 * that achieves that is ONE `&&` probe, not one `@>` per requested id.
 *
 * `fastupdate = off` is set by raw migration 20260720000000 and CANNOT be expressed in
 * schema.prisma, so every `prisma db push` database — CI, the E2E stack, the documented
 * manual setup in README.md — has it ON. Every GIN scan then reads the whole pending
 * list, so N per-id probes read it N times where one `&&` reads it once: the per-id
 * form's I/O is LINEAR IN THE BATCH SIZE. Measured, per statement:
 *
 *              PGlite, this seed        PG 16.14, 1.5M rows, 471 pending pages
 *   form       time / blocks            time / blocks
 *   `@>`x100   175 ms / 19,600           261 ms / 47,800
 *   `&&`        26 ms /    981           170 ms /  1,072
 *
 * Both callers chunk at CONFLICT_DETECTION_ENTITY_BATCH_SIZE, so an op at the 1000-id
 * wire cap issues ten of these in one upload transaction: 2.5 s of `@>` against 1.6 s of
 * `&&` on PG 16.14. Multi-second statements inside the upload transaction are #9503's
 * own failure mode, so this describe is not a micro-optimisation guard — it is the one
 * that stops the fix re-creating the incident on every db-push deployment.
 *
 * ON THE PLAN SHAPE: under a dirty pending list PGlite/PG18 abandons the GIN for a SEQ
 * SCAN here. That is FINE and this file deliberately does NOT forbid it — the seq scan
 * is 6.8x faster and reads 20x fewer blocks than the GIN plan the per-id form gets. A
 * previous revision asserted `not.toContain('Seq Scan')` and so pinned the WORSE outcome
 * as if it were the requirement, which is how the per-id form got shipped. Assert cost,
 * never plan shape, in this state.
 */
describe('batch conflict array branch survives a dirty GIN pending list (PGlite)', () => {
  let db: PGlite;
  /** A FULL-batch probe and a tenth-size one, both against the dirty pending list. */
  let dirty: Measured;
  let dirtySmall: Measured;
  /** The full-batch probe again, after VACUUM flushes the pending list. */
  let flushed: Measured;

  // Measured in beforeAll rather than per-test because the VACUUM below DESTROYS the
  // state the other assertions need, and an ordering dependency between `it`s is exactly
  // the kind of thing that silently stops holding.
  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    await seed(db, 'on');

    const probe = async (ids: string[]): Promise<Measured> => {
      const runs: Measured[] = [];
      await detectConflictForEntities(
        USER_ID,
        incomingOp(),
        ids,
        makeExplainingTx(db, runs),
      );
      expect(runs).toHaveLength(1);
      return runs[0];
    };

    dirtySmall = await probe(brandNewIds().slice(0, PROBE_SIZE / 10));
    dirty = await probe(brandNewIds());

    // PGlite ships no pgstattuple, so `pending_pages` cannot be read directly. VACUUM
    // flushes the pending list into the main GIN entry tree, so re-measuring the SAME
    // probe afterwards prices the same query against a clean index — the difference IS
    // the pending list.
    await db.exec('VACUUM operations');
    flushed = await probe(brandNewIds());
  }, 180_000);

  afterAll(async () => {
    await db.close();
  });

  /**
   * CANARY. Without this the describe can pass while measuring a CLEAN index — which is
   * what a reviewer suspected was already happening, on the grounds that a bulk load
   * flushes past `gin_pending_list_limit`. It does not flush ALL of it: the tail stays
   * pending (confirmed directly on PG 16.14 via pgstatginindex — 58 pages / 4,544 tuples
   * after the same bulk load), and that tail is what the reloption exposes.
   */
  it('CANARY: the fastupdate=on seed really does leave a dirty pending list', () => {
    expect(dirty.blocks).toBeGreaterThan(flushed.blocks * 2);
  });

  it('does not re-read the pending list once per probed id', () => {
    // THE property, stated scale-free: one `&&` reads the pending list once however many
    // ids are asked for, so a 10x bigger batch must NOT cost 10x the blocks. Measured
    // 1065 blocks at 100 ids against 1010 at 10 — essentially flat. The per-id form is
    // 19,600 at 100 ids and scales linearly, so it fails this by ~10x however the seed
    // is resized. An absolute budget could not do this: it would have to be re-derived
    // for every seed change, and the numbers above are PGlite's, not production's.
    //
    // Blocks, not time: this is an I/O regression, and PGlite reports every block as a
    // cache hit, so wall time understates it exactly where production would feel it most.
    expect(dirty.blocks).toBeLessThan(dirtySmall.blocks * 3);
    // Deliberately NOT rowsFiltered === 0, which the other describe does assert: the
    // seq-scan plan PG18 picks here reads and filters all 40,020 rows by construction,
    // so that assertion would once again be pinning a plan shape rather than a cost.
    // rowsTouched counts rows EMITTED, so it still fails any fan-out regression.
    expect(dirty.rowsTouched).toBeLessThanOrEqual(MAX_ROWS_TOUCHED_ALL_NEW);
  });
});
