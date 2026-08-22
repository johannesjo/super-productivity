#!/usr/bin/env tsx
/**
 * Read-only dry run of the daily old-ops sweep
 * (`StorageQuotaService.deleteOldSyncedOpsForAllUsers`).
 *
 * Mirrors the production deletion logic in set-based SQL and reports, without
 * writing anything, exactly what the next sweep would delete on THIS database:
 *   - per-user prune boundary: the newest CAUSAL full-state op in the
 *     operation stream (#9688 — no snapshot cursor required), capped at
 *     `lastSnapshotSeq` while a cached snapshot BLOB still exists
 *   - would-delete counts and the retained base + tail, with users whose
 *     prefix is not fully aged out skipped whole (as production does)
 *   - safety checks that must come back clean before trusting the sweep
 *   - the residual unreachable cohort (no causal boundary above seq 1),
 *     segmented by history shape × dormancy × plaintext-vs-encrypted so the
 *     remaining #9688 directions (checkpoint cadence, eradication-plan
 *     dormant deletion) can be sized
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
  op_count: bigint;
  last_received_at: bigint;
  last_snapshot_seq: number | null;
  has_snapshot_blob: boolean;
  any_causal_seq: number | null;
  has_legacy_repair: boolean;
  has_plaintext_rows: boolean;
  was_capped: boolean;
  protected_from_seq: number | null;
  would_delete: bigint;
  fresh_prefix: bigint;
  retained_from_boundary: bigint;
}

const n = (v: bigint | number): number => Number(v);

// This runs for minutes on a large table with no output otherwise; the phase
// timings are the operator's only signal that the gate is progressing.
const startedAt = Date.now();
const logPhase = (msg: string): void => {
  const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[${elapsedS}s] ${msg}`);
};

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

/** Residual-cohort bucket for a user the sweep cannot reach. */
const residualCategory = (r: PerUserRow): string => {
  if (r.was_capped) {
    return 'snapshot-capped (cached blob blocks newer boundary)';
  }
  if (r.any_causal_seq === null) {
    return r.has_legacy_repair ? 'legacy-REPAIR-only' : 'no full-state op at all';
  }
  return 'initial import at seq 1 only';
};

