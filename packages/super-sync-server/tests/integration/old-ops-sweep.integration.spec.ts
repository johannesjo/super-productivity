/**
 * Real-PostgreSQL coverage for the daily old-ops sweep
 * (`deleteOldSyncedOpsForAllUsers`).
 *
 * Unit tests exercise the sweep through an in-memory Prisma mock; this suite
 * pins the actual SQL the sweep issues, on real rows:
 *   - a lapsed user (snapshot older than the retention cutoff) gets the
 *     superseded prefix pruned while the causal full-state base + replay tail
 *     survive (regression for the inverted snapshotAt >= cutoff gate),
 *   - a snapshotless user is never touched,
 *   - a user whose only full-state op is a legacy REPAIR (no causal base
 *     cursor) is skipped entirely.
 *
 * Run with:
 *   DATABASE_URL=postgresql://supersync:superpassword@localhost:55432/supersync_db \
 *     npx vitest run --config vitest.integration.config.ts \
 *     tests/integration/old-ops-sweep.integration.spec.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db';
import { SyncService } from '../../src/sync/sync.service';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;

const DAY_MS = 24 * 60 * 60 * 1000;
const LAPSED_USER_ID = 99981;
const SNAPSHOTLESS_USER_ID = 99982;
const LEGACY_REPAIR_USER_ID = 99983;
const SNAPSHOTLESS_IMPORT_USER_ID = 99984;
const ENCRYPTED_USER_ID = 99985;
const NO_STATE_ROW_USER_ID = 99986;
const STUCK_SNAPSHOT_USER_ID = 99987;
const SEQ1_IMPORT_ONLY_USER_ID = 99988;
const ALL_USER_IDS = [
  LAPSED_USER_ID,
  SNAPSHOTLESS_USER_ID,
  LEGACY_REPAIR_USER_ID,
  SNAPSHOTLESS_IMPORT_USER_ID,
  ENCRYPTED_USER_ID,
  NO_STATE_ROW_USER_ID,
  STUCK_SNAPSHOT_USER_ID,
  SEQ1_IMPORT_ONLY_USER_ID,
];

describeWithDb('Old-ops sweep (PostgreSQL)', () => {
  const now = Date.now();
  const cutoffTime = now - 50 * DAY_MS;
  const oldReceivedAt = BigInt(now - 60 * DAY_MS);

  const seedOp = async (
    userId: number,
    serverSeq: number,
    overrides: {
      opType?: string;
      actionType?: string;
      entityType?: string;
      entityId?: string | null;
      payload?: object;
      repairBaseServerSeq?: number | null;
      isPayloadEncrypted?: boolean;
      receivedAt?: bigint;
    } = {},
  ): Promise<void> => {
    await prisma.operation.create({
      data: {
        id: `sweep-op-${userId}-${serverSeq}`,
        userId,
        clientId: `sweep-client-${userId}`,
        serverSeq,
        actionType: overrides.actionType ?? '[Task] Add',
        opType: overrides.opType ?? 'CRT',
        entityType: overrides.entityType ?? 'TASK',
        entityId:
          overrides.entityId === undefined ? `task-${serverSeq}` : overrides.entityId,
        payload: overrides.payload ?? { title: 'sweep fixture' },
        vectorClock: { [`sweep-client-${userId}`]: serverSeq },
        schemaVersion: 1,
        clientTimestamp: oldReceivedAt,
        receivedAt: overrides.receivedAt ?? oldReceivedAt,
        repairBaseServerSeq: overrides.repairBaseServerSeq ?? null,
        isPayloadEncrypted: overrides.isPayloadEncrypted ?? false,
      },
    });
  };

  const seedImportOp = async (
    userId: number,
    serverSeq: number,
    overrides: {
      opType?: string;
      repairBaseServerSeq?: number | null;
      isPayloadEncrypted?: boolean;
      receivedAt?: bigint;
    } = {},
  ): Promise<void> =>
    seedOp(userId, serverSeq, {
      opType: overrides.opType ?? 'SYNC_IMPORT',
      actionType: 'LOAD_ALL_DATA',
      entityType: 'ALL',
      entityId: null,
      payload: { appDataComplete: { TASK: {} } },
      repairBaseServerSeq: overrides.repairBaseServerSeq ?? null,
      isPayloadEncrypted: overrides.isPayloadEncrypted,
      receivedAt: overrides.receivedAt,
    });

  const survivingSeqs = async (userId: number): Promise<number[]> => {
    const ops = await prisma.operation.findMany({
      where: { userId },
      orderBy: { serverSeq: 'asc' },
      select: { serverSeq: true },
    });
    return ops.map((op) => op.serverSeq);
  };

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ALL_USER_IDS } } });
    for (const id of ALL_USER_IDS) {
      await prisma.user.create({
        data: { id, email: `sweep-test-${id}@test.local`, isVerified: 1 },
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ALL_USER_IDS } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.operation.deleteMany({ where: { userId: { in: ALL_USER_IDS } } });
    await prisma.userSyncState.deleteMany({
      where: { userId: { in: ALL_USER_IDS } },
    });
  });

  it('prunes a lapsed user to the causal base + tail, leaves the other cohorts intact', async () => {
    // Lapsed user: snapshot taken 100 days ago (predates the cutoff — the
    // cohort the removed snapshotAt >= cutoff gate used to skip forever).
    // Ops 1-3 = superseded prefix, 4 = causal SYNC_IMPORT base, 5 = tail.
    await seedOp(LAPSED_USER_ID, 1);
    await seedOp(LAPSED_USER_ID, 2);
    await seedOp(LAPSED_USER_ID, 3);
    await seedOp(LAPSED_USER_ID, 4, {
      opType: 'SYNC_IMPORT',
      actionType: 'LOAD_ALL_DATA',
      entityType: 'ALL',
      entityId: null,
      payload: { appDataComplete: { TASK: {} } },
    });
    await seedOp(LAPSED_USER_ID, 5);
    await prisma.userSyncState.create({
      data: {
        userId: LAPSED_USER_ID,
        lastSeq: 5,
        lastSnapshotSeq: 4,
        snapshotAt: BigInt(now - 100 * DAY_MS),
        latestFullStateSeq: 4,
      },
    });

    // Snapshotless user: outside the sweep's scope, must keep everything.
    await seedOp(SNAPSHOTLESS_USER_ID, 1);
    await prisma.userSyncState.create({
      data: { userId: SNAPSHOTLESS_USER_ID, lastSeq: 1 },
    });

    // Legacy-REPAIR user: full-state op without a causal base cursor must
    // never authorize pruning, even with a stale marker pointing at it.
    await seedOp(LEGACY_REPAIR_USER_ID, 1);
    await seedOp(LEGACY_REPAIR_USER_ID, 2);
    await seedOp(LEGACY_REPAIR_USER_ID, 3, {
      opType: 'REPAIR',
      actionType: 'LOAD_ALL_DATA',
      entityType: 'ALL',
      entityId: null,
      payload: { appDataComplete: { TASK: {} } },
      repairBaseServerSeq: null,
    });
    await prisma.userSyncState.create({
      data: {
        userId: LEGACY_REPAIR_USER_ID,
        lastSeq: 3,
        lastSnapshotSeq: 3,
        snapshotAt: BigInt(now - 100 * DAY_MS),
        latestFullStateSeq: 3,
      },
    });

    const service = new SyncService({});
    // The sweep runs across ALL users in this database, so assert per-user
    // outcomes rather than totals other suites' leftovers could inflate.
    const { affectedUserIds } = await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(LAPSED_USER_ID)).toEqual([4, 5]);
    expect(affectedUserIds).toContain(LAPSED_USER_ID);

    expect(await survivingSeqs(SNAPSHOTLESS_USER_ID)).toEqual([1]);
    expect(affectedUserIds).not.toContain(SNAPSHOTLESS_USER_ID);

    expect(await survivingSeqs(LEGACY_REPAIR_USER_ID)).toEqual([1, 2, 3]);
    expect(affectedUserIds).not.toContain(LEGACY_REPAIR_USER_ID);
  });

  it('keeps a fresh prefix (inside retention) even below the causal base', async () => {
    // Ops below the boundary but received inside the retention window must
    // survive until they age out — deletion requires BOTH seq < boundary
    // AND receivedAt < cutoff.
    await seedOp(LAPSED_USER_ID, 1);
    await prisma.operation.update({
      where: { id: `sweep-op-${LAPSED_USER_ID}-1` },
      data: { receivedAt: BigInt(now - 10 * DAY_MS) },
    });
    await seedOp(LAPSED_USER_ID, 2, {
      opType: 'SYNC_IMPORT',
      actionType: 'LOAD_ALL_DATA',
      entityType: 'ALL',
      entityId: null,
      payload: { appDataComplete: { TASK: {} } },
    });
    await prisma.userSyncState.create({
      data: {
        userId: LAPSED_USER_ID,
        lastSeq: 2,
        lastSnapshotSeq: 2,
        snapshotAt: BigInt(now - 100 * DAY_MS),
        latestFullStateSeq: 2,
      },
    });

    const service = new SyncService({});
    await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(LAPSED_USER_ID)).toEqual([1, 2]);
  });

  // ——— Issue #9688: cohorts with no usable snapshot cursor ———————————————
  // The boundary that authorizes deletion is the newest causal full-state op
  // in the operation stream itself — the same op the download path already
  // fast-forwards every client past, and the op `_resolveExpectedFirstSeq`
  // accepts as a leading-gap replay base. A snapshot cursor is not required;
  // it only CAPS the boundary while it exists (legacy cached-snapshot cohort).

  it('prunes a snapshotless user below their newest causal full-state op (#9688)', async () => {
    // No lastSnapshotSeq/snapshotAt — the pre-#9688 sweep never selected
    // this user, so the superseded prefix accumulated forever.
    await seedOp(SNAPSHOTLESS_IMPORT_USER_ID, 1);
    await seedOp(SNAPSHOTLESS_IMPORT_USER_ID, 2);
    await seedOp(SNAPSHOTLESS_IMPORT_USER_ID, 3);
    await seedImportOp(SNAPSHOTLESS_IMPORT_USER_ID, 4);
    await seedOp(SNAPSHOTLESS_IMPORT_USER_ID, 5);
    await prisma.userSyncState.create({
      data: { userId: SNAPSHOTLESS_IMPORT_USER_ID, lastSeq: 5 },
    });

    const service = new SyncService({});
    const { affectedUserIds } = await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(SNAPSHOTLESS_IMPORT_USER_ID)).toEqual([4, 5]);
    expect(affectedUserIds).toContain(SNAPSHOTLESS_IMPORT_USER_ID);
  });

  it('prunes an E2EE user with no server snapshot — encrypted causal boundary (#9688)', async () => {
    // Encrypted payloads are never cached server-side (cacheSnapshotIfReplayable
    // skips them), so under the mandatory-E2EE gate no user can earn a snapshot
    // cursor anymore. The opType envelope stays plaintext, so the causal
    // full-state boundary is still provable from metadata alone.
    await seedOp(ENCRYPTED_USER_ID, 1, { isPayloadEncrypted: true });
    await seedOp(ENCRYPTED_USER_ID, 2, { isPayloadEncrypted: true });
    await seedImportOp(ENCRYPTED_USER_ID, 3, { isPayloadEncrypted: true });
    await seedOp(ENCRYPTED_USER_ID, 4, { isPayloadEncrypted: true });
    await prisma.userSyncState.create({
      data: { userId: ENCRYPTED_USER_ID, lastSeq: 4 },
    });

    const service = new SyncService({});
    await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(ENCRYPTED_USER_ID)).toEqual([3, 4]);
  });

  it('prunes a user holding ops but no user_sync_state row at all (#9688)', async () => {
    await seedOp(NO_STATE_ROW_USER_ID, 1);
    await seedOp(NO_STATE_ROW_USER_ID, 2);
    await seedImportOp(NO_STATE_ROW_USER_ID, 3);
    await seedOp(NO_STATE_ROW_USER_ID, 4);

    const service = new SyncService({});
    await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(NO_STATE_ROW_USER_ID)).toEqual([3, 4]);
  });

  it('keeps a fresh prefix for a snapshotless user (retention still gates deletion)', async () => {
    await seedOp(SNAPSHOTLESS_IMPORT_USER_ID, 1);
    await seedOp(SNAPSHOTLESS_IMPORT_USER_ID, 2, {
      receivedAt: BigInt(now - 10 * DAY_MS),
    });
    await seedImportOp(SNAPSHOTLESS_IMPORT_USER_ID, 3);
    await prisma.userSyncState.create({
      data: { userId: SNAPSHOTLESS_IMPORT_USER_ID, lastSeq: 3 },
    });

    const service = new SyncService({});
    await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(SNAPSHOTLESS_IMPORT_USER_ID)).toEqual([2, 3]);
  });

  it('caps the boundary at lastSnapshotSeq while a cached snapshot cursor exists', async () => {
    // Stuck-snapshot cohort (e.g. issue user 1515): cached snapshot frozen at
    // seq 1. While the cursor exists, pruning must never pass it — the newest
    // causal full-state op below the cap is seq 1, which authorizes nothing.
    // The cap lifts when the E2EE eradication sweep nulls the cached snapshot
    // (next test).
    await seedImportOp(STUCK_SNAPSHOT_USER_ID, 1);
    await seedOp(STUCK_SNAPSHOT_USER_ID, 2);
    await seedOp(STUCK_SNAPSHOT_USER_ID, 3);
    await seedImportOp(STUCK_SNAPSHOT_USER_ID, 4);
    await seedOp(STUCK_SNAPSHOT_USER_ID, 5);
    await prisma.userSyncState.create({
      data: {
        userId: STUCK_SNAPSHOT_USER_ID,
        lastSeq: 5,
        lastSnapshotSeq: 1,
        snapshotAt: BigInt(now - 100 * DAY_MS),
        snapshotData: Buffer.from('legacy-cached-snapshot'),
      },
    });

    const service = new SyncService({});
    const { affectedUserIds } = await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(STUCK_SNAPSHOT_USER_ID)).toEqual([1, 2, 3, 4, 5]);
    expect(affectedUserIds).not.toContain(STUCK_SNAPSHOT_USER_ID);
  });

  it('unsticks the capped user once the snapshot cursor is cleared (post-eradication)', async () => {
    await seedImportOp(STUCK_SNAPSHOT_USER_ID, 1);
    await seedOp(STUCK_SNAPSHOT_USER_ID, 2);
    await seedOp(STUCK_SNAPSHOT_USER_ID, 3);
    await seedImportOp(STUCK_SNAPSHOT_USER_ID, 4);
    await seedOp(STUCK_SNAPSHOT_USER_ID, 5);
    await prisma.userSyncState.create({
      data: { userId: STUCK_SNAPSHOT_USER_ID, lastSeq: 5 },
    });

    const service = new SyncService({});
    await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(STUCK_SNAPSHOT_USER_ID)).toEqual([4, 5]);
  });

  it('never prunes a user whose only causal full-state op is the initial import at seq 1', async () => {
    // Everything after the initial import is live history with no superseding
    // boundary — structurally unprunable until a newer full-state op exists
    // (issue #9688 direction 2: client checkpoint cadence).
    await seedImportOp(SEQ1_IMPORT_ONLY_USER_ID, 1);
    await seedOp(SEQ1_IMPORT_ONLY_USER_ID, 2);
    await seedOp(SEQ1_IMPORT_ONLY_USER_ID, 3);
    await prisma.userSyncState.create({
      data: { userId: SEQ1_IMPORT_ONLY_USER_ID, lastSeq: 3 },
    });

    const service = new SyncService({});
    const { affectedUserIds } = await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(SEQ1_IMPORT_ONLY_USER_ID)).toEqual([1, 2, 3]);
    expect(affectedUserIds).not.toContain(SEQ1_IMPORT_ONLY_USER_ID);
  });

  it('skips a snapshotless legacy-REPAIR-only history (no causal base)', async () => {
    // A legacy REPAIR (repairBaseServerSeq NULL) must never authorize pruning,
    // with or without a snapshot cursor.
    await seedOp(LEGACY_REPAIR_USER_ID, 1);
    await seedOp(LEGACY_REPAIR_USER_ID, 2);
    await seedImportOp(LEGACY_REPAIR_USER_ID, 3, {
      opType: 'REPAIR',
      repairBaseServerSeq: null,
    });
    await prisma.userSyncState.create({
      data: { userId: LEGACY_REPAIR_USER_ID, lastSeq: 3 },
    });

    const service = new SyncService({});
    await service.deleteOldSyncedOpsForAllUsers(cutoffTime);

    expect(await survivingSeqs(LEGACY_REPAIR_USER_ID)).toEqual([1, 2, 3]);
  });
});
