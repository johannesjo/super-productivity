import { generateCaptureId, simpleHash } from './operation-capture.util';
import { PersistentAction } from '../persistent-action.interface';
import { EntityType, OpType } from '../operation.types';

describe('operation-capture.util', () => {
  describe('simpleHash', () => {
    it('should return consistent hash for same input', () => {
      const input = 'test string';
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = simpleHash('input1');
      const hash2 = simpleHash('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return base-36 encoded string', () => {
      const hash = simpleHash('test');

      // Base-36 uses 0-9 and a-z
      expect(hash).toMatch(/^[0-9a-z]+$/);
    });

    it('should handle empty string', () => {
      const hash = simpleHash('');

      expect(hash).toBe('0');
    });

    it('should handle unicode characters', () => {
      const hash = simpleHash('日本語 🎉 emoji');

      expect(hash).toMatch(/^[0-9a-z]+$/);
    });

    it('should handle very long strings', () => {
      const longString = 'x'.repeat(10000);
      const hash = simpleHash(longString);

      expect(hash).toMatch(/^[0-9a-z]+$/);
    });

    it('should produce different hashes for similar strings', () => {
      const hash1 = simpleHash('abc');
      const hash2 = simpleHash('abd');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateCaptureId', () => {
    const createMockAction = (
      overrides: Partial<PersistentAction> = {},
    ): PersistentAction =>
      ({
        type: '[TaskShared] Update Task',
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'task-123',
          opType: OpType.Update,
        },
        ...overrides,
      }) as PersistentAction;

    it('should include action type in capture ID', () => {
      const action = createMockAction({ type: '[Custom] Action Type' });
      const captureId = generateCaptureId(action);

      expect(captureId).toContain('[Custom] Action Type');
    });

    it('should include entityId in capture ID', () => {
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'unique-entity-id',
          opType: OpType.Update,
        },
      });
      const captureId = generateCaptureId(action);

      expect(captureId).toContain('unique-entity-id');
    });

    it('should include entityIds joined by comma for bulk actions', () => {
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityIds: ['task-1', 'task-2', 'task-3'],
          opType: OpType.Update,
          isBulk: true,
        },
      });
      const captureId = generateCaptureId(action);

      expect(captureId).toContain('task-1,task-2,task-3');
    });

    it('should use "no-id" when no entityId or entityIds present', () => {
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'GLOBAL_CONFIG' as EntityType,
          opType: OpType.Update,
        },
      });
      const captureId = generateCaptureId(action);

      expect(captureId).toContain('no-id');
    });

    it('should generate consistent ID for same action', () => {
      const action = createMockAction();
      const captureId1 = generateCaptureId(action);
      const captureId2 = generateCaptureId(action);

      expect(captureId1).toBe(captureId2);
    });

    it('should generate different IDs for different actions', () => {
      const action1 = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'task-1',
          opType: OpType.Update,
        },
      });
      const action2 = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'task-2',
          opType: OpType.Update,
        },
      });

      const captureId1 = generateCaptureId(action1);
      const captureId2 = generateCaptureId(action2);

      expect(captureId1).not.toBe(captureId2);
    });

    it('should generate different IDs for same entityId with different payloads', () => {
      const action1 = createMockAction({
        task: { id: 'task-1', changes: { title: 'Title A' } },
      } as Partial<PersistentAction>);
      const action2 = createMockAction({
        task: { id: 'task-1', changes: { title: 'Title B' } },
      } as Partial<PersistentAction>);

      const captureId1 = generateCaptureId(action1);
      const captureId2 = generateCaptureId(action2);

      expect(captureId1).not.toBe(captureId2);
    });

    it('should have format: type:entityKey:hash', () => {
      const action = createMockAction();
      const captureId = generateCaptureId(action);

      const parts = captureId.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('[TaskShared] Update Task');
      expect(parts[1]).toBe('task-123');
      expect(parts[2]).toMatch(/^[0-9a-z]+$/); // hash
    });

    it('should prefer entityId over entityIds when both present', () => {
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'single-id',
          entityIds: ['bulk-1', 'bulk-2'],
          opType: OpType.Update,
        },
      });
      const captureId = generateCaptureId(action);

      expect(captureId).toContain('single-id');
      expect(captureId).not.toContain('bulk-1');
    });
  });
});