const main = async (): Promise<void> => {
  const cutoff = BigInt(Date.now() - RETENTION_MS);

  // Per-user view of what the sweep would do. Boundary resolution mirrors
  // production (storage-quota.service.ts): the newest causal full-state op
  // with server_seq > 1 authorizes pruning; while a cached snapshot blob
  // exists the boundary may not pass `last_snapshot_seq` and drops to the
  // newest causal full-state op at or below that cursor. The
  // `latest_full_state_seq` marker is not consulted (stale for ~90% of
  // users, no backfill in #8973).
  logPhase('computing per-user prune boundaries and would-delete counts…');
  const perUser = await prisma.$queryRaw<PerUserRow[]>`
    WITH per_user AS (
      SELECT
        o.user_id,
        count(*) AS op_count,
        max(o.received_at) AS last_received_at,
        max(o.server_seq) FILTER (
          WHERE o.server_seq > 1 AND ${causalFullStateSql('o')}
        ) AS causal_boundary_seq,
        max(o.server_seq) FILTER (WHERE ${causalFullStateSql('o')}) AS any_causal_seq,
        bool_or(o.op_type = 'REPAIR' AND o.repair_base_server_seq IS NULL)
          AS has_legacy_repair,
        bool_or(o.is_payload_encrypted IS NOT TRUE) AS has_plaintext_rows
      FROM operations o
      GROUP BY o.user_id
    ),
    joined AS (
      -- snapshot_data IS NOT NULL reads the null bitmap only, so the blob is
      -- never detoasted here.
      SELECT p.*, s.last_snapshot_seq, s.snapshot_data IS NOT NULL AS has_snapshot_blob
      FROM per_user p
      LEFT JOIN user_sync_state s ON s.user_id = p.user_id
    ),
    capped AS (
      -- Keyed on the cached BLOB, not the cursor — same reason production is
      -- (storage-quota.service.ts): a cursor left behind by the E2EE
      -- eradication sweep must not keep capping a user forever.
      SELECT
        j.*,
        -- last_snapshot_seq > 0 mirrors production's snapshotCap > 0 check
        -- (storage-quota.service.ts). Without it a blob row with a 0 cursor
        -- reads as capped-and-unreachable here while the sweep would prune
        -- it — a gate must never under-report a real deletion.
        COALESCE(
          j.has_snapshot_blob
            AND j.last_snapshot_seq > 0
            AND j.causal_boundary_seq > j.last_snapshot_seq,
          false
        ) AS was_capped
      FROM joined j
    ),
    -- MATERIALIZED is already the default here (two CTE references below), so
    -- this only pins it: an edit that leaves a single reference must not let
    -- Postgres inline the correlated cap aggregate and re-run it per row.
    resolved AS MATERIALIZED (
      SELECT
        c.*,
        CASE WHEN c.was_capped THEN (
          SELECT max(o.server_seq) FROM operations o
          WHERE o.user_id = c.user_id
            AND o.server_seq <= c.last_snapshot_seq
            AND ${causalFullStateSql('o')}
        ) ELSE c.causal_boundary_seq END AS protected_from_seq
      FROM capped c
    ),
    -- Only the prefix ranges are joined, so retained_from_boundary can be
    -- derived from op_count and the largest of the three ranges is never
    -- scanned. Note this does NOT pin a plan: Postgres may still execute the
    -- join as a per-user nested loop. If the gate is slow on a large table,
    -- EXPLAIN it rather than trusting the shape.
    counts AS (
      SELECT
        r.user_id,
        count(*) FILTER (WHERE o.received_at < ${cutoff}) AS would_delete,
        count(*) FILTER (WHERE o.received_at >= ${cutoff}) AS fresh_prefix
      FROM operations o
      JOIN resolved r
        ON r.user_id = o.user_id
        AND r.protected_from_seq > 1
        AND o.server_seq < r.protected_from_seq
      GROUP BY r.user_id
    )
    SELECT
      r.user_id,
      r.op_count,
      r.last_received_at,
      r.last_snapshot_seq,
      r.has_snapshot_blob,
      r.any_causal_seq,
      r.has_legacy_repair,
      r.has_plaintext_rows,
      r.was_capped,
      r.protected_from_seq,
      -- No CASE needed: the counts join filters protected_from_seq > 1, so a
      -- non-prunable user has no row there and COALESCE already yields 0.
      COALESCE(ct.would_delete, 0) AS would_delete,
      COALESCE(ct.fresh_prefix, 0) AS fresh_prefix,
      -- This one DOES need the CASE — op_count - 0 - 0 is op_count, not 0.
      CASE WHEN r.protected_from_seq > 1
        THEN r.op_count - COALESCE(ct.would_delete, 0) - COALESCE(ct.fresh_prefix, 0)
        ELSE 0 END AS retained_from_boundary
    FROM resolved r
    LEFT JOIN counts ct ON ct.user_id = r.user_id
  `;
  logPhase(`boundaries + counts done (${perUser.length} users with operations)`);

  const prunable = perUser.filter(
    (r) => r.protected_from_seq !== null && r.protected_from_seq > 1,
  );
  const residual = perUser.filter(
    (r) => r.protected_from_seq === null || r.protected_from_seq <= 1,
  );
  // A prefix is pruned whole or not at all — see
  // StorageQuotaService.deleteOldSyncedOpsForAllUsers for why. Mirror that
  // skip here or the gate over-reports what the sweep would delete.
  const affected = prunable.filter(
    (r) => n(r.fresh_prefix) === 0 && n(r.would_delete) > 0,
  );
  const totalWouldDelete = affected.reduce((sum, r) => sum + n(r.would_delete), 0);

  // Safety check 1: boundary must be a surviving causal full-state op —
  // re-verified independently for every user the sweep would actually touch.
  logPhase(`re-verifying ${affected.length} boundaries against the table…`);
  const badBoundaryUsers = await findBadBoundaries(
    affected.map((r) => ({
      userId: r.user_id,
      // non-null: prunable filtered on it
      seq: r.protected_from_seq as number,
    })),
  );

  // Safety check 2: while a cached snapshot blob exists, the boundary may
  // never exceed its cursor — pruning above it would eat into the cached
  // snapshot's replay tail (the restore path). Re-read from user_sync_state
  // rather than from the CTE columns: derived from `was_capped`, which is
  // this same comparison, the check is a tautology that always prints OK.
  const blobCursors = await prisma.$queryRaw<
    { user_id: number; last_snapshot_seq: number }[]
  >`
    SELECT user_id, last_snapshot_seq
    FROM user_sync_state
    WHERE snapshot_data IS NOT NULL AND last_snapshot_seq > 0
  `;
  const cursorByUserId = new Map(
    blobCursors.map((r) => [r.user_id, r.last_snapshot_seq]),
  );
  const tailViolations = affected.filter((r) => {
    const cursor = cursorByUserId.get(r.user_id);
    return cursor !== undefined && (r.protected_from_seq as number) > cursor;
  });

  console.log('=== Old-ops sweep dry run (read-only) ===');
  console.log(`cutoff: received_at < ${new Date(Number(cutoff)).toISOString()}`);
  const totalOps = perUser.reduce((sum, r) => sum + n(r.op_count), 0);
  console.log(`operations table total:            ${totalOps}`);
  console.log(`users holding operations:          ${perUser.length}`);
  console.log(`  with a causal prune boundary:     ${prunable.length}`);
  console.log(
    `    boundary capped by snapshot:    ${prunable.filter((r) => r.was_capped).length}`,
  );
  console.log(
    `    skipped, prefix not fully aged:  ` +
      `${prunable.filter((r) => n(r.fresh_prefix) > 0).length}`,
  );
  console.log(`  unreachable (no usable boundary): ${residual.length}`);
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
      base_plus_tail_kept: n(r.retained_from_boundary),
      capped: r.was_capped,
    }));
  console.log(`\nTop ${top.length} users by would-delete:`);
  console.table(top);

  // Residual cohort segmentation (#9688): category × dormancy × encryption.
  // Dormant = no op received within the retention window (device rows for
  // these users were already pruned by deleteStaleDevices, so max received_at
  // is the only remaining activity signal). Plaintext-holding accounts are
  // the e2ee-legacy-data-eradication-plan's deletion candidates; encrypted-
  // only active accounts are the checkpoint-cadence (direction 2) audience.
  const segments = new Map<string, { users: number; ops: number }>();
  for (const r of residual) {
    const key = [
      residualCategory(r),
      r.last_received_at < cutoff ? 'dormant' : 'active',
      r.has_plaintext_rows ? 'holds plaintext' : 'encrypted-only',
    ].join(' | ');
    const seg = segments.get(key) ?? { users: 0, ops: 0 };
    seg.users++;
    seg.ops += n(r.op_count);
    segments.set(key, seg);
  }
  const residualOps = residual.reduce((sum, r) => sum + n(r.op_count), 0);
  console.log(
    `\nUnreachable residual cohort: ${residual.length} users holding ${residualOps} ops.` +
      `\nSegments (category | activity | payload):`,
  );
  console.table(
    [...segments.entries()]
      .sort((a, b) => b[1].ops - a[1].ops)
      .map(([segment, v]) => ({ segment, users: v.users, ops: v.ops })),
  );

  const topResidual = [...residual]
    .sort((a, b) => n(b.op_count) - n(a.op_count))
    .slice(0, TOP_N)
    .map((r) => ({
      user_id: r.user_id,
      op_count: n(r.op_count),
      category: residualCategory(r),
      dormant: r.last_received_at < cutoff,
      holds_plaintext: r.has_plaintext_rows,
    }));
  console.log(`\nTop ${topResidual.length} unreachable users by op count:`);
  console.table(topResidual);

  console.log('\n=== Safety checks ===');
  console.log(
    `boundary is a surviving causal full-state op: ` +
      (badBoundaryUsers.length === 0
        ? 'OK'
        : `VIOLATED for users ${badBoundaryUsers.join(', ')}`),
  );
  console.log(
    `boundary <= lastSnapshotSeq where a cached snapshot blob exists: ` +
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
