/**
 * Shared bounds for every monitoring report that reads `operations`.
 *
 * In the 2026-08-07 suite run all six operations-backed reports hit the
 * operator's `statement_timeout` and all four that avoid the table succeeded.
 * The reports were bounded in *rows returned* but not in *work done*: a
 * `TABLESAMPLE SYSTEM (1)` still reads 1% of however large the table has grown,
 * and a per-user LATERAL tail still visited every account on the instance
 * (8,610 rows of `user_sync_state`) to collect it. Both drivers are replaced by
 * the ones here, so a report costs at most `scopeUsers x opsPerUser` row
 * fetches regardless of table size or account count.
 *
 * Measured against a 2,000-account / 1M-operation fixture, the uncapped per-user
 * fan-out cost 10x the capped one (581ms vs 60ms) — exactly the account-count
 * ratio, and production carries 4x more accounts again. The TABLESAMPLE reports
 * could not be reproduced at that fixture size; their bound is a structural
 * claim, not a measured one, since 1% of a table that keeps growing is not a
 * bound at all.
 */

import { Prisma } from '@prisma/client';

/** Users sampled per report unless `--users <n>` overrides it. */
export const DEFAULT_SCOPE_USERS = 200;

/** Operations read per sampled user in the size/type/timeline reports. */
export const DEFAULT_OPS_PER_USER = 100;

/**
 * The `limit` users with the most recent device heartbeat, newest first.
 *
 * `sync_devices` holds one row per device, so this stays proportional to the
 * account list and never touches `operations`. It is deliberately not filtered
 * through `user_sync_state`: a user who has not synced in a year cannot be the
 * one currently generating data, and driving a per-user tail from every account
 * that ever existed is what made these reports unbounded.
 */
export const recentlyActiveUserIds = (limit: number, since?: bigint): Prisma.Sql =>
  Prisma.sql`
        SELECT user_id
        FROM sync_devices
        ${since === undefined ? Prisma.empty : Prisma.sql`WHERE last_seen_at > ${since}`}
        GROUP BY user_id
        ORDER BY MAX(last_seen_at) DESC
        LIMIT ${limit}
      `;

/**
 * The newest `opsPerUser` operations of every user in `users`, projected to
 * `columns`.
 *
 * Each tail is read backwards through the `(user_id, server_seq)` unique index,
 * so a user costs one index descent plus `opsPerUser` heap fetches. Keep any
 * `received_at` window on the *outside* of this fragment: pushing it into the
 * subquery turns the bounded index tail back into a scan of that user's whole
 * history looking for matches.
 */
export const newestOpsPerUser = (
  users: Prisma.Sql,
  columns: Prisma.Sql,
  opsPerUser: number,
): Prisma.Sql =>
  Prisma.sql`
        SELECT scoped_ops.*
        FROM (${users}) AS scope_users
        CROSS JOIN LATERAL (
          SELECT ${columns}
          FROM operations
          WHERE operations.user_id = scope_users.user_id
          ORDER BY operations.server_seq DESC
          LIMIT ${opsPerUser}
        ) AS scoped_ops
      `;

/**
 * Storage size of one operation row.
 *
 * `payload_bytes` is the counter the upload path maintains; rows written before
 * migration 20260514000001 still carry 0 and fall back to measuring the JSON.
 * That fallback dominates everything else here — measured on 20k rows with 12KB
 * payloads it cost 15x the backfilled path (~390ms vs ~25ms, 93k buffers vs
 * 167), because reading the payload means an out-of-line TOAST fetch per row. If
 * these reports are slow, check `operations_payload_bytes_unbackfilled_idx` is
 * empty before tuning anything else; `npm run migrate-payload-bytes` fixes it.
 *
 * Evaluate this AT THE SCAN, never over a CTE that projects `payload` forward.
 * The projection does not force a detoast (a tuplestore carries the TOAST
 * pointer), but it does copy any inline-compressed payload through an extra
 * materialisation pass: same 20k rows, 46ms and 559 temp blocks spilled to disk
 * versus 17ms and no spill.
 */
export const OPERATION_BYTES = Prisma.sql`
          CASE
            WHEN payload_bytes > 0 THEN payload_bytes
            ELSE OCTET_LENGTH(payload::text)::bigint +
                 OCTET_LENGTH(vector_clock::text)::bigint
          END
        `;

/** Describes the sampled population, so a capped report never reads as a full one. */
export const describeScope = (scopeUsers: number, opsPerUser: number): string =>
  `Based on the newest ${opsPerUser} operations of each of the up to ${scopeUsers} most recently active users (change with --users <n>).`;
