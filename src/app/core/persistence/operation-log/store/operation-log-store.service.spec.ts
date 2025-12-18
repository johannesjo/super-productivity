import { TestBed } from '@angular/core/testing';
import { OperationLogStoreService } from './operation-log-store.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { Operation, OpType, EntityType, VectorClock } from '../operation.types';
import { uuidv7 } from '../../../../util/uuid-v7';

describe('OperationLogStoreService', () => {
  let service: OperationLogStoreService;
  let vectorClockService: VectorClockService;

  // Helper to create test operations
  const createTestOperation = (overrides: Partial<Operation> = {}): Operation => ({
    id: uuidv7(),
    actionType: '[Task] Update',
    opType: OpType.Update,
    entityType: 'TASK' as EntityType,
    entityId: 'task1',
    payload: { title: 'Test Task' },
    clientId: 'testClient',
    vectorClock: { testClient: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OperationLogStoreService, VectorClockService],
    });
    service = TestBed.inject(OperationLogStoreService);
    vectorClockService = TestBed.inject(VectorClockService);
    await service.init();
    // Clear all data from previous tests to ensure test isolation
    await service._clearAllDataForTesting();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeTruthy();
    });

    it('should handle concurrent initialization calls safely', async () => {
      // Create a new service instance
      const newService = new OperationLogStoreService();

      // Call init multiple times concurrently
      const initPromises = [newService.init(), newService.init(), newService.init()];

      // All should resolve without error
      await expectAsync(Promise.all(initPromises)).toBeResolved();
    });
  });

  describe('append', () => {
    it('should append operation to log', async () => {
      const op = createTestOperation();
      await service.append(op);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.id).toBe(op.id);
    });

    it('should auto-increment sequence number', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });
      const op3 = createTestOperation({ entityId: 'task3' });

      await service.append(op1);
      await service.append(op2);
      await service.append(op3);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(3);
      expect(ops[0].seq).toBeLessThan(ops[1].seq);
      expect(ops[1].seq).toBeLessThan(ops[2].seq);
    });

    it('should set appliedAt timestamp', async () => {
      const beforeTime = Date.now();
      const op = createTestOperation();
      await service.append(op);
      const afterTime = Date.now();

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].appliedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(ops[0].appliedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should set source to local by default', async () => {
      const op = createTestOperation();
      await service.append(op);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].source).toBe('local');
      expect(ops[0].syncedAt).toBeUndefined();
    });

    it('should set syncedAt when source is remote', async () => {
      const op = createTestOperation();
      await service.append(op, 'remote');

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].source).toBe('remote');
      expect(ops[0].syncedAt).toBeDefined();
    });
  });

  describe('hasOp', () => {
    it('should return true for existing operations', async () => {
      const op = createTestOperation();
      await service.append(op);

      expect(await service.hasOp(op.id)).toBe(true);
    });

    it('should return false for non-existing operations', async () => {
      expect(await service.hasOp('nonExistentId')).toBe(false);
    });
  });

  describe('filterNewOps', () => {
    it('should return all ops when none exist in store', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      const result = await service.filterNewOps([op1, op2]);

      expect(result.length).toBe(2);
      expect(result).toContain(op1);
      expect(result).toContain(op2);
    });

    it('should filter out ops that already exist', async () => {
      const existingOp = createTestOperation({ entityId: 'existing' });
      const newOp = createTestOperation({ entityId: 'new' });

      await service.append(existingOp);

      const result = await service.filterNewOps([existingOp, newOp]);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(newOp.id);
    });

    it('should return empty array when all ops exist', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      await service.append(op1);
      await service.append(op2);

      const result = await service.filterNewOps([op1, op2]);

      expect(result.length).toBe(0);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.filterNewOps([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getOpsAfterSeq', () => {
    it('should return all operations after given sequence', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });
      const op3 = createTestOperation({ entityId: 'task3' });

      await service.append(op1);
      await service.append(op2);
      await service.append(op3);

      const allOps = await service.getOpsAfterSeq(0);
      expect(allOps.length).toBe(3);

      // Get ops after the first one
      const opsAfterFirst = await service.getOpsAfterSeq(allOps[0].seq);
      expect(opsAfterFirst.length).toBe(2);
    });

    it('should return empty array if no ops after sequence', async () => {
      const op = createTestOperation();
      await service.append(op);

      const ops = await service.getOpsAfterSeq(0);
      const opsAfterLast = await service.getOpsAfterSeq(ops[0].seq);
      expect(opsAfterLast.length).toBe(0);
    });
  });

  describe('getUnsynced', () => {
    it('should return only unsynced local operations', async () => {
      const localOp = createTestOperation({ entityId: 'localTask' });
      const remoteOp = createTestOperation({ entityId: 'remoteTask' });

      await service.append(localOp, 'local');
      await service.append(remoteOp, 'remote');

      const unsynced = await service.getUnsynced();
      expect(unsynced.length).toBe(1);
      expect(unsynced[0].op.entityId).toBe('localTask');
    });

    it('should exclude rejected operations', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      await service.append(op1);
      await service.append(op2);
      await service.markRejected([op1.id]);

      const unsynced = await service.getUnsynced();
      expect(unsynced.length).toBe(1);
      expect(unsynced[0].op.entityId).toBe('task2');
    });
  });

  describe('getUnsyncedByEntity', () => {
    it('should group unsynced ops by entity', async () => {
      const taskOp1 = createTestOperation({
        entityType: 'TASK' as EntityType,
        entityId: 'task1',
      });
      const taskOp2 = createTestOperation({
        entityType: 'TASK' as EntityType,
        entityId: 'task1',
      });
      const projectOp = createTestOperation({
        entityType: 'PROJECT' as EntityType,
        entityId: 'proj1',
      });

      await service.append(taskOp1);
      await service.append(taskOp2);
      await service.append(projectOp);

      const unsyncedByEntity = await service.getUnsyncedByEntity();
      expect(unsyncedByEntity.get('TASK:task1')?.length).toBe(2);
      expect(unsyncedByEntity.get('PROJECT:proj1')?.length).toBe(1);
    });
  });

  describe('getAppliedOpIds', () => {
    it('should return set of all operation IDs', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      await service.append(op1);
      await service.append(op2);

      const appliedIds = await service.getAppliedOpIds();
      expect(appliedIds.has(op1.id)).toBe(true);
      expect(appliedIds.has(op2.id)).toBe(true);
      expect(appliedIds.size).toBe(2);
    });
  });

  describe('markSynced', () => {
    it('should update syncedAt timestamp for given sequences', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      await service.append(op1);
      await service.append(op2);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].syncedAt).toBeUndefined();

      await service.markSynced([ops[0].seq]);

      const opsAfterMark = await service.getOpsAfterSeq(0);
      expect(opsAfterMark[0].syncedAt).toBeDefined();
      expect(opsAfterMark[1].syncedAt).toBeUndefined();
    });
  });

  describe('markRejected', () => {
    it('should update rejectedAt timestamp for given operation IDs', async () => {
      const op = createTestOperation();
      await service.append(op);

      const opsBefore = await service.getOpsAfterSeq(0);
      expect(opsBefore[0].rejectedAt).toBeUndefined();

      await service.markRejected([op.id]);

      const opsAfter = await service.getOpsAfterSeq(0);
      expect(opsAfter[0].rejectedAt).toBeDefined();
    });
  });

  describe('deleteOpsWhere', () => {
    it('should delete operations matching predicate', async () => {
      const op1 = createTestOperation({ actionType: '[Task] Create' });
      const op2 = createTestOperation({ actionType: '[Task] Update' });
      const op3 = createTestOperation({ actionType: '[Task] Create' });

      await service.append(op1);
      await service.append(op2);
      await service.append(op3);

      await service.deleteOpsWhere((entry) => entry.op.actionType === '[Task] Create');

      const remaining = await service.getOpsAfterSeq(0);
      expect(remaining.length).toBe(1);
      expect(remaining[0].op.actionType).toBe('[Task] Update');
    });
  });

  describe('getLastSeq', () => {
    it('should return 0 when no operations exist', async () => {
      const lastSeq = await service.getLastSeq();
      expect(lastSeq).toBe(0);
    });

    it('should return last sequence number', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      await service.append(op1);
      await service.append(op2);

      const allOps = await service.getOpsAfterSeq(0);
      const lastSeq = await service.getLastSeq();
      expect(lastSeq).toBe(allOps[allOps.length - 1].seq);
    });
  });

  describe('state cache', () => {
    it('should save and load state cache', async () => {
      const testState = { task: { ids: ['1'], entities: { id1: { id: '1' } } } };
      const vectorClock: VectorClock = { client1: 5 };

      await service.saveStateCache({
        state: testState,
        lastAppliedOpSeq: 100,
        vectorClock,
        compactedAt: Date.now(),
        schemaVersion: 1,
      });

      const loaded = await service.loadStateCache();
      expect(loaded).not.toBeNull();
      expect(loaded!.state).toEqual(testState);
      expect(loaded!.lastAppliedOpSeq).toBe(100);
      expect(loaded!.vectorClock).toEqual(vectorClock);
    });

    it('should return null when no state cache exists', async () => {
      const loaded = await service.loadStateCache();
      expect(loaded).toBeNull();
    });
  });

  describe('migration safety backup', () => {
    it('should save and restore backup', async () => {
      const testState = { task: { ids: ['1'], entities: {} } };

      await service.saveStateCache({
        state: testState,
        lastAppliedOpSeq: 50,
        vectorClock: { client1: 3 },
        compactedAt: Date.now(),
        schemaVersion: 1,
      });

      await service.saveStateCacheBackup();
      expect(await service.hasStateCacheBackup()).toBe(true);

      // Modify current state
      await service.saveStateCache({
        state: { modified: true },
        lastAppliedOpSeq: 100,
        vectorClock: { client1: 10 },
        compactedAt: Date.now(),
        schemaVersion: 2,
      });

      // Restore backup
      await service.restoreStateCacheFromBackup();

      const restored = await service.loadStateCache();
      expect(restored!.lastAppliedOpSeq).toBe(50);
      expect(restored!.state).toEqual(testState);
    });

    it('should clear backup after successful operation', async () => {
      const testState = { task: { ids: [], entities: {} } };

      await service.saveStateCache({
        state: testState,
        lastAppliedOpSeq: 10,
        vectorClock: {},
        compactedAt: Date.now(),
      });

      await service.saveStateCacheBackup();
      expect(await service.hasStateCacheBackup()).toBe(true);

      await service.clearStateCacheBackup();
      expect(await service.hasStateCacheBackup()).toBe(false);
    });
  });

  describe('compaction counter', () => {
    it('should start at 0 when no state cache exists', async () => {
      const count = await service.getCompactionCounter();
      expect(count).toBe(0);
    });

    it('should increment counter', async () => {
      await service.saveStateCache({
        state: {},
        lastAppliedOpSeq: 0,
        vectorClock: {},
        compactedAt: Date.now(),
      });

      const count1 = await service.incrementCompactionCounter();
      expect(count1).toBe(1);

      const count2 = await service.incrementCompactionCounter();
      expect(count2).toBe(2);

      const count3 = await service.getCompactionCounter();
      expect(count3).toBe(2);
    });

    it('should persist counter when no state cache exists (regression test)', async () => {
      // This tests the fix for the bug where incrementCompactionCounter()
      // returned 1 without persisting when no cache existed.
      // Without the fix, each call would return 1 (counter never progressed).

      // No state cache exists yet - verify counter starts at 0
      expect(await service.getCompactionCounter()).toBe(0);

      // First increment should return 1 AND persist it
      const count1 = await service.incrementCompactionCounter();
      expect(count1).toBe(1);

      // Verify it was actually persisted
      const persistedCount1 = await service.getCompactionCounter();
      expect(persistedCount1).toBe(1);

      // Second increment should return 2 (not 1 again!)
      const count2 = await service.incrementCompactionCounter();
      expect(count2).toBe(2);

      // Verify it was persisted
      const persistedCount2 = await service.getCompactionCounter();
      expect(persistedCount2).toBe(2);

      // Third increment to be sure
      const count3 = await service.incrementCompactionCounter();
      expect(count3).toBe(3);
    });

    it('should reset counter', async () => {
      await service.saveStateCache({
        state: {},
        lastAppliedOpSeq: 0,
        vectorClock: {},
        compactedAt: Date.now(),
      });

      await service.incrementCompactionCounter();
      await service.incrementCompactionCounter();
      await service.resetCompactionCounter();

      const count = await service.getCompactionCounter();
      expect(count).toBe(0);
    });

    // =========================================================================
    // Regression test: incrementCompactionCounter counter-only cache handling
    // =========================================================================
    // When incrementCompactionCounter creates a cache entry just to track the
    // counter, loadStateCache should return null since there's no valid snapshot.
    // This prevents unnecessary recovery paths on startup.

    it('should not expose invalid snapshot when incrementCompactionCounter creates counter-only cache', async () => {
      // No state cache exists yet
      const beforeCache = await service.loadStateCache();
      expect(beforeCache).toBeNull();

      // Increment the compaction counter (simulating operation writes before first compaction)
      await service.incrementCompactionCounter();

      // Now check what loadStateCache returns
      const afterCache = await service.loadStateCache();

      // loadStateCache should return null since the cache has state: null
      // (counter-only entry, not a real snapshot)
      expect(afterCache).toBeNull();
    });

    it('should still track compaction counter even when loadStateCache returns null', async () => {
      // Increment counter without a real snapshot existing
      await service.incrementCompactionCounter();
      await service.incrementCompactionCounter();
      await service.incrementCompactionCounter();

      // loadStateCache returns null (no valid snapshot)
      const cache = await service.loadStateCache();
      expect(cache).toBeNull();

      // But the counter should still be tracked correctly
      const counter = await service.getCompactionCounter();
      expect(counter).toBe(3);
    });
  });

  describe('VectorClockService.getCurrentVectorClock', () => {
    it('should return empty clock when no data exists', async () => {
      const clock = await vectorClockService.getCurrentVectorClock();
      expect(clock).toEqual({});
    });

    it('should merge clocks from snapshot and ops', async () => {
      // Save snapshot with initial clock
      await service.saveStateCache({
        state: {},
        lastAppliedOpSeq: 0,
        vectorClock: { clientA: 5, clientB: 3 },
        compactedAt: Date.now(),
      });

      // Add ops with newer clocks
      const op1 = createTestOperation({
        clientId: 'clientA',
        vectorClock: { clientA: 6, clientB: 3 },
      });
      const op2 = createTestOperation({
        clientId: 'clientB',
        vectorClock: { clientA: 6, clientB: 4 },
      });

      await service.append(op1);
      await service.append(op2);

      const clock = await vectorClockService.getCurrentVectorClock();
      expect(clock.clientA).toBe(6);
      expect(clock.clientB).toBe(4);
    });
  });

  describe('VectorClockService.getEntityFrontier', () => {
    it('should return empty map when no ops exist', async () => {
      const frontier = await vectorClockService.getEntityFrontier();
      expect(frontier.size).toBe(0);
    });

    it('should return frontier per entity', async () => {
      const op1 = createTestOperation({
        entityType: 'TASK' as EntityType,
        entityId: 'task1',
        vectorClock: { clientA: 1 },
      });
      const op2 = createTestOperation({
        entityType: 'TASK' as EntityType,
        entityId: 'task1',
        vectorClock: { clientA: 2 },
      });
      const op3 = createTestOperation({
        entityType: 'PROJECT' as EntityType,
        entityId: 'proj1',
        vectorClock: { clientA: 3 },
      });

      await service.append(op1);
      await service.append(op2);
      await service.append(op3);

      const frontier = await vectorClockService.getEntityFrontier();
      expect(frontier.get('TASK:task1')).toEqual({ clientA: 2 }); // Latest for task1
      expect(frontier.get('PROJECT:proj1')).toEqual({ clientA: 3 });
    });

    it('should filter by entity type and id when provided', async () => {
      const op1 = createTestOperation({
        entityType: 'TASK' as EntityType,
        entityId: 'task1',
        vectorClock: { clientA: 1 },
      });
      const op2 = createTestOperation({
        entityType: 'PROJECT' as EntityType,
        entityId: 'proj1',
        vectorClock: { clientA: 2 },
      });

      await service.append(op1);
      await service.append(op2);

      const taskFrontier = await vectorClockService.getEntityFrontier(
        'TASK' as EntityType,
      );
      expect(taskFrontier.size).toBe(1);
      expect(taskFrontier.has('TASK:task1')).toBe(true);
      expect(taskFrontier.has('PROJECT:proj1')).toBe(false);
    });
  });

  describe('transaction atomicity', () => {
    it('should maintain consistency after failed saveStateCache', async () => {
      const op = createTestOperation();
      await service.append(op);

      // Save initial state cache
      await service.saveStateCache({
        state: { initial: true },
        lastAppliedOpSeq: 1,
        vectorClock: { client: 1 },
        compactedAt: Date.now(),
        schemaVersion: 1,
      });

      // Operations should still be accessible
      const ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.id).toBe(op.id);
    });

    it('should handle concurrent append operations safely', async () => {
      const ops = Array.from({ length: 10 }, (_, i) =>
        createTestOperation({ entityId: `task-${i}` }),
      );

      // Append all concurrently
      await Promise.all(ops.map((op) => service.append(op)));

      const storedOps = await service.getOpsAfterSeq(0);
      expect(storedOps.length).toBe(10);

      // All should have unique sequence numbers
      const seqNumbers = storedOps.map((op) => op.seq);
      const uniqueSeqs = new Set(seqNumbers);
      expect(uniqueSeqs.size).toBe(10);
    });

    it('should handle concurrent markSynced operations safely', async () => {
      const ops = Array.from({ length: 5 }, (_, i) =>
        createTestOperation({ entityId: `task-${i}` }),
      );

      for (const op of ops) {
        await service.append(op);
      }

      const storedOps = await service.getOpsAfterSeq(0);
      const seqNumbers = storedOps.map((op) => op.seq);

      // Mark synced concurrently
      await Promise.all(seqNumbers.map((seq) => service.markSynced([seq])));

      // All should be synced
      const afterSync = await service.getOpsAfterSeq(0);
      for (const entry of afterSync) {
        expect(entry.syncedAt).toBeDefined();
      }
    });
  });

  describe('appendBatch', () => {
    it('should append multiple operations in a single transaction', async () => {
      const ops = [
        createTestOperation({ entityId: 'task1' }),
        createTestOperation({ entityId: 'task2' }),
        createTestOperation({ entityId: 'task3' }),
      ];

      const seqs = await service.appendBatch(ops);

      expect(seqs.length).toBe(3);
      const storedOps = await service.getOpsAfterSeq(0);
      expect(storedOps.length).toBe(3);
    });

    it('should return sequential sequence numbers', async () => {
      const ops = [
        createTestOperation({ entityId: 'task1' }),
        createTestOperation({ entityId: 'task2' }),
      ];

      const seqs = await service.appendBatch(ops);

      expect(seqs[1]).toBe(seqs[0] + 1);
    });

    it('should set source and syncedAt for remote batch', async () => {
      const ops = [
        createTestOperation({ entityId: 'task1' }),
        createTestOperation({ entityId: 'task2' }),
      ];

      await service.appendBatch(ops, 'remote');

      const storedOps = await service.getOpsAfterSeq(0);
      expect(storedOps[0].source).toBe('remote');
      expect(storedOps[0].syncedAt).toBeDefined();
      expect(storedOps[1].source).toBe('remote');
      expect(storedOps[1].syncedAt).toBeDefined();
    });

    it('should set applicationStatus to pending when pendingApply is true', async () => {
      const ops = [createTestOperation({ entityId: 'task1' })];

      await service.appendBatch(ops, 'remote', { pendingApply: true });

      const storedOps = await service.getOpsAfterSeq(0);
      expect(storedOps[0].applicationStatus).toBe('pending');
    });

    it('should handle empty array', async () => {
      const seqs = await service.appendBatch([]);

      expect(seqs).toEqual([]);
    });
  });

  describe('getOpById', () => {
    it('should return operation entry by ID', async () => {
      const op = createTestOperation();
      await service.append(op);

      const entry = await service.getOpById(op.id);

      expect(entry).toBeDefined();
      expect(entry!.op.id).toBe(op.id);
    });

    it('should return undefined for non-existent ID', async () => {
      const entry = await service.getOpById('non-existent-id');

      expect(entry).toBeUndefined();
    });
  });

  describe('markApplied', () => {
    it('should update applicationStatus from pending to applied', async () => {
      const op = createTestOperation();
      const seq = await service.append(op, 'remote', { pendingApply: true });

      const before = await service.getOpsAfterSeq(0);
      expect(before[0].applicationStatus).toBe('pending');

      await service.markApplied([seq]);

      const after = await service.getOpsAfterSeq(0);
      expect(after[0].applicationStatus).toBe('applied');
    });

    it('should not change status if not pending', async () => {
      const op = createTestOperation();
      const seq = await service.append(op, 'remote'); // Not pending

      await service.markApplied([seq]);

      const after = await service.getOpsAfterSeq(0);
      expect(after[0].applicationStatus).toBe('applied'); // Was already applied
    });

    it('should handle empty array', async () => {
      await service.markApplied([]);
      // Should not throw
    });

    // =========================================================================
    // Regression test: markApplied should handle both 'pending' and 'failed' status
    // =========================================================================
    // When retryFailedRemoteOps() successfully applies a failed op, it calls
    // markApplied() to clear it. markApplied() must handle both 'pending' and
    // 'failed' status transitions to 'applied'.

    it('should update applicationStatus from failed to applied', async () => {
      // Create an op and mark it as pending
      const op = createTestOperation();
      const seq = await service.append(op, 'remote', { pendingApply: true });

      // Mark it as failed (simulating a failed application attempt)
      await service.markFailed([op.id]);

      // Verify it's now in 'failed' status
      const afterFail = await service.getOpsAfterSeq(0);
      expect(afterFail[0].applicationStatus).toBe('failed');

      // Now try to mark it as applied (simulating a successful retry)
      await service.markApplied([seq]);

      // The status should transition from 'failed' to 'applied'
      const afterMarkApplied = await service.getOpsAfterSeq(0);
      expect(afterMarkApplied[0].applicationStatus).toBe('applied');
    });

    it('should remove failed ops from getFailedRemoteOps after markApplied is called', async () => {
      // Create an op and mark it as pending
      const op = createTestOperation();
      await service.append(op, 'remote', { pendingApply: true });

      // Mark it as failed
      await service.markFailed([op.id]);

      // Verify it appears in failed ops
      const failedBefore = await service.getFailedRemoteOps();
      expect(failedBefore.length).toBe(1);

      // Get the seq from failed ops
      const seq = failedBefore[0].seq;

      // Call markApplied (simulating successful retry)
      await service.markApplied([seq]);

      // The op should no longer appear in failed ops
      const failedAfter = await service.getFailedRemoteOps();
      expect(failedAfter.length).toBe(0);
    });
  });

  describe('getPendingRemoteOps', () => {
    it('should return only pending remote operations', async () => {
      const localOp = createTestOperation({ entityId: 'local' });
      const remoteApplied = createTestOperation({ entityId: 'applied' });
      const remotePending = createTestOperation({ entityId: 'pending' });

      await service.append(localOp, 'local');
      await service.append(remoteApplied, 'remote'); // applied by default
      await service.append(remotePending, 'remote', { pendingApply: true });

      const pending = await service.getPendingRemoteOps();

      expect(pending.length).toBe(1);
      expect(pending[0].op.entityId).toBe('pending');
    });

    it('should return empty array when no pending ops', async () => {
      const op = createTestOperation();
      await service.append(op, 'remote');

      const pending = await service.getPendingRemoteOps();

      expect(pending.length).toBe(0);
    });
  });

  describe('markFailed', () => {
    it('should increment retry count', async () => {
      const op = createTestOperation();
      await service.append(op, 'remote', { pendingApply: true });

      await service.markFailed([op.id]);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].retryCount).toBe(1);
      expect(ops[0].applicationStatus).toBe('failed');
    });

    it('should increment retry count on subsequent failures', async () => {
      const op = createTestOperation();
      await service.append(op, 'remote', { pendingApply: true });

      await service.markFailed([op.id]);
      await service.markFailed([op.id]);
      await service.markFailed([op.id]);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].retryCount).toBe(3);
    });

    it('should mark as rejected when max retries reached', async () => {
      const op = createTestOperation();
      await service.append(op, 'remote', { pendingApply: true });

      await service.markFailed([op.id], 3); // maxRetries = 3
      await service.markFailed([op.id], 3);
      await service.markFailed([op.id], 3); // 3rd failure = rejected

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].rejectedAt).toBeDefined();
      expect(ops[0].applicationStatus).toBeUndefined();
    });

    it('should handle empty array', async () => {
      await service.markFailed([]);
      // Should not throw
    });
  });

  describe('getFailedRemoteOps', () => {
    it('should return only failed remote operations', async () => {
      const pending = createTestOperation({ entityId: 'pending' });
      const failed = createTestOperation({ entityId: 'failed' });
      const rejected = createTestOperation({ entityId: 'rejected' });

      await service.append(pending, 'remote', { pendingApply: true });
      await service.append(failed, 'remote', { pendingApply: true });
      await service.append(rejected, 'remote', { pendingApply: true });

      await service.markFailed([failed.id]);
      await service.markRejected([rejected.id]);

      const failedOps = await service.getFailedRemoteOps();

      expect(failedOps.length).toBe(1);
      expect(failedOps[0].op.entityId).toBe('failed');
    });

    it('should return empty array when no failed ops', async () => {
      const op = createTestOperation();
      await service.append(op, 'remote');

      const failed = await service.getFailedRemoteOps();

      expect(failed.length).toBe(0);
    });
  });

  describe('crash recovery scenarios', () => {
    it('should allow recovering pending ops after simulated crash', async () => {
      // Simulate: ops stored as pending but never marked applied (crash before dispatch)
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });

      await service.appendBatch([op1, op2], 'remote', { pendingApply: true });

      // Simulating "restart" - get pending ops for recovery
      const pending = await service.getPendingRemoteOps();

      expect(pending.length).toBe(2);
      expect(pending.map((p) => p.op.entityId).sort()).toEqual(['task1', 'task2']);
    });

    it('should track partial application progress', async () => {
      const ops = [
        createTestOperation({ entityId: 'task1' }),
        createTestOperation({ entityId: 'task2' }),
        createTestOperation({ entityId: 'task3' }),
      ];

      const seqs = await service.appendBatch(ops, 'remote', { pendingApply: true });

      // Simulate: first op applied, then crash
      await service.markApplied([seqs[0]]);

      const pending = await service.getPendingRemoteOps();

      expect(pending.length).toBe(2);
      expect(pending.map((p) => p.op.entityId).sort()).toEqual(['task2', 'task3']);
    });
  });

  describe('appliedOpIds cache', () => {
    it('should return cached result when no new ops added', async () => {
      const op = createTestOperation();
      await service.append(op);

      // First call builds cache
      const ids1 = await service.getAppliedOpIds();
      // Second call should use cache
      const ids2 = await service.getAppliedOpIds();

      expect(ids1.size).toBe(1);
      expect(ids2.size).toBe(1);
      expect(ids1.has(op.id)).toBe(true);
    });

    it('should invalidate cache when new ops added', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      await service.append(op1);

      const ids1 = await service.getAppliedOpIds();
      expect(ids1.size).toBe(1);

      // Add new op
      const op2 = createTestOperation({ entityId: 'task2' });
      await service.append(op2);

      const ids2 = await service.getAppliedOpIds();
      expect(ids2.size).toBe(2);
      expect(ids2.has(op2.id)).toBe(true);
    });

    it('should incrementally update cache when new ops added', async () => {
      // Build initial cache with 5 ops
      const initialOps = Array.from({ length: 5 }, (_, i) =>
        createTestOperation({ entityId: `task-${i}` }),
      );
      for (const op of initialOps) {
        await service.append(op);
      }

      // First call - builds cache
      const ids1 = await service.getAppliedOpIds();
      expect(ids1.size).toBe(5);

      // Add 2 more ops
      const newOp1 = createTestOperation({ entityId: 'new-task-1' });
      const newOp2 = createTestOperation({ entityId: 'new-task-2' });
      await service.append(newOp1);
      await service.append(newOp2);

      // Second call - should incrementally add only new IDs
      const ids2 = await service.getAppliedOpIds();
      expect(ids2.size).toBe(7);
      expect(ids2.has(newOp1.id)).toBe(true);
      expect(ids2.has(newOp2.id)).toBe(true);

      // All original IDs should still be present
      for (const op of initialOps) {
        expect(ids2.has(op.id)).toBe(true);
      }
    });
  });

  describe('unsynced cache', () => {
    it('should return cached result when no changes', async () => {
      const op = createTestOperation();
      await service.append(op);

      // First call builds cache
      const unsynced1 = await service.getUnsynced();
      // Second call should use cache
      const unsynced2 = await service.getUnsynced();

      expect(unsynced1.length).toBe(1);
      expect(unsynced2.length).toBe(1);
      expect(unsynced1[0].op.id).toBe(op.id);
    });

    it('should incrementally add new unsynced ops to cache', async () => {
      // Build initial cache with 3 ops
      const initialOps = Array.from({ length: 3 }, (_, i) =>
        createTestOperation({ entityId: `task-${i}` }),
      );
      for (const op of initialOps) {
        await service.append(op);
      }

      // First call - builds cache
      const unsynced1 = await service.getUnsynced();
      expect(unsynced1.length).toBe(3);

      // Add 2 more ops
      const newOp1 = createTestOperation({ entityId: 'new-task-1' });
      const newOp2 = createTestOperation({ entityId: 'new-task-2' });
      await service.append(newOp1);
      await service.append(newOp2);

      // Second call - should incrementally add new unsynced ops
      const unsynced2 = await service.getUnsynced();
      expect(unsynced2.length).toBe(5);
    });

    it('should invalidate cache when markSynced is called', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });
      await service.append(op1);
      await service.append(op2);

      // Build cache
      const unsynced1 = await service.getUnsynced();
      expect(unsynced1.length).toBe(2);

      // Mark one as synced
      const ops = await service.getOpsAfterSeq(0);
      await service.markSynced([ops[0].seq]);

      // Cache should be invalidated, returning only the unsynced op
      const unsynced2 = await service.getUnsynced();
      expect(unsynced2.length).toBe(1);
      expect(unsynced2[0].op.id).toBe(op2.id);
    });

    it('should invalidate cache when markRejected is called', async () => {
      const op1 = createTestOperation({ entityId: 'task1' });
      const op2 = createTestOperation({ entityId: 'task2' });
      await service.append(op1);
      await service.append(op2);

      // Build cache
      const unsynced1 = await service.getUnsynced();
      expect(unsynced1.length).toBe(2);

      // Mark one as rejected
      await service.markRejected([op1.id]);

      // Cache should be invalidated, returning only the non-rejected op
      const unsynced2 = await service.getUnsynced();
      expect(unsynced2.length).toBe(1);
      expect(unsynced2[0].op.id).toBe(op2.id);
    });

    it('should not include already synced ops when incrementally updating', async () => {
      // Add initial ops
      const op1 = createTestOperation({ entityId: 'task1' });
      await service.append(op1);

      // Build initial cache
      const unsynced1 = await service.getUnsynced();
      expect(unsynced1.length).toBe(1);

      // Mark as synced - this invalidates the cache
      const ops = await service.getOpsAfterSeq(0);
      await service.markSynced([ops[0].seq]);

      // Add a new unsynced op
      const op2 = createTestOperation({ entityId: 'task2' });
      await service.append(op2);

      // Should only return the new unsynced op
      const unsynced2 = await service.getUnsynced();
      expect(unsynced2.length).toBe(1);
      expect(unsynced2[0].op.id).toBe(op2.id);
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays for markSynced', async () => {
      await service.markSynced([]);
      // Should not throw
    });

    it('should handle empty arrays for markRejected', async () => {
      await service.markRejected([]);
      // Should not throw
    });

    it('should handle deleteOpsWhere with no matches', async () => {
      const op = createTestOperation();
      await service.append(op);

      await service.deleteOpsWhere(() => false);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
    });

    it('should handle very large operations', async () => {
      // Create operation with large payload
      const largePayload: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largePayload[`field${i}`] = 'x'.repeat(100);
      }

      const op = createTestOperation({ payload: largePayload });
      await service.append(op);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.payload).toEqual(largePayload);
    });

    it('should handle operations with special characters in payload', async () => {
      const payload = {
        title: 'Task with "quotes" and \n newlines',
        description: 'Unicode: 日本語 🎉 emoji',
        tags: ['special/chars', 'back\\slash'],
      };

      const op = createTestOperation({ payload });
      await service.append(op);

      const ops = await service.getOpsAfterSeq(0);
      expect(ops[0].op.payload).toEqual(payload);
    });

    it('should preserve operation order in getOpsAfterSeq', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const op = createTestOperation({ entityId: `task-${i}` });
        ids.push(op.id);
        await service.append(op);
      }

      const ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(20);

      // Verify order is preserved
      for (let i = 0; i < ops.length - 1; i++) {
        expect(ops[i].seq).toBeLessThan(ops[i + 1].seq);
      }
    });
  });

  describe('clearAllOperations', () => {
    it('should remove all operations from the log', async () => {
      // Add several operations
      await service.append(createTestOperation({ entityId: 'task1' }));
      await service.append(createTestOperation({ entityId: 'task2' }));
      await service.append(createTestOperation({ entityId: 'task3' }));

      // Verify they exist
      let ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(3);

      // Clear all operations
      await service.clearAllOperations();

      // Verify they are gone
      ops = await service.getOpsAfterSeq(0);
      expect(ops.length).toBe(0);
    });

    it('should reset lastSeq to 0 after clearing', async () => {
      await service.append(createTestOperation());
      await service.append(createTestOperation());

      const seqBefore = await service.getLastSeq();
      expect(seqBefore).toBeGreaterThan(0);

      await service.clearAllOperations();

      const seqAfter = await service.getLastSeq();
      expect(seqAfter).toBe(0);
    });

    it('should invalidate caches after clearing', async () => {
      // Add operations and build caches
      await service.append(createTestOperation({ entityId: 'task1' }));
      await service.getAppliedOpIds(); // Build appliedOpIds cache
      await service.getUnsynced(); // Build unsynced cache

      // Clear all operations
      await service.clearAllOperations();

      // Subsequent calls should return empty results (not stale cached data)
      const appliedOpIds = await service.getAppliedOpIds();
      expect(appliedOpIds.size).toBe(0);

      const unsynced = await service.getUnsynced();
      expect(unsynced.length).toBe(0);
    });

    it('should not affect state_cache', async () => {
      // Save a state cache
      const stateCache = {
        state: { test: 'data' },
        lastAppliedOpSeq: 5,
        vectorClock: { client1: 5 } as VectorClock,
        compactedAt: Date.now(),
      };
      await service.saveStateCache(stateCache);

      // Add operations
      await service.append(createTestOperation());

      // Clear operations
      await service.clearAllOperations();

      // State cache should still exist
      const loadedCache = await service.loadStateCache();
      expect(loadedCache).not.toBeNull();
      expect(loadedCache?.state).toEqual({ test: 'data' });
    });
  });
});
