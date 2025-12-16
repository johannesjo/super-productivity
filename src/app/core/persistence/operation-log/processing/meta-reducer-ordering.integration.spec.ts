/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Integration tests for meta-reducer ordering.
 *
 * These tests verify that operationCaptureMetaReducer correctly captures
 * entity changes even when other meta-reducers (like taskSharedCrudMetaReducer)
 * modify the state before passing it to inner reducers.
 *
 * CRITICAL: operationCaptureMetaReducer must be FIRST (outermost) in the
 * meta-reducer chain to capture the original state before any modifications.
 * If it's LAST (innermost), it receives already-modified state from
 * taskSharedCrudMetaReducer and cannot detect entity changes.
 *
 * This bug was discovered when delete operations weren't syncing because
 * operationCaptureMetaReducer was positioned LAST, causing it to see
 * beforeState === afterState (both modified).
 */
import { ActionReducer, Action, MetaReducer } from '@ngrx/store';
import {
  operationCaptureMetaReducer,
  setOperationCaptureService,
} from './operation-capture.meta-reducer';
import { OperationCaptureService } from './operation-capture.service';
import { EntityType, OpType } from '../operation.types';
import { PersistentAction } from '../persistent-action.interface';

describe('Meta-reducer ordering integration', () => {
  let captureService: OperationCaptureService;
  let capturedChanges: { beforeState: unknown; afterState: unknown }[];

  // Feature name must match the actual NgRx feature name
  const TASKS_FEATURE = 'tasks';

  interface TaskState {
    ids: string[];
    entities: Record<string, { id: string; title: string }>;
  }

  interface MockRootState {
    [TASKS_FEATURE]: TaskState;
  }

  const createDeleteTaskAction = (taskId: string): PersistentAction => ({
    type: '[Task Shared] deleteTask',
    task: { id: taskId, title: 'Task to delete', subTaskIds: [], tagIds: [] },
    meta: {
      isPersistent: true,
      entityType: 'TASK' as EntityType,
      entityId: taskId,
      opType: OpType.Delete,
    },
  });

  const createTaskState = (
    tasks: Record<string, { id: string; title: string }>,
  ): MockRootState => ({
    [TASKS_FEATURE]: {
      ids: Object.keys(tasks),
      entities: tasks,
    },
  });

  /**
   * A mock meta-reducer that simulates taskSharedCrudMetaReducer behavior.
   * It modifies state BEFORE passing to inner reducers (like the real one does).
   */
  const mockTaskCrudMetaReducer: MetaReducer<MockRootState> = (
    reducer: ActionReducer<MockRootState, Action>,
  ): ActionReducer<MockRootState, Action> => {
    return (state: MockRootState | undefined, action: Action): MockRootState => {
      if (!state) return reducer(state, action);

      // Check if this is a delete task action
      if (action.type === '[Task Shared] deleteTask') {
        const deleteAction = action as PersistentAction & {
          task: { id: string };
        };
        const taskId = deleteAction.task.id;

        // Modify state by removing the task (like the real meta-reducer does)
        const remainingEntities = { ...state[TASKS_FEATURE].entities };
        delete remainingEntities[taskId];
        const modifiedState: MockRootState = {
          ...state,
          [TASKS_FEATURE]: {
            ids: state[TASKS_FEATURE].ids.filter((id) => id !== taskId),
            entities: remainingEntities,
          },
        };

        // Pass MODIFIED state to inner reducers (this is the key behavior)
        return reducer(modifiedState, action);
      }

      return reducer(state, action);
    };
  };

  /**
   * A simple passthrough reducer (simulates feature reducer that doesn't handle the action)
   */
  const passthroughReducer: ActionReducer<MockRootState, Action> = (
    state: MockRootState | undefined,
  ): MockRootState => {
    return state || createTaskState({});
  };

  beforeEach(() => {
    captureService = new OperationCaptureService();
    capturedChanges = [];

    // Spy on computeAndEnqueue to capture what states are being passed
    spyOn(captureService, 'computeAndEnqueue').and.callFake(
      (_action, beforeState, afterState) => {
        capturedChanges.push({ beforeState, afterState });
      },
    );

    setOperationCaptureService(captureService);
  });

  afterEach(() => {
    captureService.clear();
  });

  describe('CORRECT ordering: operationCaptureMetaReducer FIRST (outermost)', () => {
    it('should capture entity deletion when operationCaptureMetaReducer is outermost', () => {
      // Compose: operationCapture wraps taskCrud wraps passthrough
      // This is the CORRECT order (operationCapture is FIRST in array = OUTERMOST)
      const composedReducer = operationCaptureMetaReducer(
        mockTaskCrudMetaReducer(passthroughReducer),
      );

      const initialState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task to delete' },
      });

      const action = createDeleteTaskAction('task-1');

      // Execute the composed reducer
      const resultState = composedReducer(initialState, action);

      // Verify the result state has the task removed
      expect(resultState[TASKS_FEATURE].ids).not.toContain('task-1');
      expect(resultState[TASKS_FEATURE].entities['task-1']).toBeUndefined();

      // Verify computeAndEnqueue was called with DIFFERENT before/after states
      expect(captureService.computeAndEnqueue).toHaveBeenCalled();
      expect(capturedChanges.length).toBe(1);

      const { beforeState, afterState } = capturedChanges[0];

      // beforeState should have the task (original state)
      expect((beforeState as MockRootState)[TASKS_FEATURE].ids).toContain('task-1');
      expect(
        (beforeState as MockRootState)[TASKS_FEATURE].entities['task-1'],
      ).toBeDefined();

      // afterState should NOT have the task (modified state)
      expect((afterState as MockRootState)[TASKS_FEATURE].ids).not.toContain('task-1');
      expect(
        (afterState as MockRootState)[TASKS_FEATURE].entities['task-1'],
      ).toBeUndefined();

      // Most importantly: beforeState !== afterState
      expect(beforeState).not.toBe(afterState);
    });

    it('should capture multiple entity deletions correctly', () => {
      const composedReducer = operationCaptureMetaReducer(
        mockTaskCrudMetaReducer(passthroughReducer),
      );

      const initialState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task 1' },
        'task-2': { id: 'task-2', title: 'Task 2' },
        'task-3': { id: 'task-3', title: 'Task 3' },
      });

      // Delete first task
      const state = composedReducer(initialState, createDeleteTaskAction('task-1'));

      // Delete second task
      const finalState = composedReducer(state, createDeleteTaskAction('task-2'));

      // Final state should only have task-3
      expect(finalState[TASKS_FEATURE].ids).toEqual(['task-3']);

      // Should have captured 2 operations
      expect(capturedChanges.length).toBe(2);

      // First deletion should show task-1 removed
      const firstDelete = capturedChanges[0];
      expect((firstDelete.beforeState as MockRootState)[TASKS_FEATURE].ids).toContain(
        'task-1',
      );
      expect((firstDelete.afterState as MockRootState)[TASKS_FEATURE].ids).not.toContain(
        'task-1',
      );

      // Second deletion should show task-2 removed
      const secondDelete = capturedChanges[1];
      expect((secondDelete.beforeState as MockRootState)[TASKS_FEATURE].ids).toContain(
        'task-2',
      );
      expect((secondDelete.afterState as MockRootState)[TASKS_FEATURE].ids).not.toContain(
        'task-2',
      );
    });
  });

  describe('INCORRECT ordering: operationCaptureMetaReducer LAST (innermost)', () => {
    it('should NOT capture entity deletion when operationCaptureMetaReducer is innermost (demonstrates the bug)', () => {
      // Compose: taskCrud wraps operationCapture wraps passthrough
      // This is the INCORRECT order (operationCapture is LAST in array = INNERMOST)
      const composedReducer = mockTaskCrudMetaReducer(
        operationCaptureMetaReducer(passthroughReducer),
      );

      const initialState = createTaskState({
        'task-1': { id: 'task-1', title: 'Task to delete' },
      });

      const action = createDeleteTaskAction('task-1');

      // Execute the composed reducer
      const resultState = composedReducer(initialState, action);

      // The task should still be removed from final state
      expect(resultState[TASKS_FEATURE].ids).not.toContain('task-1');

      // But computeAndEnqueue receives ALREADY MODIFIED state!
      expect(captureService.computeAndEnqueue).toHaveBeenCalled();
      expect(capturedChanges.length).toBe(1);

      const { beforeState, afterState } = capturedChanges[0];

      // BUG: Both beforeState and afterState show the task as ALREADY DELETED
      // because mockTaskCrudMetaReducer passed modified state to operationCapture
      expect((beforeState as MockRootState)[TASKS_FEATURE].ids).not.toContain('task-1');
      expect((afterState as MockRootState)[TASKS_FEATURE].ids).not.toContain('task-1');

      // This is the bug: beforeState === afterState (same reference!)
      // or at least they have the same content
      expect(
        (beforeState as MockRootState)[TASKS_FEATURE].entities['task-1'],
      ).toBeUndefined();
      expect(
        (afterState as MockRootState)[TASKS_FEATURE].entities['task-1'],
      ).toBeUndefined();
    });
  });

  describe('state reference equality', () => {
    it('should work with NgRx immutability pattern (different references for changed slices)', () => {
      const composedReducer = operationCaptureMetaReducer(
        mockTaskCrudMetaReducer(passthroughReducer),
      );

      const task1 = { id: 'task-1', title: 'Task 1' };
      const task2 = { id: 'task-2', title: 'Task 2' };

      const initialState = createTaskState({
        'task-1': task1,
        'task-2': task2,
      });

      const action = createDeleteTaskAction('task-1');
      const resultState = composedReducer(initialState, action);

      // Verify different references for changed slice
      expect(resultState[TASKS_FEATURE]).not.toBe(initialState[TASKS_FEATURE]);
      expect(resultState[TASKS_FEATURE].entities).not.toBe(
        initialState[TASKS_FEATURE].entities,
      );

      // Verify the capture service received different states
      const { beforeState, afterState } = capturedChanges[0];
      expect(beforeState).not.toBe(afterState);
      expect((beforeState as MockRootState)[TASKS_FEATURE]).not.toBe(
        (afterState as MockRootState)[TASKS_FEATURE],
      );
    });
  });
});
