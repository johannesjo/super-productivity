/* eslint-disable @typescript-eslint/naming-convention */
import { Task, TaskState } from '../task.model';
import { initialTaskState, taskReducer } from './task.reducer';
import * as fromActions from './task.actions';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { INBOX_PROJECT } from '../../project/project.const';

describe('Task Reducer', () => {
  const createTask = (id: string, partial: Partial<Task> = {}): Task => ({
    id,
    title: `Task ${id}`,
    created: Date.now(),
    isDone: false,
    subTaskIds: [],
    tagIds: [],
    projectId: INBOX_PROJECT.id,
    parentId: undefined,
    timeSpentOnDay: {},
    timeEstimate: 0,
    timeSpent: 0,
    dueDay: undefined,
    dueWithTime: undefined,
    attachments: [],
    ...partial,
  });

  // Create some test tasks
  const task1 = createTask('task1');
  const task2 = createTask('task2');
  const subTask1 = createTask('subTask1', { parentId: 'task1' });
  const subTask2 = createTask('subTask2', { parentId: 'task1' });

  // Create initial state with some tasks
  const stateWithTasks: TaskState = {
    ...initialTaskState,
    ids: ['task1', 'task2', 'subTask1', 'subTask2'],
    entities: {
      task1: { ...task1, subTaskIds: ['subTask1', 'subTask2'] },
      task2,
      subTask1,
      subTask2,
    },
    currentTaskId: 'task1',
  };

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'UNKNOWN' };
      const state = taskReducer(initialTaskState, action);

      expect(state).toBe(initialTaskState);
    });
  });

  describe('Task operations still handled by task reducer', () => {
    it('should handle unknown actions by returning current state', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
      const state = taskReducer(stateWithTasks, unknownAction);

      expect(state).toBe(stateWithTasks);
    });
  });

  describe('Note: CRUD operations moved to meta-reducer', () => {
    it('should note that addTask is now handled by TaskSharedActions in meta-reducer', () => {
      // This test documents that addTask has been moved to the meta-reducer
      // and is no longer handled directly by the task reducer.
      // See task-shared.reducer.spec.ts for comprehensive addTask tests.
      expect(TaskSharedActions.addTask).toBeDefined();
    });

    it('should note that deleteTask is now handled by TaskSharedActions in meta-reducer', () => {
      // This test documents that deleteTask has been moved to the meta-reducer
      // and is no longer handled directly by the task reducer.
      // See task-shared.reducer.spec.ts for comprehensive deleteTask tests.
      expect(TaskSharedActions.deleteTask).toBeDefined();
    });
  });

  describe('Subtask operations', () => {
    it('should add a subtask to a parent task', () => {
      const newSubTask = createTask('subTask3');
      const action = fromActions.addSubTask({
        task: newSubTask,
        parentId: 'task1',
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.entities['task1']!.subTaskIds).toContain('subTask3');
      expect(state.entities['subTask3']).toEqual({ ...newSubTask, parentId: 'task1' });
    });
  });

  describe('Current task operations', () => {
    it('should set current task', () => {
      const action = fromActions.setCurrentTask({ id: 'task2' });
      const state = taskReducer(stateWithTasks, action);

      expect(state.currentTaskId).toBe('task2');
    });

    it('should unset current task', () => {
      const action = fromActions.unsetCurrentTask();
      const state = taskReducer(stateWithTasks, action);

      expect(state.currentTaskId).toBeNull();
      expect(state.lastCurrentTaskId).toBe('task1');
    });
  });

  describe('removeTasksFromTodayTag action', () => {
    it('should maintain task order by moving removed tasks to the beginning', () => {
      const stateWithOrderedTasks: TaskState = {
        ...initialTaskState,
        ids: ['task1', 'task2', 'task3', 'task4'],
        entities: {
          task1: createTask('task1'),
          task2: createTask('task2'),
          task3: createTask('task3'),
          task4: createTask('task4'),
        },
      };

      const action = TaskSharedActions.removeTasksFromTodayTag({
        taskIds: ['task2', 'task4'],
      });
      const state = taskReducer(stateWithOrderedTasks, action);

      // The removed tasks should be moved to the beginning while maintaining their relative order
      expect(state.ids).toEqual(['task2', 'task4', 'task1', 'task3']);
    });
  });
});
