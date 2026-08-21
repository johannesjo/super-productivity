#!/usr/bin/env tsx
/**
 * Read-only dry run of the daily old-ops sweep
 * (`StorageQuotaService.deleteOldSyncedOpsForAllUsers`).
 *
 * Mirrors the production deletion logic in set-based SQL and reports, without
 * writing anything, exactly what the next sweep would delete on THIS database:
 *   - per-user prune boundary: the newest CAUSAL full-state op in the
 *     operation stream (#9688 — no snapshot cursor required), capped at
 *     `lastSnapshotSeq` while a cached-snapshot cursor still exists
 *   - would-delete counts and the retained base + tail
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
    return 'snapshot-capped (cursor blocks newer boundary)';
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
  // with server_seq > 1 authorizes pruning; while a cached-snapshot cursor
  // exists (last_snapshot_seq > 0) the boundary may not pass it and drops to
  // the newest causal full-state op at or below the cursor. The
  // `latest_full_state_seq` marker is not consulted (stale for ~90% of
  // users, no backfill in #8973).
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
      SELECT p.*, s.last_snapshot_seq
      FROM per_user p
      LEFT JOIN user_sync_state s ON s.user_id = p.user_id
    ),
    capped AS (
      SELECT
        j.*,
        COALESCE(
          j.last_snapshot_seq > 0 AND j.causal_boundary_seq > j.last_snapshot_seq,
          false
        ) AS was_capped
      FROM joined j
    ),
    resolved AS (
      SELECT
        c.*,
        CASE WHEN c.was_capped THEN (
          SELECT max(o.server_seq) FROM operations o
          WHERE o.user_id = c.user_id
            AND o.server_seq <= c.last_snapshot_seq
            AND ${causalFullStateSql('o')}
        ) ELSE c.causal_boundary_seq END AS protected_from_seq
      FROM capped c
    )
    SELECT
      r.user_id,
      r.op_count,
      r.last_received_at,
      r.last_snapshot_seq,
      r.any_causal_seq,
      r.has_legacy_repair,
      r.has_plaintext_rows,
      r.was_capped,
      r.protected_from_seq,
      COALESCE(prefix.would_delete, 0) AS would_delete,
      COALESCE(prefix.fresh_prefix, 0) AS fresh_prefix,
      -- The retained base + tail is everything the prefix scan did not cover,
      -- so it needs no scan of its own (it is the largest of the three ranges).
      COALESCE(
        r.op_count - prefix.would_delete - prefix.fresh_prefix,
        0
      ) AS retained_from_boundary
    FROM resolved r
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE o.received_at < ${cutoff}) AS would_delete,
        count(*) FILTER (WHERE o.received_at >= ${cutoff}) AS fresh_prefix
      FROM operations o
      WHERE o.user_id = r.user_id
        AND o.server_seq < r.protected_from_seq
    ) prefix ON r.protected_from_seq > 1
  `;

  const prunable = perUser.filter(
    (r) => r.protected_from_seq !== null && r.protected_from_seq > 1,
  );
  const residual = perUser.filter(
    (r) => r.protected_from_seq === null || r.protected_from_seq <= 1,
  );
  const totalWouldDelete = prunable.reduce((sum, r) => sum + n(r.would_delete), 0);

  // Safety check 1: boundary must be a surviving causal full-state op —
  // re-verified independently for every user the sweep would actually touch.
  const affected = prunable.filter((r) => n(r.would_delete) > 0);
  const badBoundaryUsers = await findBadBoundaries(
    affected.map((r) => ({
      userId: r.user_id,
      // non-null: prunable filtered on it
      seq: r.protected_from_seq as number,
    })),
  );

  // Safety check 2: while a cached-snapshot cursor exists, the boundary may
  // never exceed it — pruning above the cursor would eat into the cached
  // snapshot's replay tail (the restore path).
  const tailViolations = prunable.filter(
    (r) =>
      r.last_snapshot_seq !== null &&
      r.last_snapshot_seq > 0 &&
      (r.protected_from_seq as number) > r.last_snapshot_seq,
  );

  const [{ total_ops }] = await prisma.$queryRaw<[{ total_ops: bigint }]>`
    SELECT count(*) AS total_ops FROM operations
  `;

  console.log('=== Old-ops sweep dry run (read-only) ===');
  console.log(`cutoff: received_at < ${new Date(Number(cutoff)).toISOString()}`);
  console.log(`operations table total:            ${n(total_ops)}`);
  console.log(`users holding operations:          ${perUser.length}`);
  console.log(`  with a causal prune boundary:     ${prunable.length}`);
  console.log(
    `    boundary capped by snapshot:    ${prunable.filter((r) => r.was_capped).length}`,
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
      fresh_prefix_kept: n(r.fresh_prefix),
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
    `boundary <= lastSnapshotSeq where a snapshot cursor exists: ` +
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
