#!/usr/bin/env tsx
/**
 * Read-only dry run of the daily old-ops sweep
 * (`StorageQuotaService.deleteOldSyncedOpsForAllUsers`).
 *
 * Mirrors the production deletion logic in set-based SQL and reports, without
 * writing anything, exactly what the next sweep would delete on THIS database:
 *   - per-user prune boundary (validated-causal marker, or causal fallback)
 *   - would-delete counts and the retained base + tail
 *   - safety checks that must come back clean before trusting the sweep
 *   - the cohorts the sweep deliberately skips (no causal base, no snapshot)
 *
 * Run on the server host (uses DATABASE_URL like the monitoring scripts):
 *   npm run dry-run-old-ops-sweep:dev
 * Large tables may need a longer statement budget:
 *   MONITOR_STATEMENT_TIMEOUT_MS=1800000 npm run dry-run-old-ops-sweep:dev
 *
 * Exits non-zero when a safety check fails — in that case do NOT trust the
 * sweep on this database before understanding why.
 */
import { Prisma } from '@prisma/client';
import { prisma, disconnectDb, reportMonitoringError } from './monitoring-db';
import { RETENTION_MS } from '../src/sync/sync.types';

const TOP_N = 25;
const DEFAULT_DAILY_BUDGET = 25_000;
const VERIFY_CHUNK = 1000;

// Must stay in lockstep with CAUSAL_FULL_STATE_OPERATION_WHERE
// (src/sync/sync.types.ts) — the predicate that authorizes deletion.
const causalFullStateSql = (alias: string): Prisma.Sql =>
  Prisma.raw(`(
    ${alias}.op_type IN ('SYNC_IMPORT', 'BACKUP_IMPORT')
    OR (${alias}.op_type = 'REPAIR' AND ${alias}.repair_base_server_seq IS NOT NULL)
  )`);

interface PerUserRow {
  user_id: number;
  last_snapshot_seq: number;
  protected_from_seq: number | null;
  used_fallback: boolean;
  would_delete: bigint;
  fresh_prefix: bigint;
  retained_from_boundary: bigint;
}

interface CohortRow {
  user_id: number;
  op_count: bigint;
}

const n = (v: bigint | number): number => Number(v);

/**
 * Independent re-verification: for each (userId, boundarySeq) pair, the
 * boundary must be a surviving causal full-state op. Deliberately NOT derived
 * from the main CTE — a translation bug there cannot hide here.
 */
const findBadBoundaries = async (
  pairs: { userId: number; seq: number }[],
): Promise<number[]> => {
  const bad: number[] = [];
  for (let i = 0; i < pairs.length; i += VERIFY_CHUNK) {
    const chunk = pairs.slice(i, i + VERIFY_CHUNK);
    const values = Prisma.join(
      chunk.map((p) => Prisma.sql`(${p.userId}::int, ${p.seq}::int)`),
    );
    const rows = await prisma.$queryRaw<{ user_id: number }[]>`
      SELECT b.user_id
      FROM (VALUES ${values}) AS b(user_id, seq)
      WHERE NOT EXISTS (
        SELECT 1 FROM operations o
        WHERE o.user_id = b.user_id
          AND o.server_seq = b.seq
          AND ${causalFullStateSql('o')}
      )
    `;
    bad.push(...rows.map((r) => r.user_id));
  }
  return bad;
};

