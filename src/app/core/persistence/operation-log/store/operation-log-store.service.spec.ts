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
});
