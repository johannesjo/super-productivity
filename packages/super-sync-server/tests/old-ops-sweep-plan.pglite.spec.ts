import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { explainGeneric } from './explain-plan.helper';

/**
 * What does the old-ops sweep's batch selection actually scan?
 *
 * #9692: the daily sweep died on `prisma.operation.findMany()` with PostgreSQL
 * 57014 (`statement_timeout`, 60 s at database level). The obvious reading is
 * that `take: limit` bounds the work — it does not. `take` bounds the rows
 * RETURNED; the scan walks the user's `server_seq` range heap-filtering
 * `received_at` and stops only when it has collected `limit` matches OR run out
 * of rows. So the cost is driven by MATCH DENSITY, not by `take`, and lowering
 * the batch size cannot help the sparse case at all.
 *
 * This spec measures both ends of that, because the answer decides the fix:
 *   - dense  — every row below the boundary is deletable. `LIMIT` bites.
 *   - sparse — the whole history is inside the 45-day retention window, so
 *     nothing is deletable. `LIMIT` never fills and the scan runs to the end of
 *     the user's slice.
 *
 * The sparse expectation below pins a DEFECT, not a desired property. It is here
 * so that a fix which bounds SCANNED rows (a `server_seq` window rather than a
 * row limit) has something to flip. If you are that fix: change this assertion
 * and say so in the commit.
 *
 * MEASURE WITH `force_generic_plan`, NEVER WITH LITERALS — the reasoning lives
 * with the harness in explain-plan.helper.ts. Prisma sends parameterised
 * prepared statements, and a generic plan cannot see the parameter values, which
 * is exactly what makes the planner unable to tell the two cases apart.
 *
 * FIDELITY LIMIT: PGlite is not the production cluster (different major version)
 * and reports every block as a cache hit, so block counts here cannot model the
 * ~9.5 ms cold random reads that turn a large scan into a 60 s statement. The
 * planner-independent signal is `rowsTouched` + `rowsFiltered`.
 */

const CREATE_TABLE = `
  CREATE TABLE operations (
    id                      text PRIMARY KEY,
    user_id                 integer NOT NULL,
    client_id               text NOT NULL,
    -- integer, NOT bigint: production maps serverSeq as Prisma Int.
    server_seq              integer NOT NULL,
    op_type                 text NOT NULL,
    -- bigint: production stores receivedAt as Prisma BigInt (epoch ms).
    received_at             bigint NOT NULL,
    repair_base_server_seq  integer
  );
`;

// A deliberate SUBSET of prisma/schema.prisma + the migrations: the two btrees
// this query can ride, plus the partial full-state index the boundary lookups
// use (present so the planner sees the same choice set, not because this
// statement can use it). Production also has (user_id, client_id), the
// entity btree and the entity_ids GIN; no predicate here can use them.
const CREATE_INDEXES = `
  CREATE UNIQUE INDEX operations_user_id_server_seq_key
    ON operations (user_id, server_seq);
  CREATE INDEX operations_user_id_received_at_idx
    ON operations (user_id, received_at);
  CREATE INDEX operations_user_id_full_state_server_seq_idx
    ON operations (user_id, server_seq)
    WHERE op_type IN ('SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR');
`;

/** The SQL Prisma emits for deleteOldSyncedOpsBatch's `doomedOps` findMany. */
const DOOMED_OPS_SQL = `
  SELECT "operations"."id"
  FROM "operations"
  WHERE ("operations"."user_id" = $1
     AND "operations"."server_seq" < $2
     AND "operations"."received_at" < $3)
  ORDER BY "operations"."server_seq" ASC
  LIMIT $4
`;

const OPS_PER_USER = 20_000;
const OTHER_USERS = 8;
const DENSE_USER = 1;
const SPARSE_USER = 2;
/** Production default, `OLD_OPS_CLEANUP_DELETE_BATCH_SIZE`. */
const BATCH_LIMIT = 5_000;
const NOW = 1_760_000_000_000;
const CUTOFF = NOW - 45 * 24 * 60 * 60 * 1000;

describe('old-ops sweep batch selection — what LIMIT actually bounds', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(CREATE_TABLE);
    await db.exec(CREATE_INDEXES);

    const insert = async (
      userId: number,
      count: number,
      receivedAt: (i: number) => number,
    ): Promise<void> => {
      const rows: string[] = [];
      for (let i = 1; i <= count; i++) {
        rows.push(
          `('op-${userId}-${i}',${userId},'c${userId}',${i},'CRT',${receivedAt(i)},NULL)`,
        );
        if (rows.length === 5_000) {
          await db.exec(
            `INSERT INTO operations (id,user_id,client_id,server_seq,op_type,` +
              `received_at,repair_base_server_seq) VALUES ${rows.join(',')}`,
          );
          rows.length = 0;
        }
      }
      if (rows.length) {
        await db.exec(
          `INSERT INTO operations (id,user_id,client_id,server_seq,op_type,` +
            `received_at,repair_base_server_seq) VALUES ${rows.join(',')}`,
        );
      }
    };

    // Dense: every op predates the retention cutoff, so every one is deletable.
    await insert(DENSE_USER, OPS_PER_USER, () => CUTOFF - 1_000);
    // Sparse: an active user whose whole history is inside retention. The sweep
    // still visits them — they have a snapshot and a causal boundary — and finds
    // nothing to delete.
    await insert(SPARSE_USER, OPS_PER_USER, () => CUTOFF + 1_000);
    // Other tenants, so the (user_id, ...) slices are not the whole table.
    for (let u = 3; u < 3 + OTHER_USERS; u++) {
      await insert(u, 2_000, (i) => CUTOFF - i);
    }
    await db.exec('ANALYZE operations');
  });

  afterAll(async () => {
    await db.close();
  });

  it('bounds the scan by LIMIT when every candidate row is deletable', async () => {
    const measured = await explainGeneric(db, DOOMED_OPS_SQL, [
      DENSE_USER,
      OPS_PER_USER + 1,
      CUTOFF,
      BATCH_LIMIT,
    ]);

    // Every row scanned is a match, so the scan stops at the limit.
    expect(measured.rowsTouched).toBeLessThanOrEqual(BATCH_LIMIT * 2);
    expect(measured.rowsFiltered).toBeLessThanOrEqual(BATCH_LIMIT);
  });

  it('DEFECT: does NOT bound the scan when nothing below the boundary is deletable', async () => {
    const measured = await explainGeneric(db, DOOMED_OPS_SQL, [
      SPARSE_USER,
      OPS_PER_USER + 1,
      CUTOFF,
      BATCH_LIMIT,
    ]);

    // Zero rows returned, yet the scan walked the user's entire slice: `take`
    // cannot stop a scan that never accumulates a match. This is why lowering
    // OLD_OPS_CLEANUP_DELETE_BATCH_SIZE is not a fix on its own, and why the
    // real bound has to be on the `server_seq` range that is scanned.
    expect(measured.rowsTouched).toBe(0);
    expect(measured.rowsFiltered).toBeGreaterThan(BATCH_LIMIT * 2);
  });
});
