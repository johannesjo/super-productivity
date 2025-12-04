import { validateOperationPayload } from './validate-operation-payload';
import { Operation, OpType, EntityType } from '../operation.types';

describe('validateOperationPayload', () => {
  const createTestOperation = (overrides: Partial<Operation> = {}): Operation => ({
    id: 'opId123',
    actionType: '[Task] Update',
    opType: OpType.Update,
    entityType: 'TASK' as EntityType,
    entityId: 'task1',
    payload: { task: { id: 'task1', title: 'Test' } },
    clientId: 'testClient',
    vectorClock: { testClient: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });

  describe('basic structural validation', () => {
    it('should reject null payload', () => {
      const op = createTestOperation({
        payload: null as unknown as Record<string, unknown>,
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
      expect(result.error).toContain('null');
    });

    it('should reject undefined payload', () => {
      const op = createTestOperation({
        payload: undefined as unknown as Record<string, unknown>,
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
      expect(result.error).toContain('null');
    });

    it('should reject non-object payload', () => {
      const op = createTestOperation({
        payload: 'string' as unknown as Record<string, unknown>,
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
      expect(result.error).toContain('object');
    });
  });

  describe('CREATE operation', () => {
    it('should validate CREATE with valid entity', () => {
      const op = createTestOperation({
        opType: OpType.Create,
        entityType: 'TASK' as EntityType,
        payload: { task: { id: 'newTask', title: 'New Task' } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should reject CREATE with entity missing id', () => {
      const op = createTestOperation({
        opType: OpType.Create,
        entityType: 'TASK' as EntityType,
        payload: { task: { title: 'No ID Task' } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
      expect(result.error).toContain('id');
    });

    it('should warn for CREATE with missing entity', () => {
      const op = createTestOperation({
        opType: OpType.Create,
        entityType: 'TASK' as EntityType,
        payload: { someOtherKey: 'value' },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should validate CREATE for PROJECT entity', () => {
      const op = createTestOperation({
        opType: OpType.Create,
        entityType: 'PROJECT' as EntityType,
        payload: { project: { id: 'proj1', title: 'Project' } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate CREATE for NOTE entity', () => {
      const op = createTestOperation({
        opType: OpType.Create,
        entityType: 'NOTE' as EntityType,
        payload: { note: { id: 'note1', content: 'Content' } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });
  });

  describe('UPDATE operation', () => {
    it('should validate UPDATE with nested entity shape', () => {
      const op = createTestOperation({
        opType: OpType.Update,
        entityType: 'TASK' as EntityType,
        payload: { task: { id: 'task1', changes: { title: 'Updated' } } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate UPDATE with direct id shape', () => {
      const op = createTestOperation({
        opType: OpType.Update,
        entityType: 'TASK' as EntityType,
        payload: { id: 'task1', changes: { title: 'Updated' } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate UPDATE with batch shape (tasks array)', () => {
      const op = createTestOperation({
        opType: OpType.Update,
        entityType: 'TASK' as EntityType,
        payload: { tasks: [{ id: 'task1' }, { id: 'task2' }] },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate UPDATE with full entity in nested key', () => {
      const op = createTestOperation({
        opType: OpType.Update,
        entityType: 'TASK' as EntityType,
        payload: { task: { id: 'task1', title: 'Full Task' } },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should allow unusual UPDATE structure with warning', () => {
      const op = createTestOperation({
        opType: OpType.Update,
        entityType: 'TASK' as EntityType,
        payload: { unusualKey: 'value' },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE operation', () => {
    it('should validate DELETE with entityId on operation', () => {
      const op = createTestOperation({
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: 'task1',
        payload: {},
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate DELETE with entityIds array', () => {
      const op = createTestOperation({
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: undefined,
        entityIds: ['task1', 'task2'],
        payload: {},
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should reject DELETE with non-string entityIds', () => {
      const op = createTestOperation({
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: undefined,
        entityIds: ['task1', 123 as unknown as string],
        payload: {},
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
      expect(result.error).toContain('strings');
    });

    it('should validate DELETE with taskIds in payload', () => {
      const op = createTestOperation({
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: undefined,
        payload: { taskIds: ['task1', 'task2'] },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should allow DELETE with missing ids but with warning', () => {
      const op = createTestOperation({
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: undefined,
        entityIds: undefined,
        payload: {},
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('MOVE operation', () => {
    it('should validate MOVE with entityIds on operation', () => {
      const op = createTestOperation({
        opType: OpType.Move,
        entityType: 'TASK' as EntityType,
        entityIds: ['task1', 'task2', 'task3'],
        payload: {},
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate MOVE with ids in payload', () => {
      const op = createTestOperation({
        opType: OpType.Move,
        entityType: 'TASK' as EntityType,
        payload: { ids: ['task1', 'task2'] },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate MOVE with taskIds in payload', () => {
      const op = createTestOperation({
        opType: OpType.Move,
        entityType: 'TASK' as EntityType,
        payload: { taskIds: ['task1', 'task2'] },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should allow MOVE with missing ids but with warning', () => {
      const op = createTestOperation({
        opType: OpType.Move,
        entityType: 'TASK' as EntityType,
        payload: { noIdsHere: true },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('BATCH operation', () => {
    it('should validate BATCH with non-empty payload', () => {
      const op = createTestOperation({
        opType: OpType.Batch,
        payload: { tasks: [{ id: 'task1' }], updates: [] },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should reject BATCH with empty payload', () => {
      const op = createTestOperation({
        opType: OpType.Batch,
        payload: {},
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('SYNC_IMPORT/BACKUP_IMPORT operations', () => {
    it('should validate SYNC_IMPORT with appDataComplete', () => {
      const op = createTestOperation({
        opType: OpType.SyncImport,
        entityType: 'GLOBAL_CONFIG' as EntityType,
        payload: {
          appDataComplete: {
            task: { ids: [], entities: {} },
            project: { ids: [], entities: {} },
          },
        },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should validate BACKUP_IMPORT with direct data structure', () => {
      const op = createTestOperation({
        opType: OpType.BackupImport,
        entityType: 'GLOBAL_CONFIG' as EntityType,
        payload: {
          task: { ids: [], entities: {} },
          project: { ids: [], entities: {} },
          globalConfig: {},
        },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });

    it('should reject SYNC_IMPORT without expected keys', () => {
      const op = createTestOperation({
        opType: OpType.SyncImport,
        entityType: 'GLOBAL_CONFIG' as EntityType,
        payload: { randomData: 'value' },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(false);
    });
  });

  describe('REPAIR operation', () => {
    it('should always validate REPAIR operations', () => {
      const op = createTestOperation({
        opType: OpType.Repair,
        payload: { anyPayload: 'isAllowed' },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });
  });

  describe('unknown operation type', () => {
    it('should allow unknown opType through', () => {
      const op = createTestOperation({
        opType: 'UNKNOWN_TYPE' as OpType,
        payload: { someData: true },
      });
      const result = validateOperationPayload(op);
      expect(result.success).toBe(true);
    });
  });
});
