/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { taskBatchUpdateMetaReducer } from './task-batch-update.reducer';
import { TaskSharedActions } from '../task-shared.actions';
import { RootState } from '../../root-state';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { Task } from '../../../features/tasks/task.model';
import { Action, ActionReducer } from '@ngrx/store';
import { BatchOperation, BatchTaskUpdate } from '@super-productivity/plugin-api';
import { createBaseState, createMockTask } from './test-utils';

describe('taskBatchUpdateMetaReducer - SubTask Updates', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = taskBatchUpdateMetaReducer(mockReducer);
    baseState = createBaseState();
  });

  describe('subtask ID updates', () => {
    it('should update parent task subTaskIds when subtasks are moved to root', () => {
      // Setup: Create parent task with subtasks
      const parentTask = createMockTask({
        id: 'parent-task',
        title: 'Parent Task',
        subTaskIds: ['subtask-1', 'subtask-2', 'subtask-3'],
        projectId: 'project1',
      });

      const subtask1 = createMockTask({
        id: 'subtask-1',
        title: 'Subtask 1',
        parentId: 'parent-task',
        projectId: 'project1',
      });

      const subtask2 = createMockTask({
        id: 'subtask-2',
        title: 'Subtask 2',
        parentId: 'parent-task',
        projectId: 'project1',
      });

      const subtask3 = createMockTask({
        id: 'subtask-3',
        title: 'Subtask 3',
        parentId: 'parent-task',
        projectId: 'project1',
      });

      // Add tasks to state
      baseState[TASK_FEATURE_NAME].entities = {
        'parent-task': parentTask,
        'subtask-1': subtask1,
        'subtask-2': subtask2,
        'subtask-3': subtask3,
      };
      baseState[TASK_FEATURE_NAME].ids = [
        'parent-task',
        'subtask-1',
        'subtask-2',
        'subtask-3',
      ];

      // Operation: Update parent to remove some subtasks
      const operations: BatchOperation[] = [
        {
          type: 'update',
          taskId: 'parent-task',
          updates: {
            parentId: null,
            subTaskIds: [], // Only keep subtask-1
          },
        } as BatchTaskUpdate,
        {
          type: 'update',
          taskId: 'subtask-1',
          updates: {
            parentId: null,
          },
        } as BatchTaskUpdate,
        {
          type: 'update',
          taskId: 'subtask-2',
          updates: {
            parentId: null,
          },
        } as BatchTaskUpdate,
        {
          type: 'update',
          taskId: 'subtask-3',
          updates: {
            parentId: null,
          },
        } as BatchTaskUpdate,
      ];

      const action = TaskSharedActions.batchUpdateForProject({
        projectId: 'project1',
        operations,
        createdTaskIds: {},
      });

      const result = metaReducer(baseState, action);

      // Verify parent task was updated correctly
      const updatedParentTask = result[TASK_FEATURE_NAME].entities['parent-task'] as Task;
      expect(updatedParentTask.subTaskIds).toEqual([]);
    });
  });
});
