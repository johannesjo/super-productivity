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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, state, state);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('GLOBAL_CONFIG');
        expect(changes[0].entityId).toBe('*');
        expect(changes[0].opType).toBe(OpType.Update);
        expect(changes[0].changes).toEqual({ theme: 'dark' });
      });
    });

    describe('reference equality optimization', () => {
      describe('entity-level reference equality', () => {
        it('should skip diffing entities with identical references', () => {
          // Simulate NgRx immutable update: only changed entity gets new reference
          const unchangedTask = { id: 'task-1', title: 'Unchanged Task' };
          const unchangedTask2 = { id: 'task-2', title: 'Another Unchanged' };

          const beforeState = {
            [TASKS_FEATURE]: {
              ids: ['task-1', 'task-2', 'task-3'],
              entities: {
                'task-1': unchangedTask,
                'task-2': unchangedTask2,
                'task-3': { id: 'task-3', title: 'Will Change' },
              },
            },
          } as unknown as RootState;

          // After state: task-1 and task-2 keep same reference, task-3 gets new reference
          const afterState = {
            [TASKS_FEATURE]: {
              ids: ['task-1', 'task-2', 'task-3'],
              entities: {
                'task-1': unchangedTask, // Same reference - skip diff
                'task-2': unchangedTask2, // Same reference - skip diff
                'task-3': { id: 'task-3', title: 'Changed Title' }, // New reference - diff this
              },
            },
          } as unknown as RootState;

          const action = createPersistentAction(
            '[TaskShared] Update Task',
            'TASK',
            'task-3',
            OpType.Update,
          );

          service.computeAndEnqueue(action, beforeState, afterState);

          const changes = service.dequeue();
          // Only task-3 should be reported as changed
          expect(changes.length).toBe(1);
          expect(changes[0].entityId).toBe('task-3');
          expect(changes[0].opType).toBe(OpType.Update);
          expect(changes[0].changes).toEqual({ title: 'Changed Title' });
        });

        it('should handle many unchanged entities efficiently via reference equality', () => {
          // Simulate a large state where most entities are unchanged
          const unchangedEntities: Record<string, { id: string; title: string }> = {};
          for (let i = 0; i < 100; i++) {
            unchangedEntities[`task-${i}`] = { id: `task-${i}`, title: `Task ${i}` };
          }

          const beforeState = {
            [TASKS_FEATURE]: {
              ids: Object.keys(unchangedEntities),
              entities: unchangedEntities,
            },
          } as unknown as RootState;

          // After state: all entities keep same reference (no changes at all)
          const afterState = {
            [TASKS_FEATURE]: {
              ids: Object.keys(unchangedEntities),
              entities: unchangedEntities, // Same object reference for entire entities map
            },
          } as unknown as RootState;

          const action = createPersistentAction(
            '[TaskShared] Update Task',
            'TASK',
            'task-50',
            OpType.Update,
          );

          service.computeAndEnqueue(action, beforeState, afterState);

          const changes = service.dequeue();
          // No changes because all entity references are identical
          expect(changes.length).toBe(0);
        });

        it('should detect update when entity has new reference with changed content', () => {
          const originalTask = { id: 'task-1', title: 'Original', tagIds: ['tag-1'] };

          const beforeState = {
            [TASKS_FEATURE]: {
              ids: ['task-1'],
              entities: { 'task-1': originalTask },
            },
          } as unknown as RootState;

          // New reference with different content
          const afterState = {
            [TASKS_FEATURE]: {
              ids: ['task-1'],
              entities: {
                'task-1': { id: 'task-1', title: 'Updated', tagIds: ['tag-1', 'tag-2'] },
              },
            },
          } as unknown as RootState;

          const action = createPersistentAction(
            '[TaskShared] Update Task',
            'TASK',
            'task-1',
            OpType.Update,
          );

          service.computeAndEnqueue(action, beforeState, afterState);

          const changes = service.dequeue();
          expect(changes.length).toBe(1);
          expect(changes[0].changes).toEqual({
            title: 'Updated',
            tagIds: ['tag-1', 'tag-2'],
          });
        });

        it('should report no changes when entity has new reference but identical content', () => {
          // Edge case: different reference but same content (deep equality check still runs)
          const beforeState = {
            [TASKS_FEATURE]: {
              ids: ['task-1'],
              entities: { 'task-1': { id: 'task-1', title: 'Same', tagIds: ['a', 'b'] } },
            },
          } as unknown as RootState;

          // Different reference but identical content
          const afterState = {
            [TASKS_FEATURE]: {
              ids: ['task-1'],
              entities: { 'task-1': { id: 'task-1', title: 'Same', tagIds: ['a', 'b'] } },
            },
          } as unknown as RootState;

          const action = createPersistentAction(
            '[TaskShared] Update Task',
            'TASK',
            'task-1',
            OpType.Update,
          );

          service.computeAndEnqueue(action, beforeState, afterState);

          const changes = service.dequeue();
          // Deep equality check should find no actual changes
          expect(changes.length).toBe(0);
        });

        it('should handle mixed scenario: some entities same reference, some changed', () => {
          const unchangedTask1 = { id: 'task-1', title: 'Unchanged 1' };
          const unchangedTask3 = { id: 'task-3', title: 'Unchanged 3' };

          const beforeState = {
            [TASKS_FEATURE]: {
              ids: ['task-1', 'task-2', 'task-3'],
              entities: {
                'task-1': unchangedTask1,
                'task-2': { id: 'task-2', title: 'Will Change' },
                'task-3': unchangedTask3,
              },
            },
          } as unknown as RootState;

          const afterState = {
            [TASKS_FEATURE]: {
              ids: ['task-1', 'task-2', 'task-3'],
              entities: {
                'task-1': unchangedTask1, // Same reference
                'task-2': { id: 'task-2', title: 'Changed!' }, // New reference, changed
                'task-3': unchangedTask3, // Same reference
              },
            },
          } as unknown as RootState;

          const action = createPersistentAction(
            '[TaskShared] Update Task',
            'TASK',
            'task-2',
            OpType.Update,
          );

          service.computeAndEnqueue(action, beforeState, afterState);

          const changes = service.dequeue();
          expect(changes.length).toBe(1);
          expect(changes[0].entityId).toBe('task-2');
          expect(changes[0].changes).toEqual({ title: 'Changed!' });
        });
      });

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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
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

        service.computeAndEnqueue(action, beforeState, afterState);

        const changes = service.dequeue();
        expect(changes.length).toBe(1);
        expect(changes[0].entityType).toBe('TASK');
      });
    });
  });

  describe('dequeue', () => {
    it('should return entity changes in FIFO order', () => {
      const state1 = createTaskState({}) as unknown as RootState;
      const state2 = createTaskState({
        'task-1': { id: 'task-1', title: 'Task 1' },
      }) as unknown as RootState;
      const state3 = createTaskState({
        'task-1': { id: 'task-1', title: 'Task 1' },
        'task-2': { id: 'task-2', title: 'Task 2' },
      }) as unknown as RootState;

      const action1 = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );
      const action2 = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-2',
        OpType.Create,
      );

      // Enqueue two operations
      service.computeAndEnqueue(action1, state1, state2);
      service.computeAndEnqueue(action2, state2, state3);

      // First dequeue should return first operation's changes
      const firstChanges = service.dequeue();
      expect(firstChanges.length).toBe(1);
      expect(firstChanges[0].entityId).toBe('task-1');

      // Second dequeue should return second operation's changes
      const secondChanges = service.dequeue();
      expect(secondChanges.length).toBe(1);
      expect(secondChanges[0].entityId).toBe('task-2');
    });

    it('should return empty array when queue is empty', () => {
      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);
      expect(service.getQueueSize()).toBe(1);

      service.dequeue();
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return empty array on subsequent dequeue when queue is empty', () => {
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const firstDequeue = service.dequeue();
      expect(firstDequeue.length).toBe(1);

      const secondDequeue = service.dequeue();
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

      service.computeAndEnqueue(action, state, state);
      expect(service.getQueueSize()).toBe(1);

      service.computeAndEnqueue(action, state, state);
      expect(service.getQueueSize()).toBe(2);

      service.dequeue();
      expect(service.getQueueSize()).toBe(1);
    });

    it('should clear all queued operations', () => {
      const state = createTaskState({}) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Add Task',
        'TASK',
        'task-1',
        OpType.Create,
      );

      service.computeAndEnqueue(action, state, state);
      service.computeAndEnqueue(action, state, state);
      expect(service.getQueueSize()).toBe(2);

      service.clear();
      expect(service.getQueueSize()).toBe(0);
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

      service.computeAndEnqueue(action, emptyState, emptyState);

      const changes = service.dequeue();
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
      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, state, state);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
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

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
      expect(changes.length).toBe(0);
    });
  });

  describe('TIME_TRACKING action-payload capture', () => {
    it('should capture syncTimeTracking action from payload (not state diff)', () => {
      const action: PersistentAction = {
        type: '[TimeTracking] Sync sessions',
        contextType: 'TAG',
        contextId: 'tag-123',
        date: '2024-01-15',
        data: { s: 1000, e: 2000, b: 1, bt: 100 },
        meta: {
          isPersistent: true,
          entityType: 'TIME_TRACKING',
          entityId: 'TAG:tag-123:2024-01-15',
          opType: OpType.Update,
        },
      };

      // Empty states - we don't need them because TIME_TRACKING uses action payload
      const emptyState = {} as unknown as RootState;

      service.computeAndEnqueue(action, emptyState, emptyState);

      const changes = service.dequeue();
      expect(changes.length).toBe(1);
      expect(changes[0].entityType).toBe('TIME_TRACKING');
      expect(changes[0].entityId).toBe('TAG:tag-123:2024-01-15');
      expect(changes[0].opType).toBe(OpType.Update);
      expect(changes[0].changes).toEqual({
        contextType: 'TAG',
        contextId: 'tag-123',
        date: '2024-01-15',
        data: { s: 1000, e: 2000, b: 1, bt: 100 },
      });
    });

    it('should capture syncTimeTracking for PROJECT context', () => {
      const action: PersistentAction = {
        type: '[TimeTracking] Sync sessions',
        contextType: 'PROJECT',
        contextId: 'proj-456',
        date: '2024-02-20',
        data: { s: 5000, e: 6000 },
        meta: {
          isPersistent: true,
          entityType: 'TIME_TRACKING',
          entityId: 'PROJECT:proj-456:2024-02-20',
          opType: OpType.Update,
        },
      };

      const emptyState = {} as unknown as RootState;

      service.computeAndEnqueue(action, emptyState, emptyState);

      const changes = service.dequeue();
      expect(changes.length).toBe(1);
      expect(changes[0].entityId).toBe('PROJECT:proj-456:2024-02-20');
      expect(changes[0].changes).toEqual({
        contextType: 'PROJECT',
        contextId: 'proj-456',
        date: '2024-02-20',
        data: { s: 5000, e: 6000 },
      });
    });

    it('should capture updateWorkContextData action from payload', () => {
      const action: PersistentAction = {
        type: '[TimeTracking] Update Work Context Data',
        ctx: { id: 'tag-789', type: 'TAG' },
        date: '2024-03-10',
        updates: { s: 7000, e: 8000 },
        meta: {
          isPersistent: true,
          entityType: 'TIME_TRACKING',
          entityId: 'TAG:tag-789:2024-03-10',
          opType: OpType.Update,
        },
      };

      const emptyState = {} as unknown as RootState;

      service.computeAndEnqueue(action, emptyState, emptyState);

      const changes = service.dequeue();
      expect(changes.length).toBe(1);
      expect(changes[0].entityType).toBe('TIME_TRACKING');
      expect(changes[0].entityId).toBe('TAG:tag-789:2024-03-10');
      expect(changes[0].changes).toEqual({
        ctx: { id: 'tag-789', type: 'TAG' },
        date: '2024-03-10',
        updates: { s: 7000, e: 8000 },
      });
    });

    it('should NOT diff state for TIME_TRACKING actions (ignores state changes)', () => {
      // Even with state changes, TIME_TRACKING should use action payload only
      const TIME_TRACKING_FEATURE = 'timeTracking';
      const beforeState = {
        [TIME_TRACKING_FEATURE]: {
          tag: { 'tag-1': { '2024-01-01': { s: 100, e: 200 } } },
          project: {},
        },
      } as unknown as RootState;

      const afterState = {
        [TIME_TRACKING_FEATURE]: {
          tag: { 'tag-1': { '2024-01-01': { s: 999, e: 9999 } } },
          project: {},
        },
      } as unknown as RootState;

      const action: PersistentAction = {
        type: '[TimeTracking] Sync sessions',
        contextType: 'TAG',
        contextId: 'tag-1',
        date: '2024-01-01',
        data: { s: 1000, e: 2000 },
        meta: {
          isPersistent: true,
          entityType: 'TIME_TRACKING',
          entityId: 'TAG:tag-1:2024-01-01',
          opType: OpType.Update,
        },
      };

      service.computeAndEnqueue(action, beforeState, afterState);

      const changes = service.dequeue();
      // Should have exactly 1 change from action payload, NOT from state diff
      expect(changes.length).toBe(1);
      expect(changes[0].changes).toEqual({
        contextType: 'TAG',
        contextId: 'tag-1',
        date: '2024-01-01',
        data: { s: 1000, e: 2000 }, // From action payload, not state diff
      });
    });
  });

  describe('queue overflow protection', () => {
    it('should log warning when queue exceeds warning threshold', () => {
      const warnSpy = spyOn(console, 'warn');
      const state = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      // Enqueue 101 items to exceed the warning threshold (100)
      for (let i = 0; i < 101; i++) {
        service.computeAndEnqueue(action, state, state);
      }

      // Should have logged a warning
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.calls.allArgs();
      // OpLog.warn calls console.warn with prefix '[ol]' as first arg, message as second
      const hasQueueWarning = warnCalls.some((args) =>
        args.some(
          (arg) => typeof arg === 'string' && arg.includes('exceeds warning threshold'),
        ),
      );
      expect(hasQueueWarning).toBe(true);
    });

    it('should drop oldest item when queue reaches max size', () => {
      const errorSpy = spyOn(console, 'error');
      const state = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      // Fill queue to max (1000 items)
      for (let i = 0; i < 1000; i++) {
        service.computeAndEnqueue(action, state, state);
      }
      expect(service.getQueueSize()).toBe(1000);

      // Adding one more should drop oldest and log error
      service.computeAndEnqueue(action, state, state);

      // Queue should still be at max size (oldest was dropped)
      expect(service.getQueueSize()).toBe(1000);

      // Should have logged an error about queue being full
      expect(errorSpy).toHaveBeenCalled();
      const errorCalls = errorSpy.calls.allArgs();
      // OpLog.err calls console.error with prefix '[ol]' as first arg, message as second
      const hasQueueFullError = errorCalls.some((args) =>
        args.some((arg) => typeof arg === 'string' && arg.includes('Queue full')),
      );
      expect(hasQueueFullError).toBe(true);
    });

    it('should reset warning flag when queue drains below threshold', () => {
      const warnSpy = spyOn(console, 'warn');
      const state = createTaskState({
        'task-1': { id: 'task-1', title: 'Task' },
      }) as unknown as RootState;
      const action = createPersistentAction(
        '[TaskShared] Update Task',
        'TASK',
        'task-1',
        OpType.Update,
      );

      // Enqueue 101 items to trigger warning
      for (let i = 0; i < 101; i++) {
        service.computeAndEnqueue(action, state, state);
      }
      warnSpy.calls.reset();

      // Dequeue all items
      while (service.getQueueSize() > 0) {
        service.dequeue();
      }

      // Re-enqueue to exceed threshold again
      for (let i = 0; i < 101; i++) {
        service.computeAndEnqueue(action, state, state);
      }

      // Should have logged warning again since flag was reset
      const warnCalls = warnSpy.calls.allArgs();
      // OpLog.warn calls console.warn with prefix '[ol]' as first arg, message as second
      const hasQueueWarning = warnCalls.some((args) =>
        args.some(
          (arg) => typeof arg === 'string' && arg.includes('exceeds warning threshold'),
        ),
      );
      expect(hasQueueWarning).toBe(true);
    });
  });
});
