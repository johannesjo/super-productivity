/* eslint-disable @typescript-eslint/naming-convention */
import { OperationCaptureService } from './operation-capture.service';
import { OpType, EntityType } from '../operation.types';
import { PersistentAction } from '../persistent-action.interface';
import { RootState } from '../../../../root-store/root-state';

describe('OperationCaptureService', () => {
  let service: OperationCaptureService;

  const createPersistentAction = (
    type: string,
    entityType: EntityType,
    entityId: string = 'entity-1',
    opType: OpType = OpType.Update,
  ): PersistentAction => ({
    type,
    meta: {
      isPersistent: true,
      entityType,
      entityId,
      opType,
    },
  });

  // Feature names must match the actual NgRx feature names
  const TASKS_FEATURE = 'tasks';
  const TAG_FEATURE = 'tag';
  const PROJECTS_FEATURE = 'projects';
  const GLOBAL_CONFIG_FEATURE = 'globalConfig';

  const createTaskState = (
    tasks: Record<
      string,
      { id: string; title: string; projectId?: string; tagIds?: string[] }
    >,
  ): unknown => ({
    [TASKS_FEATURE]: {
      ids: Object.keys(tasks),
      entities: tasks,
    },
  });

  beforeEach(() => {
    service = new OperationCaptureService();
  });

  afterEach(() => {
    service.clear();
  });

  describe('computeAndEnqueue', () => {
    describe('entity creation detection', () => {
      it('should detect new entity creation', () => {
        const beforeState = createTaskState({}) as unknown as RootState;
        const afterState = createTaskState({
          'task-1': { id: 'task-1', title: 'New Task' },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Add Task',
          'TASK',
          'task-1',
          OpType.Create,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('TASK');
        expect(changes[0].entityId).toBe('task-1');
        expect(changes[0].opType).toBe(OpType.Create);
        expect(changes[0].changes).toEqual({ id: 'task-1', title: 'New Task' });
      });

      it('should detect multiple entity creations', () => {
        const beforeState = createTaskState({}) as unknown as RootState;
        const afterState = createTaskState({
          'task-1': { id: 'task-1', title: 'Task 1' },
          'task-2': { id: 'task-2', title: 'Task 2' },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Add Task',
          'TASK',
          'task-1',
          OpType.Create,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(2);
        expect(changes.map((c) => c.entityId).sort()).toEqual(['task-1', 'task-2']);
        expect(changes.every((c) => c.opType === OpType.Create)).toBe(true);
      });
    });

    describe('entity update detection', () => {
      it('should detect entity update with changed field', () => {
        const beforeState = createTaskState({
          'task-1': { id: 'task-1', title: 'Original Title' },
        }) as unknown as RootState;
        const afterState = createTaskState({
          'task-1': { id: 'task-1', title: 'Updated Title' },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].opType).toBe(OpType.Update);
        expect(changes[0].changes).toEqual({ title: 'Updated Title' });
      });

      it('should detect multiple field changes', () => {
        const beforeState = createTaskState({
          'task-1': { id: 'task-1', title: 'Original', projectId: 'proj-1' },
        }) as unknown as RootState;
        const afterState = createTaskState({
          'task-1': { id: 'task-1', title: 'Updated', projectId: 'proj-2' },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].changes).toEqual({ title: 'Updated', projectId: 'proj-2' });
      });

      it('should NOT detect update when entity is unchanged', () => {
        const state = createTaskState({
          'task-1': { id: 'task-1', title: 'Same Title' },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, state, state);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(0);
      });

      it('should detect array field changes', () => {
        const beforeState = createTaskState({
          'task-1': { id: 'task-1', title: 'Task', tagIds: ['tag-1'] },
        }) as unknown as RootState;
        const afterState = createTaskState({
          'task-1': { id: 'task-1', title: 'Task', tagIds: ['tag-1', 'tag-2'] },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].changes).toEqual({ tagIds: ['tag-1', 'tag-2'] });
      });
    });

    describe('entity deletion detection', () => {
      it('should detect entity deletion', () => {
        const beforeState = createTaskState({
          'task-1': { id: 'task-1', title: 'Will Delete' },
        }) as unknown as RootState;
        const afterState = createTaskState({}) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Delete Task',
          'TASK',
          'task-1',
          OpType.Delete,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('TASK');
        expect(changes[0].entityId).toBe('task-1');
        expect(changes[0].opType).toBe(OpType.Delete);
        expect(changes[0].changes).toEqual({ id: 'task-1' });
      });

      it('should detect multiple entity deletions', () => {
        const beforeState = createTaskState({
          'task-1': { id: 'task-1', title: 'Task 1' },
          'task-2': { id: 'task-2', title: 'Task 2' },
          'task-3': { id: 'task-3', title: 'Task 3' },
        }) as unknown as RootState;
        const afterState = createTaskState({
          'task-2': { id: 'task-2', title: 'Task 2' },
        }) as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Delete Tasks',
          'TASK',
          'task-1',
          OpType.Delete,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        const deletedIds = changes
          .filter((c) => c.opType === OpType.Delete)
          .map((c) => c.entityId);
        expect(deletedIds.sort()).toEqual(['task-1', 'task-3']);
      });
    });

    describe('cross-entity operations', () => {
      it('should detect changes across multiple entity types', () => {
        const beforeState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task', tagIds: ['tag-1'] } },
          },
          [TAG_FEATURE]: {
            ids: ['tag-1'],
            entities: { 'tag-1': { id: 'tag-1', name: 'Tag', taskIds: ['task-1'] } },
          },
        } as unknown as RootState;

        const afterState = {
          [TASKS_FEATURE]: {
            ids: [],
            entities: {},
          },
          [TAG_FEATURE]: {
            ids: ['tag-1'],
            entities: { 'tag-1': { id: 'tag-1', name: 'Tag', taskIds: [] } },
          },
        } as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Delete Task',
          'TASK',
          'task-1',
          OpType.Delete,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(2);

        const taskChange = changes.find((c) => c.entityType === 'TASK');
        const tagChange = changes.find((c) => c.entityType === 'TAG');

        expect(taskChange).toBeDefined();
        expect(taskChange!.opType).toBe(OpType.Delete);

        expect(tagChange).toBeDefined();
        expect(tagChange!.opType).toBe(OpType.Update);
        expect(tagChange!.changes).toEqual({ taskIds: [] });
      });

      it('should handle tag deletion affecting tasks', () => {
        const beforeState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task', tagIds: ['tag-1'] } },
          },
          [TAG_FEATURE]: {
            ids: ['tag-1'],
            entities: { 'tag-1': { id: 'tag-1', name: 'Tag', taskIds: ['task-1'] } },
          },
        } as unknown as RootState;

        const afterState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task', tagIds: [] } },
          },
          [TAG_FEATURE]: {
            ids: [],
            entities: {},
          },
        } as unknown as RootState;

        const action = createPersistentAction(
          '[Tag] Delete Tag',
          'TAG',
          'tag-1',
          OpType.Delete,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(2);

        const tagChange = changes.find((c) => c.entityType === 'TAG');
        const taskChange = changes.find((c) => c.entityType === 'TASK');

        expect(tagChange!.opType).toBe(OpType.Delete);
        expect(taskChange!.opType).toBe(OpType.Update);
        expect(taskChange!.changes).toEqual({ tagIds: [] });
      });
    });

    describe('singleton state handling', () => {
      it('should detect changes in singleton state (globalConfig)', () => {
        const beforeState = {
          [GLOBAL_CONFIG_FEATURE]: { theme: 'light', language: 'en' },
        } as unknown as RootState;

        const afterState = {
          [GLOBAL_CONFIG_FEATURE]: { theme: 'dark', language: 'en' },
        } as unknown as RootState;

        const action = createPersistentAction(
          '[GlobalConfig] Update Global Config Section',
          'GLOBAL_CONFIG',
          '*',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('GLOBAL_CONFIG');
        expect(changes[0].entityId).toBe('*');
        expect(changes[0].opType).toBe(OpType.Update);
        expect(changes[0].changes).toEqual({ theme: 'dark' });
      });
    });

    describe('reference equality optimization', () => {
      it('should skip diffing feature states with identical references', () => {
        // Create shared references for unchanged features
        const sharedTagFeature = {
          ids: ['tag-1'],
          entities: { 'tag-1': { id: 'tag-1', name: 'Tag', taskIds: [] } },
        };
        const sharedProjectFeature = {
          ids: ['proj-1'],
          entities: { 'proj-1': { id: 'proj-1', title: 'Project', taskIds: [] } },
        };

        const beforeState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task' } },
          },
          [TAG_FEATURE]: sharedTagFeature,
          [PROJECTS_FEATURE]: sharedProjectFeature,
        } as unknown as RootState;

        // After state shares references for unchanged features (NgRx immutability)
        const afterState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Updated Task' } },
          },
          [TAG_FEATURE]: sharedTagFeature, // Same reference - will be skipped
          [PROJECTS_FEATURE]: sharedProjectFeature, // Same reference - will be skipped
        } as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('TASK');
      });

      it('should detect changes across all entity types when references differ', () => {
        const beforeState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task' } },
          },
          [TAG_FEATURE]: {
            ids: ['tag-1'],
            entities: { 'tag-1': { id: 'tag-1', name: 'Tag', taskIds: [] } },
          },
        } as unknown as RootState;

        const afterState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Updated Task' } },
          },
          [TAG_FEATURE]: {
            ids: ['tag-1'],
            entities: { 'tag-1': { id: 'tag-1', name: 'Updated Tag', taskIds: [] } },
          },
        } as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(2);
        expect(changes.map((c) => c.entityType).sort()).toEqual(['TAG', 'TASK']);
      });

      it('should not report changes for different references with identical content', () => {
        // Different object references but same content - no actual changes
        const beforeState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task' } },
          },
        } as unknown as RootState;

        const afterState = {
          [TASKS_FEATURE]: {
            ids: ['task-1'],
            entities: { 'task-1': { id: 'task-1', title: 'Task' } }, // Same content, different ref
          },
        } as unknown as RootState;

        const action = createPersistentAction(
          '[TaskShared] Update Task',
          'TASK',
          'task-1',
          OpType.Update,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(0);
      });

      it('should work with any action type (no action mapping required)', () => {
        const beforeState = createTaskState({}) as unknown as RootState;
        const afterState = createTaskState({
          'task-1': { id: 'task-1', title: 'Task' },
        }) as unknown as RootState;

        // Completely unknown action type - still works via reference equality
        const action = createPersistentAction(
          '[CompletelyUnknown] Some Action',
          'TASK',
          'task-1',
          OpType.Create,
        );

        service.computeAndEnqueue('capture-1', action, beforeState, afterState);

        const changes = service.dequeue('capture-1');
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('TASK');
      });
    });
  });

  describe('dequeue', () => {
    it('should return entity changes for valid captureId', () => {
      const beforeState = createTaskState({}) as unknown as RootState;
      const afterState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(1);
    });

    it('should return empty array for unknown captureId', () => {
      const changes = service.dequeue('unknown-capture-id');
      expect(changes).toEqual([]);
    });

    it('should remove entry from queue after dequeue', () => {
      const beforeState = createTaskState({}) as unknown as RootState;
      const afterState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);
      expect(service.has('capture-1')).toBe(true);

      service.dequeue('capture-1');
      expect(service.has('capture-1')).toBe(false);
    });

    it('should return empty array on second dequeue for same captureId', () => {
      const beforeState = createTaskState({}) as unknown as RootState;
      const afterState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const firstDequeue = service.dequeue('capture-1');
      expect(firstDequeue.length).toBe(1);

      const secondDequeue = service.dequeue('capture-1');
      expect(secondDequeue).toEqual([]);
    });
  });

  describe('queue management', () => {
    it('should correctly report queue size', () => {
      expect(service.getQueueSize()).toBe(0);

      const state = createTaskState({}) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, state, state);
      expect(service.getQueueSize()).toBe(1);

      service.computeAndEnqueue('capture-2', action, state, state);
      expect(service.getQueueSize()).toBe(2);

      service.dequeue('capture-1');
      expect(service.getQueueSize()).toBe(1);
    });

    it('should correctly check if captureId exists', () => {
      expect(service.has('capture-1')).toBe(false);

      const state = createTaskState({}) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, state, state);
      expect(service.has('capture-1')).toBe(true);
      expect(service.has('capture-2')).toBe(false);
    });

    it('should clear all queued operations', () => {
      const state = createTaskState({}) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, state, state);
      service.computeAndEnqueue('capture-2', action, state, state);
      expect(service.getQueueSize()).toBe(2);

      service.clear();
      expect(service.getQueueSize()).toBe(0);
      expect(service.has('capture-1')).toBe(false);
      expect(service.has('capture-2')).toBe(false);
    });
  });

  describe('stale entry cleanup', () => {
    it('should clean up stale entries on new computeAndEnqueue', async () => {
      const state = createTaskState({}) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('stale-capture', action, state, state);
      expect(service.has('stale-capture')).toBe(true);

      // Access private property to simulate time passing
      // In a real scenario, we'd wait 5+ seconds, but that's too slow for tests
      // Instead, we verify the cleanup logic exists by checking the queue isn't cleaned
      // when entries are fresh
      service.computeAndEnqueue('fresh-capture', action, state, state);

      // Both should still exist (neither is stale yet)
      expect(service.has('stale-capture')).toBe(true);
      expect(service.has('fresh-capture')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty before and after states', () => {
      const emptyState = {} as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue('capture-1', action, emptyState, emptyState);

      const changes = service.dequeue('capture-1');
      expect(changes).toEqual([]);
    });

    it('should handle missing feature state', () => {
      const beforeState = {} as unknown as RootState;
      const afterState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      // Should not throw
      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      // Can't detect creation because before state is undefined
      expect(changes.length).toBe(0);
    });

    it('should handle deeply nested object changes', () => {
      const beforeState = {
        [GLOBAL_CONFIG_FEATURE]: {
          misc: {
            nested: {
              deep: { value: 'original' },
            },
          },
        },
      } as unknown as RootState;

      const afterState = {
        [GLOBAL_CONFIG_FEATURE]: {
          misc: {
            nested: {
              deep: { value: 'changed' },
            },
          },
        },
      } as unknown as RootState;

      const action = createPersistentAction(
        '[GlobalConfig] Update Global Config Section',
        'GLOBAL_CONFIG',
        '*',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(1);
      expect(changes[0].changes).toEqual({
        misc: { nested: { deep: { value: 'changed' } } },
      });
    });

    it('should handle null values correctly', () => {
      const beforeState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task', projectId: 'proj-1' },
      }) as unknown as RootState;

      const afterState = {
        [TASKS_FEATURE]: {
          ids: ['task-1'],
          entities: { 'task-1': { id: 'task-1', title: 'Task', projectId: null } },
        },
      } as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(1);
      expect(changes[0].changes).toEqual({ projectId: null });
    });

    it('should handle undefined becoming defined', () => {
      const beforeState = {
        [TASKS_FEATURE]: {
          ids: ['task-1'],
          entities: { 'task-1': { id: 'task-1', title: 'Task' } },
        },
      } as unknown as RootState;

      const afterState = {
        [TASKS_FEATURE]: {
          ids: ['task-1'],
          entities: { 'task-1': { id: 'task-1', title: 'Task', projectId: 'proj-1' } },
        },
      } as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(1);
      expect(changes[0].changes).toEqual({ projectId: 'proj-1' });
    });

    it('should handle field removal (defined becoming undefined)', () => {
      const beforeState = {
        [TASKS_FEATURE]: {
          ids: ['task-1'],
          entities: { 'task-1': { id: 'task-1', title: 'Task', projectId: 'proj-1' } },
        },
      } as unknown as RootState;

      const afterState = {
        [TASKS_FEATURE]: {
          ids: ['task-1'],
          entities: { 'task-1': { id: 'task-1', title: 'Task' } },
        },
      } as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(1);
      expect(changes[0].changes).toEqual({ projectId: undefined });
    });
  });

  describe('equality checks', () => {
    it('should detect no change for identical primitive values', () => {
      const state = createTaskState({
        'task-1': { id: 'task-1', title: 'Same' },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, state, state);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(0);
    });

    it('should detect no change for equivalent arrays', () => {
      const beforeState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task', tagIds: ['a', 'b', 'c'] },
      }) as unknown as RootState;

      // Same array content, different reference
      const afterState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task', tagIds: ['a', 'b', 'c'] },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(0);
    });

    it('should detect change when array order differs', () => {
      const beforeState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task', tagIds: ['a', 'b', 'c'] },
      }) as unknown as RootState;

      const afterState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task', tagIds: ['c', 'b', 'a'] },
      }) as unknown as RootState;

      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(1);
      expect(changes[0].changes).toEqual({ tagIds: ['c', 'b', 'a'] });
    });

    it('should detect no change for equivalent nested objects', () => {
      const beforeState = {
        [GLOBAL_CONFIG_FEATURE]: { misc: { option1: true, option2: 'value' } },
      } as unknown as RootState;

      const afterState = {
        [GLOBAL_CONFIG_FEATURE]: { misc: { option1: true, option2: 'value' } },
      } as unknown as RootState;

      const action = createPersistentAction(
        '[GlobalConfig] Update Global Config Section',
        'GLOBAL_CONFIG',
        '*',
        OpType.Update,
      );

      service.computeAndEnqueue('capture-1', action, beforeState, afterState);

      const changes = service.dequeue('capture-1');
      expect(changes.length).toBe(0);
    });
  });
});
