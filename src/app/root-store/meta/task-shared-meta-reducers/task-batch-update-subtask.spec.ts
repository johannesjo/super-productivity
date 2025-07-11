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

    it('should handle empty subTaskIds array when all subtasks are removed', () => {
      // Setup: Create parent task with subtasks
      const parentTask = createMockTask({
        id: 'QtsKTxuqH8hkHH6oVW2Bu',
        title: 'Task A',
        subTaskIds: ['J51QnQgFUpIfoyAdKn-oh', 'GjNKThCMkJqC4rMp-e21u'],
        projectId: 'project1',
      });

      const subtask1 = createMockTask({
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'Task B',
        parentId: 'QtsKTxuqH8hkHH6oVW2Bu',
        projectId: 'project1',
      });

      const subtask2 = createMockTask({
        id: 'GjNKThCMkJqC4rMp-e21u',
        title: 'Task D',
        parentId: 'QtsKTxuqH8hkHH6oVW2Bu',
        projectId: 'project1',
      });

      // Add tasks to state
      baseState[TASK_FEATURE_NAME].entities = {
        QtsKTxuqH8hkHH6oVW2Bu: parentTask,
        'J51QnQgFUpIfoyAdKn-oh': subtask1,
        'GjNKThCMkJqC4rMp-e21u': subtask2,
      };
      baseState[TASK_FEATURE_NAME].ids = [
        'QtsKTxuqH8hkHH6oVW2Bu',
        'J51QnQgFUpIfoyAdKn-oh',
        'GjNKThCMkJqC4rMp-e21u',
      ];

      // Operation: Update parent to have empty subTaskIds
      const operations: BatchOperation[] = [
        {
          type: 'update',
          taskId: 'QtsKTxuqH8hkHH6oVW2Bu',
          updates: {
            subTaskIds: [],
          },
        } as BatchTaskUpdate,
      ];

      const action = TaskSharedActions.batchUpdateForProject({
        projectId: 'project1',
        operations,
        createdTaskIds: {},
      });

      const result = metaReducer(baseState, action);

      // Verify parent task has empty subTaskIds
      const updatedParentTask = result[TASK_FEATURE_NAME].entities[
        'QtsKTxuqH8hkHH6oVW2Bu'
      ] as Task;
      expect(updatedParentTask.subTaskIds).toEqual([]);
    });

    it('should handle multiple update operations including subTaskIds changes', () => {
      // Setup: Create parent task with subtasks
      const parentTask = createMockTask({
        id: '74koiXFDzSSBzDunlGAi-',
        title: 'Main Task',
        subTaskIds: ['old-subtask-1', 'old-subtask-2', 'old-subtask-3'],
        projectId: 'project1',
      });

      const oldSubtask1 = createMockTask({
        id: 'old-subtask-1',
        title: 'Old Subtask 1',
        parentId: '74koiXFDzSSBzDunlGAi-',
        projectId: 'project1',
      });

      const oldSubtask2 = createMockTask({
        id: 'old-subtask-2',
        title: 'Old Subtask 2',
        parentId: '74koiXFDzSSBzDunlGAi-',
        projectId: 'project1',
      });

      const oldSubtask3 = createMockTask({
        id: 'old-subtask-3',
        title: 'Old Subtask 3',
        parentId: '74koiXFDzSSBzDunlGAi-',
        projectId: 'project1',
      });

      // Add tasks to state
      baseState[TASK_FEATURE_NAME].entities = {
        '74koiXFDzSSBzDunlGAi-': parentTask,
        'old-subtask-1': oldSubtask1,
        'old-subtask-2': oldSubtask2,
        'old-subtask-3': oldSubtask3,
      };
      baseState[TASK_FEATURE_NAME].ids = [
        '74koiXFDzSSBzDunlGAi-',
        'old-subtask-1',
        'old-subtask-2',
        'old-subtask-3',
      ];

      // Operations: Update parent with new subtask IDs
      const operations: BatchOperation[] = [
        {
          type: 'update',
          taskId: '74koiXFDzSSBzDunlGAi-',
          updates: {
            subTaskIds: ['old-subtask-1'], // Only keep the first subtask
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
      const updatedParentTask = result[TASK_FEATURE_NAME].entities[
        '74koiXFDzSSBzDunlGAi-'
      ] as Task;
      expect(updatedParentTask.subTaskIds).toEqual(['old-subtask-1']);
    });

    it('should skip update for non-existent task', () => {
      // Operation: Try to update a task that doesn't exist
      const operations: BatchOperation[] = [
        {
          type: 'update',
          taskId: 'non-existent-task',
          updates: {
            subTaskIds: [],
          },
        } as BatchTaskUpdate,
      ];

      const action = TaskSharedActions.batchUpdateForProject({
        projectId: 'project1',
        operations,
        createdTaskIds: {},
      });

      // Spy on console.warn
      spyOn(console, 'warn');

      const result = metaReducer(baseState, action);

      // Verify warning was logged
      expect(console.warn).toHaveBeenCalledWith(
        'Skipping update for non-existent task: non-existent-task',
      );

      // Verify state wasn't changed
      expect(result[TASK_FEATURE_NAME]).toEqual(baseState[TASK_FEATURE_NAME]);
    });

    it('should handle reordering of subtasks', () => {
      // Setup: Create parent task with subtasks
      const parentTask = createMockTask({
        id: 'parent-task',
        title: 'Parent Task',
        subTaskIds: ['subtask-a', 'subtask-b', 'subtask-c'],
        projectId: 'project1',
      });

      const subtaskA = createMockTask({
        id: 'subtask-a',
        title: 'Subtask A',
        parentId: 'parent-task',
        projectId: 'project1',
      });

      const subtaskB = createMockTask({
        id: 'subtask-b',
        title: 'Subtask B',
        parentId: 'parent-task',
        projectId: 'project1',
      });

      const subtaskC = createMockTask({
        id: 'subtask-c',
        title: 'Subtask C',
        parentId: 'parent-task',
        projectId: 'project1',
      });

      // Add tasks to state
      baseState[TASK_FEATURE_NAME].entities = {
        'parent-task': parentTask,
        'subtask-a': subtaskA,
        'subtask-b': subtaskB,
        'subtask-c': subtaskC,
      };
      baseState[TASK_FEATURE_NAME].ids = [
        'parent-task',
        'subtask-a',
        'subtask-b',
        'subtask-c',
      ];

      // Operation: Reorder subtasks
      const operations: BatchOperation[] = [
        {
          type: 'update',
          taskId: 'parent-task',
          updates: {
            subTaskIds: ['subtask-c', 'subtask-a', 'subtask-b'], // Changed order
          },
        } as BatchTaskUpdate,
      ];

      const action = TaskSharedActions.batchUpdateForProject({
        projectId: 'project1',
        operations,
        createdTaskIds: {},
      });

      const result = metaReducer(baseState, action);

      // Verify parent task has reordered subtasks
      const updatedParentTask = result[TASK_FEATURE_NAME].entities['parent-task'] as Task;
      expect(updatedParentTask.subTaskIds).toEqual([
        'subtask-c',
        'subtask-a',
        'subtask-b',
      ]);
    });

    it('should handle combined updates to task properties including subTaskIds', () => {
      // Setup: Create parent task
      const parentTask = createMockTask({
        id: 'parent-task',
        title: 'Original Title',
        notes: 'Original notes',
        isDone: false,
        subTaskIds: ['subtask-1', 'subtask-2'],
        projectId: 'project1',
      });

      // Add task to state
      baseState[TASK_FEATURE_NAME].entities = {
        'parent-task': parentTask,
      };
      baseState[TASK_FEATURE_NAME].ids = ['parent-task'];

      // Operation: Update multiple properties including subTaskIds
      const operations: BatchOperation[] = [
        {
          type: 'update',
          taskId: 'parent-task',
          updates: {
            title: 'Updated Title',
            notes: 'Updated notes',
            isDone: true,
            subTaskIds: ['subtask-2'], // Remove subtask-1
          },
        } as BatchTaskUpdate,
      ];

      const action = TaskSharedActions.batchUpdateForProject({
        projectId: 'project1',
        operations,
        createdTaskIds: {},
      });

      const result = metaReducer(baseState, action);

      // Verify all properties were updated
      const updatedTask = result[TASK_FEATURE_NAME].entities['parent-task'] as Task;
      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.notes).toBe('Updated notes');
      expect(updatedTask.isDone).toBe(true);
      expect(updatedTask.subTaskIds).toEqual(['subtask-2']);
    });
  });
});
