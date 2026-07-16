/**
 * Real-PostgreSQL coverage for destructive clean-slate uploads.
 *
 * Unit tests use a transaction-aware database facade. This suite verifies that the
 * actual database transaction restores operations, sequence state, devices, and
 * storage accounting when any replacement operation is rejected.
 *
 * Run with:
 *   DATABASE_URL=postgresql://nourasync:superpassword@localhost:55432/nourasync_db \
 *     bunx vitest run --config vitest.integration.config.ts \
 *     tests/integration/clean-slate-atomicity-sql.integration.spec.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db, disconnectDb } from '../../src/db';
import { SyncService } from '../../src/sync/sync.service';
import { Operation, SYNC_ERROR_CODES, type SyncConfig } from '../../src/sync/sync.types';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;

describeWithDb('Clean-slate upload atomicity (PostgreSQL)', () => {
  const TEST_USER_ID = 99997;
  const TEST_EMAIL = `test-clean-slate-${Date.now()}@test.local`;
  const CLIENT_ID = 'clean-slate-integration-client';

  const makeOp = (overrides: Partial<Operation> = {}): Operation => ({
    id: `clean-slate-op-${Date.now()}`,
    clientId: CLIENT_ID,
    actionType: '[Task] Add',
    opType: 'CRT',
    entityType: 'TASK',
    entityId: 'task-before-clean-slate',
    payload: { title: 'Preserve me' },
    vectorClock: { [CLIENT_ID]: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });

  const readPersistentState = async () => {
    const [operations, syncState, devices, user] = await Promise.all([
      db.operation.findMany({
        where: { userId: TEST_USER_ID },
        orderBy: { serverSeq: 'asc' },
      }),
      db.userSyncState.findUniqueOrThrow({ where: { userId: TEST_USER_ID } }),
      db.syncDevice.findMany({
        where: { userId: TEST_USER_ID },
        orderBy: { clientId: 'asc' },
      }),
      db.user.findUniqueOrThrow({
        where: { id: TEST_USER_ID },
        select: { storageUsedBytes: true },
      }),
    ]);

    return {
      operations,
      syncState,
      devices,
      storageUsedBytes: user.storageUsedBytes,
    };
  };

  beforeAll(async () => {
    await db.user.deleteMany({ where: { id: TEST_USER_ID } });
    await db.user.create({
      data: { id: TEST_USER_ID, email: TEST_EMAIL, isVerified: 1 },
    });
    await db.userSyncState.create({
      data: { userId: TEST_USER_ID, lastSeq: 0 },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: TEST_USER_ID } });
    await disconnectDb();
  });

  beforeEach(async () => {
    await db.operation.deleteMany({ where: { userId: TEST_USER_ID } });
    await db.syncDevice.deleteMany({ where: { userId: TEST_USER_ID } });
    await db.userSyncState.update({
      where: { userId: TEST_USER_ID },
      data: {
        lastSeq: 0,
        lastSnapshotSeq: null,
        snapshotData: null,
        snapshotAt: null,
        latestFullStateSeq: null,
        latestFullStateVectorClock: null,
      },
    });
    await db.user.update({
      where: { id: TEST_USER_ID },
      data: { storageUsedBytes: 0 },
    });
  });

  it.each([
    { name: 'serial upload path', batchUpload: false },
    { name: 'batch upload path', batchUpload: true },
  ] as const)(
    'rolls back the whole replacement on a rejected sibling ($name)',
    async ({ batchUpload }) => {
      const config: Partial<SyncConfig> = { batchUpload };
      const service = new SyncService(config);
      const existingOp = makeOp({ id: `existing-${batchUpload}` });
      const seedResult = await service.uploadOps(TEST_USER_ID, CLIENT_ID, [existingOp]);
      expect(seedResult[0].accepted).toBe(true);

      const before = await readPersistentState();

      const replacement = makeOp({
        id: `duplicate-replacement-${batchUpload}`,
        opType: 'SYNC_IMPORT',
        actionType: 'LOAD_ALL_DATA',
        entityType: 'ALL',
        entityId: undefined,
        payload: { task: { ids: ['replacement-task'] } },
        vectorClock: { [CLIENT_ID]: 2 },
        syncImportReason: 'FORCE_UPLOAD',
      });
      const results = await service.uploadOps(
        TEST_USER_ID,
        CLIENT_ID,
        [replacement, { ...replacement }],
        true,
      );

      expect(results).toHaveLength(2);
      expect(results.every(({ accepted }) => !accepted)).toBe(true);
      expect(results[0].errorCode).toBe(SYNC_ERROR_CODES.INTERNAL_ERROR);
      expect(results[1].errorCode).toBe(SYNC_ERROR_CODES.DUPLICATE_OPERATION);

      expect(await readPersistentState()).toEqual(before);
      expect(await db.operation.findUnique({ where: { id: replacement.id } })).toBeNull();
    },
  );
});
