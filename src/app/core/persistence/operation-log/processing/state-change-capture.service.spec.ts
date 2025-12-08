/* eslint-disable @typescript-eslint/naming-convention */
import { StateChangeCaptureService } from './state-change-capture.service';
import { PersistentAction } from '../persistent-action.interface';
import { EntityType, OpType } from '../operation.types';
import { RootState } from '../../../../root-store/root-state';
import { TASK_FEATURE_NAME } from '../../../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../../../features/project/store/project.reducer';

describe('StateChangeCaptureService', () => {
  let service: StateChangeCaptureService;

  const createMockAction = (
    overrides: Partial<PersistentAction> = {},
  ): PersistentAction => ({
    type: '[TaskShared] Update Task',
    meta: {
      isPersistent: true,
      entityType: 'TASK' as EntityType,
      entityId: 'task-1',
      opType: OpType.Update,
    },
    ...overrides,
  });

  const createMockState = (overrides: Partial<RootState> = {}): RootState =>
    ({
      [TASK_FEATURE_NAME]: {
        ids: ['task-1', 'task-2'],
        entities: {
          'task-1': { id: 'task-1', title: 'Task 1', tagIds: ['tag-1'], projectId: null },
          'task-2': { id: 'task-2', title: 'Task 2', tagIds: [], projectId: 'proj-1' },
        },
      },
      [TAG_FEATURE_NAME]: {
        ids: ['tag-1'],
        entities: {
          'tag-1': { id: 'tag-1', title: 'Tag 1', taskIds: ['task-1'] },
        },
      },
      [PROJECT_FEATURE_NAME]: {
        ids: ['proj-1'],
        entities: {
          'proj-1': { id: 'proj-1', title: 'Project 1', taskIds: ['task-2'] },
        },
      },
      ...overrides,
    }) as unknown as RootState;

  beforeEach(() => {
    service = new StateChangeCaptureService();
  });

  describe('captureBeforeState', () => {
    it('should capture state for persistent action', () => {
      const action = createMockAction();
      const state = createMockState();

      service.captureBeforeState(action, state);

      expect(service.hasPendingCapture(action)).toBe(true);
    });

    it('should increment pending capture count', () => {
      const action = createMockAction();
      const state = createMockState();

      expect(service.getPendingCaptureCount()).toBe(0);
      service.captureBeforeState(action, state);
      expect(service.getPendingCaptureCount()).toBe(1);
    });

    it('should capture multiple actions independently', () => {
      const action1 = createMockAction({
        meta: { ...createMockAction().meta, entityId: 'task-1' },
      });
      const action2 = createMockAction({
        meta: { ...createMockAction().meta, entityId: 'task-2' },
      });
      const state = createMockState();

      service.captureBeforeState(action1, state);
      service.captureBeforeState(action2, state);

      expect(service.getPendingCaptureCount()).toBe(2);
    });
  });

  describe('computeEntityChanges', () => {
    it('should return empty array when no capture exists', () => {
      const action = createMockAction();
      const state = createMockState();

      const changes = service.computeEntityChanges(action, state);

      expect(changes).toEqual([]);
    });

    it('should detect created entity', () => {
      const action = createMockAction({
        type: '[TaskShared] Add Task',
        meta: { ...createMockAction().meta, opType: OpType.Create, entityId: 'task-3' },
      });
      const beforeState = createMockState();
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-1', 'task-2', 'task-3'],
          entities: {
            ...beforeState[TASK_FEATURE_NAME].entities,
            'task-3': { id: 'task-3', title: 'New Task', tagIds: [], projectId: null },
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      expect(changes.length).toBeGreaterThan(0);
      const createChange = changes.find((c) => c.entityId === 'task-3');
      expect(createChange).toBeDefined();
      expect(createChange!.opType).toBe(OpType.Create);
      expect(createChange!.entityType).toBe('TASK');
    });

    it('should detect deleted entity', () => {
      const action = createMockAction({
        type: '[TaskShared] Delete Task',
        meta: { ...createMockAction().meta, opType: OpType.Delete, entityId: 'task-1' },
      });
      const beforeState = createMockState();
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-2'],
          entities: {
            'task-2': beforeState[TASK_FEATURE_NAME].entities['task-2'],
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      const deleteChange = changes.find(
        (c) => c.entityId === 'task-1' && c.opType === OpType.Delete,
      );
      expect(deleteChange).toBeDefined();
      expect(deleteChange!.entityType).toBe('TASK');
    });

    it('should detect updated entity', () => {
      const action = createMockAction();
      const beforeState = createMockState();
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-1', 'task-2'],
          entities: {
            'task-1': {
              id: 'task-1',
              title: 'Updated Task 1',
              tagIds: ['tag-1'],
              projectId: null,
            },
            'task-2': beforeState[TASK_FEATURE_NAME].entities['task-2'],
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      const updateChange = changes.find(
        (c) => c.entityId === 'task-1' && c.opType === OpType.Update,
      );
      expect(updateChange).toBeDefined();
      expect(updateChange!.changes).toEqual({ title: 'Updated Task 1' });
    });

    it('should detect changes across multiple entity types', () => {
      const action = createMockAction({
        type: '[TaskShared] Delete Task',
        meta: { ...createMockAction().meta, opType: OpType.Delete, entityId: 'task-1' },
      });
      const beforeState = createMockState();
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-2'],
          entities: {
            'task-2': beforeState[TASK_FEATURE_NAME].entities['task-2'],
          },
        },
        [TAG_FEATURE_NAME]: {
          ids: ['tag-1'],
          entities: {
            'tag-1': { id: 'tag-1', title: 'Tag 1', taskIds: [] }, // task-1 removed
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      // Should have task deletion and tag update
      const taskChange = changes.find((c) => c.entityType === 'TASK');
      const tagChange = changes.find((c) => c.entityType === 'TAG');

      expect(taskChange).toBeDefined();
      expect(tagChange).toBeDefined();
      expect(tagChange!.opType).toBe(OpType.Update);
    });

    it('should remove pending capture after computing changes', () => {
      const action = createMockAction();
      const state = createMockState();

      service.captureBeforeState(action, state);
      expect(service.hasPendingCapture(action)).toBe(true);

      service.computeEntityChanges(action, state);
      expect(service.hasPendingCapture(action)).toBe(false);
    });

    it('should return empty array when no changes detected', () => {
      const action = createMockAction();
      const state = createMockState();

      service.captureBeforeState(action, state);
      const changes = service.computeEntityChanges(action, state);

      expect(changes).toEqual([]);
    });
  });

  describe('array change detection', () => {
    it('should detect array element additions', () => {
      const action = createMockAction();
      const beforeState = createMockState();
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-1', 'task-2'],
          entities: {
            'task-1': {
              id: 'task-1',
              title: 'Task 1',
              tagIds: ['tag-1', 'tag-2'],
              projectId: null,
            },
            'task-2': beforeState[TASK_FEATURE_NAME].entities['task-2'],
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      const updateChange = changes.find((c) => c.entityId === 'task-1');
      expect(updateChange).toBeDefined();
      expect((updateChange!.changes as any).tagIds).toEqual(['tag-1', 'tag-2']);
    });

    it('should detect array element removals', () => {
      const action = createMockAction();
      const beforeState = createMockState();
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-1', 'task-2'],
          entities: {
            'task-1': { id: 'task-1', title: 'Task 1', tagIds: [], projectId: null },
            'task-2': beforeState[TASK_FEATURE_NAME].entities['task-2'],
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      const updateChange = changes.find((c) => c.entityId === 'task-1');
      expect(updateChange).toBeDefined();
      expect((updateChange!.changes as any).tagIds).toEqual([]);
    });
  });

  describe('nested object change detection', () => {
    it('should detect nested object changes', () => {
      const action = createMockAction();
      const beforeState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-1'],
          entities: {
            'task-1': {
              id: 'task-1',
              title: 'Task 1',
              tagIds: [],
              projectId: null,
              timeSpentOnDay: { '2024-01-01': 3600 },
            },
          },
        },
      } as any);
      const afterState = createMockState({
        [TASK_FEATURE_NAME]: {
          ids: ['task-1'],
          entities: {
            'task-1': {
              id: 'task-1',
              title: 'Task 1',
              tagIds: [],
              projectId: null,
              timeSpentOnDay: { '2024-01-01': 3600, '2024-01-02': 1800 },
            },
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      const updateChange = changes.find((c) => c.entityId === 'task-1');
      expect(updateChange).toBeDefined();
      expect((updateChange!.changes as any).timeSpentOnDay).toEqual({
        '2024-01-01': 3600,
        '2024-01-02': 1800,
      });
    });
  });

  describe('action type mapping', () => {
    it('should use mapped entity types for known actions', () => {
      const action = createMockAction({
        type: '[SimpleCounter] Update Simple Counter',
        meta: {
          isPersistent: true,
          entityType: 'SIMPLE_COUNTER' as EntityType,
          entityId: 'counter-1',
          opType: OpType.Update,
        },
      });

      // This test verifies that the service doesn't crash and captures state
      // even for action types with specific mappings
      const state = createMockState();
      service.captureBeforeState(action, state);
      expect(service.hasPendingCapture(action)).toBe(true);
    });

    it('should fall back to default entity types for unknown actions', () => {
      const action = createMockAction({
        type: '[Unknown] Unknown Action',
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'task-1',
          opType: OpType.Update,
        },
      });

      const state = createMockState();
      service.captureBeforeState(action, state);

      // Should still capture - falls back to default types
      expect(service.hasPendingCapture(action)).toBe(true);
    });

    it('should capture TAG entity changes for WorkContextMeta move actions', () => {
      const action = createMockAction({
        type: '[WorkContextMeta] Move Task in Today',
        meta: {
          isPersistent: true,
          entityType: 'TAG' as EntityType,
          entityId: 'TODAY',
          opType: OpType.Move,
        },
        taskId: 'task-1',
        afterTaskId: 'task-2',
        workContextType: 'TAG',
        workContextId: 'TODAY',
      });

      const beforeState = createMockState({
        [TAG_FEATURE_NAME]: {
          ids: ['TODAY'],
          entities: {
            TODAY: {
              id: 'TODAY',
              title: 'Today',
              taskIds: ['task-1', 'task-2', 'task-3'],
            },
          },
        },
      } as any);

      const afterState = createMockState({
        [TAG_FEATURE_NAME]: {
          ids: ['TODAY'],
          entities: {
            TODAY: {
              id: 'TODAY',
              title: 'Today',
              taskIds: ['task-2', 'task-1', 'task-3'],
            },
          },
        },
      } as any);

      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      const tagChange = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'TODAY',
      );
      expect(tagChange).toBeDefined();
      expect(tagChange!.opType).toBe(OpType.Update);
      expect((tagChange!.changes as any).taskIds).toEqual(['task-2', 'task-1', 'task-3']);
    });
  });
});
