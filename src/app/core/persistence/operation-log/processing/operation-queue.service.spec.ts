/* eslint-disable @typescript-eslint/naming-convention */
import { OperationQueueService, QueuedOperation } from './operation-queue.service';
import { EntityChange, OpType } from '../operation.types';

describe('OperationQueueService', () => {
  let service: OperationQueueService;

  const createMockEntityChange = (
    overrides: Partial<EntityChange> = {},
  ): EntityChange => ({
    entityType: 'TASK',
    entityId: 'task-1',
    opType: OpType.Update,
    changes: { title: 'Updated' },
    ...overrides,
  });

  beforeEach(() => {
    service = new OperationQueueService();
  });

  afterEach(() => {
    service.clear();
  });

  describe('enqueue', () => {
    it('should add operation to queue', () => {
      const captureId = 'test-capture-id';
      const entityChanges = [createMockEntityChange()];

      service.enqueue(captureId, entityChanges);

      expect(service.has(captureId)).toBe(true);
      expect(service.getQueueSize()).toBe(1);
    });

    it('should store multiple operations with different captureIds', () => {
      service.enqueue('capture-1', [createMockEntityChange({ entityId: 'task-1' })]);
      service.enqueue('capture-2', [createMockEntityChange({ entityId: 'task-2' })]);

      expect(service.getQueueSize()).toBe(2);
      expect(service.has('capture-1')).toBe(true);
      expect(service.has('capture-2')).toBe(true);
    });

    it('should overwrite existing entry with same captureId', () => {
      const captureId = 'same-id';
      const changes1 = [createMockEntityChange({ entityId: 'task-1' })];
      const changes2 = [createMockEntityChange({ entityId: 'task-2' })];

      service.enqueue(captureId, changes1);
      service.enqueue(captureId, changes2);

      expect(service.getQueueSize()).toBe(1);
      const dequeued = service.dequeue(captureId);
      expect(dequeued[0].entityId).toBe('task-2');
    });

    it('should handle empty entity changes array', () => {
      service.enqueue('empty-changes', []);

      expect(service.has('empty-changes')).toBe(true);
      const dequeued = service.dequeue('empty-changes');
      expect(dequeued).toEqual([]);
    });

    it('should handle multiple entity changes in single enqueue', () => {
      const changes = [
        createMockEntityChange({ entityId: 'task-1', entityType: 'TASK' }),
        createMockEntityChange({ entityId: 'tag-1', entityType: 'TAG' }),
        createMockEntityChange({ entityId: 'proj-1', entityType: 'PROJECT' }),
      ];

      service.enqueue('multi-change', changes);

      const dequeued = service.dequeue('multi-change');
      expect(dequeued.length).toBe(3);
    });
  });

  describe('dequeue', () => {
    it('should return entity changes and remove from queue', () => {
      const captureId = 'test-capture';
      const entityChanges = [createMockEntityChange()];

      service.enqueue(captureId, entityChanges);
      const result = service.dequeue(captureId);

      expect(result).toEqual(entityChanges);
      expect(service.has(captureId)).toBe(false);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return empty array for non-existent captureId', () => {
      const result = service.dequeue('non-existent');

      expect(result).toEqual([]);
    });

    it('should only dequeue once (subsequent calls return empty)', () => {
      const captureId = 'single-use';
      service.enqueue(captureId, [createMockEntityChange()]);

      const first = service.dequeue(captureId);
      const second = service.dequeue(captureId);

      expect(first.length).toBe(1);
      expect(second).toEqual([]);
    });

    it('should dequeue correct operation when multiple exist', () => {
      service.enqueue('capture-1', [createMockEntityChange({ entityId: 'task-1' })]);
      service.enqueue('capture-2', [createMockEntityChange({ entityId: 'task-2' })]);
      service.enqueue('capture-3', [createMockEntityChange({ entityId: 'task-3' })]);

      const result = service.dequeue('capture-2');

      expect(result[0].entityId).toBe('task-2');
      expect(service.getQueueSize()).toBe(2);
      expect(service.has('capture-1')).toBe(true);
      expect(service.has('capture-3')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for existing captureId', () => {
      service.enqueue('exists', []);
      expect(service.has('exists')).toBe(true);
    });

    it('should return false for non-existing captureId', () => {
      expect(service.has('not-exists')).toBe(false);
    });

    it('should return false after dequeue', () => {
      service.enqueue('was-here', []);
      service.dequeue('was-here');
      expect(service.has('was-here')).toBe(false);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return correct count after enqueues', () => {
      service.enqueue('a', []);
      service.enqueue('b', []);
      service.enqueue('c', []);

      expect(service.getQueueSize()).toBe(3);
    });

    it('should decrement after dequeue', () => {
      service.enqueue('a', []);
      service.enqueue('b', []);

      service.dequeue('a');

      expect(service.getQueueSize()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all queued operations', () => {
      service.enqueue('a', []);
      service.enqueue('b', []);
      service.enqueue('c', []);

      service.clear();

      expect(service.getQueueSize()).toBe(0);
      expect(service.has('a')).toBe(false);
      expect(service.has('b')).toBe(false);
      expect(service.has('c')).toBe(false);
    });

    it('should be safe to call on empty queue', () => {
      expect(() => service.clear()).not.toThrow();
    });
  });

  describe('stale cleanup', () => {
    it('should cleanup stale entries on enqueue', () => {
      // Access private property for testing - we need to simulate stale entries
      const internalQueue = (service as any).queue as Map<string, QueuedOperation>;

      // Add a stale entry (6 seconds old)
      internalQueue.set('stale-entry', {
        captureId: 'stale-entry',
        entityChanges: [],
        queuedAt: Date.now() - 6000,
      });

      // Add a fresh entry (should trigger cleanup)
      service.enqueue('fresh-entry', []);

      expect(service.has('stale-entry')).toBe(false);
      expect(service.has('fresh-entry')).toBe(true);
    });

    it('should keep entries within MAX_QUEUE_AGE_MS', () => {
      const internalQueue = (service as any).queue as Map<string, QueuedOperation>;

      // Add entry that's 4 seconds old (within 5 second limit)
      internalQueue.set('recent-entry', {
        captureId: 'recent-entry',
        entityChanges: [],
        queuedAt: Date.now() - 4000,
      });

      // Trigger cleanup via enqueue
      service.enqueue('trigger', []);

      expect(service.has('recent-entry')).toBe(true);
    });

    it('should cleanup multiple stale entries', () => {
      const internalQueue = (service as any).queue as Map<string, QueuedOperation>;

      // Add multiple stale entries
      internalQueue.set('stale-1', {
        captureId: 'stale-1',
        entityChanges: [],
        queuedAt: Date.now() - 10000,
      });
      internalQueue.set('stale-2', {
        captureId: 'stale-2',
        entityChanges: [],
        queuedAt: Date.now() - 8000,
      });
      internalQueue.set('stale-3', {
        captureId: 'stale-3',
        entityChanges: [],
        queuedAt: Date.now() - 6000,
      });

      // Trigger cleanup
      service.enqueue('fresh', []);

      expect(service.has('stale-1')).toBe(false);
      expect(service.has('stale-2')).toBe(false);
      expect(service.has('stale-3')).toBe(false);
      expect(service.has('fresh')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in captureId', () => {
      const specialId = '[TaskShared] Update Task:task-1,task-2:abc123';
      service.enqueue(specialId, [createMockEntityChange()]);

      expect(service.has(specialId)).toBe(true);
      const result = service.dequeue(specialId);
      expect(result.length).toBe(1);
    });

    it('should handle very long captureIds', () => {
      const longId = 'a'.repeat(1000);
      service.enqueue(longId, [createMockEntityChange()]);

      expect(service.has(longId)).toBe(true);
    });

    it('should handle entity changes with complex nested objects', () => {
      const complexChanges: EntityChange[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          opType: OpType.Update,
          changes: {
            timeSpentOnDay: { '2024-01-01': 3600, '2024-01-02': 1800 },
            tagIds: ['tag-1', 'tag-2', 'tag-3'],
            nested: { deep: { value: 42 } },
          },
        },
      ];

      service.enqueue('complex', complexChanges);
      const result = service.dequeue('complex');

      expect(result).toEqual(complexChanges);
    });

    it('should handle rapid enqueue/dequeue cycles', () => {
      for (let i = 0; i < 100; i++) {
        service.enqueue(`rapid-${i}`, [
          createMockEntityChange({ entityId: `task-${i}` }),
        ]);
        const result = service.dequeue(`rapid-${i}`);
        expect(result[0].entityId).toBe(`task-${i}`);
      }

      expect(service.getQueueSize()).toBe(0);
    });
  });
});