const main = async (): Promise<void> => {
  const cutoff = BigInt(Date.now() - RETENTION_MS);

  // Per-user view of what the sweep would do. Boundary resolution mirrors
  // production: the latestFullStateSeq marker counts only when it is <=
  // lastSnapshotSeq AND its op row matches the causal predicate; otherwise
  // fall back to the newest causal full-state op <= lastSnapshotSeq.
  const perUser = await prisma.$queryRaw<PerUserRow[]>`
    WITH eligible AS (
      SELECT s.user_id, s.last_snapshot_seq, s.latest_full_state_seq
      FROM user_sync_state s
      WHERE s.last_snapshot_seq IS NOT NULL
        AND s.last_snapshot_seq > 0
        AND s.snapshot_at IS NOT NULL
    ),
    marked AS (
      SELECT
        e.user_id,
        e.last_snapshot_seq,
        CASE
          WHEN e.latest_full_state_seq IS NOT NULL
            AND e.latest_full_state_seq <= e.last_snapshot_seq
            AND EXISTS (
              SELECT 1 FROM operations o
              WHERE o.user_id = e.user_id
                AND o.server_seq = e.latest_full_state_seq
                AND ${causalFullStateSql('o')}
            )
          THEN e.latest_full_state_seq
        END AS marker_seq
      FROM eligible e
    ),
    resolved AS (
      SELECT
        m.user_id,
        m.last_snapshot_seq,
        m.marker_seq IS NULL AS used_fallback,
        COALESCE(
          m.marker_seq,
          (
            SELECT max(o.server_seq) FROM operations o
            WHERE o.user_id = m.user_id
              AND o.server_seq <= m.last_snapshot_seq
              AND ${causalFullStateSql('o')}
          )
        ) AS protected_from_seq
      FROM marked m
    )
    SELECT
      r.user_id,
      r.last_snapshot_seq,
      r.protected_from_seq,
      r.used_fallback,
      (
        SELECT count(*) FROM operations o
        WHERE o.user_id = r.user_id
          AND o.server_seq < r.protected_from_seq
          AND o.received_at < ${cutoff}
      ) AS would_delete,
      (
        SELECT count(*) FROM operations o
        WHERE o.user_id = r.user_id
          AND o.server_seq < r.protected_from_seq
          AND o.received_at >= ${cutoff}
      ) AS fresh_prefix,
      (
        SELECT count(*) FROM operations o
        WHERE o.user_id = r.user_id
          AND o.server_seq >= r.protected_from_seq
      ) AS retained_from_boundary
    FROM resolved r
  `;

  const withBoundary = perUser.filter(
    (r) => r.protected_from_seq !== null && r.protected_from_seq > 1,
  );
  const skippedNoBase = perUser.filter((r) => r.protected_from_seq === null);
  const staleMarkers = perUser.filter(
    (r) => r.used_fallback && r.protected_from_seq !== null,
  );
  const totalWouldDelete = withBoundary.reduce((sum, r) => sum + n(r.would_delete), 0);

  // Safety check 1: boundary must be a surviving causal full-state op —
  // re-verified independently for every user the sweep would actually touch.
  const affected = withBoundary.filter((r) => n(r.would_delete) > 0);
  const badBoundaryUsers = await findBadBoundaries(
    affected.map((r) => ({
      userId: r.user_id,
      // non-null: withBoundary filtered on it
      seq: r.protected_from_seq as number,
    })),
  );

  // Safety check 2: the boundary may never exceed lastSnapshotSeq, or pruning
  // would eat into the cached snapshot's replay tail (the restore path).
  const tailViolations = withBoundary.filter(
    (r) => (r.protected_from_seq as number) > r.last_snapshot_seq,
  );

  // Cohort: users the sweep never reaches because they hold no snapshot.
  const snapshotless = await prisma.$queryRaw<CohortRow[]>`
    SELECT o.user_id, count(*) AS op_count
    FROM operations o
    LEFT JOIN user_sync_state s ON s.user_id = o.user_id
    WHERE s.user_id IS NULL
       OR s.last_snapshot_seq IS NULL
       OR s.last_snapshot_seq <= 0
       OR s.snapshot_at IS NULL
    GROUP BY o.user_id
    ORDER BY count(*) DESC
  `;
  const snapshotlessOps = snapshotless.reduce((sum, r) => sum + n(r.op_count), 0);

  const [{ total_ops }] = await prisma.$queryRaw<[{ total_ops: bigint }]>`
    SELECT count(*) AS total_ops FROM operations
  `;

  console.log('=== Old-ops sweep dry run (read-only) ===');
  console.log(`cutoff: received_at < ${new Date(Number(cutoff)).toISOString()}`);
  console.log(`operations table total:        ${n(total_ops)}`);
  console.log(`eligible users (snapshot > 0): ${perUser.length}`);
  console.log(`  with a causal prune boundary: ${withBoundary.length}`);
  console.log(`  via stale-marker fallback:    ${staleMarkers.length}`);
  console.log(`  skipped (no causal base):     ${skippedNoBase.length}`);
  console.log(`total rows the sweep would delete: ${totalWouldDelete}`);
  console.log(
    `  ≈ ${Math.ceil(totalWouldDelete / DEFAULT_DAILY_BUDGET)} daily runs at the ` +
      `default ${DEFAULT_DAILY_BUDGET}/run budget (OLD_OPS_CLEANUP_MAX_DELETED_PER_RUN)`,
  );

  const top = [...affected]
    .sort((a, b) => n(b.would_delete) - n(a.would_delete))
    .slice(0, TOP_N)
    .map((r) => ({
      user_id: r.user_id,
      boundary_seq: r.protected_from_seq,
      would_delete: n(r.would_delete),
      fresh_prefix_kept: n(r.fresh_prefix),
      base_plus_tail_kept: n(r.retained_from_boundary),
      via: r.used_fallback ? 'fallback' : 'marker',
    }));
  console.log(`\nTop ${top.length} users by would-delete:`);
  console.table(top);

  if (skippedNoBase.length > 0) {
    console.log(
      `\nSkipped without causal base (histories left intact): ` +
        skippedNoBase
          .slice(0, TOP_N)
          .map((r) => r.user_id)
          .join(', ') +
        (skippedNoBase.length > TOP_N ? ', …' : ''),
    );
  }

  console.log(
    `\nUnswept snapshotless cohort: ${snapshotless.length} users holding ` +
      `${snapshotlessOps} ops (out of the sweep's scope entirely). Top ${TOP_N}:`,
  );
  console.table(
    snapshotless.slice(0, TOP_N).map((r) => ({
      user_id: r.user_id,
      op_count: n(r.op_count),
    })),
  );

  console.log('\n=== Safety checks ===');
  console.log(
    `boundary is a surviving causal full-state op: ` +
      (badBoundaryUsers.length === 0
        ? 'OK'
        : `VIOLATED for users ${badBoundaryUsers.join(', ')}`),
  );
  console.log(
    `boundary <= lastSnapshotSeq (cached-snapshot tail protected): ` +
      (tailViolations.length === 0
        ? 'OK'
        : `VIOLATED for users ${tailViolations.map((r) => r.user_id).join(', ')}`),
  );

  if (badBoundaryUsers.length + tailViolations.length > 0) {
    console.error(
      `\nSafety check(s) failed — do not trust the sweep on this database ` +
        `before understanding why.`,
    );
    process.exitCode = 1;
  } else {
    console.log('\nAll safety checks passed.');
  }
};

main()
  .catch((err) => {
    reportMonitoringError('Dry run failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
