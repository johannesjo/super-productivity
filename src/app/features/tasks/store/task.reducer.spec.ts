/* eslint-disable @typescript-eslint/naming-convention */
import { Task, TaskState } from '../task.model';
import { initialTaskState, taskReducer } from './task.reducer';
import * as fromActions from './task.actions';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { WorkContextType } from '../../work-context/work-context.model';
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

  describe('Task CRUD operations', () => {
    it('should add a task', () => {
      const newTask = createTask('task3');
      const action = TaskSharedActions.addTask({
        task: newTask,
        isAddToBacklog: false,
        isAddToBottom: false,
        workContextId: 'XXX',
        workContextType: WorkContextType.TAG,
      });
      const state = taskReducer(initialTaskState, action);

      expect(state.ids).toContain('task3');
      expect(state.entities['task3']).toEqual(newTask);
    });

    it('should delete a task', () => {
      const action = TaskSharedActions.deleteTask({
        task: {
          ...createTask('asd'),
          id: 'task2',
          subTasks: [],
        },
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.ids).not.toContain('task2');
      expect(state.entities['task2']).toBeUndefined();
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
});
