/* eslint-disable @typescript-eslint/naming-convention */
import { Task, TaskState } from '../task.model';
import { initialTaskState, taskReducer } from './task.reducer';
import * as fromActions from './task.actions';
import { TODAY_TAG } from '../../tag/tag.const';
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
      const action = fromActions.addTask({
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

    it('should update a task', () => {
      const updatedTitle = 'Updated Task 1';
      const action = fromActions.updateTask({
        task: { id: 'task1', changes: { title: updatedTitle } },
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.entities['task1']!.title).toBe(updatedTitle);
    });

    it('should delete a task', () => {
      const action = fromActions.deleteTask({
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

  describe('Task status operations', () => {
    it('should mark a task as done', () => {
      const action = fromActions.updateTask({
        task: { id: 'task1', changes: { isDone: true } },
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.entities['task1']!.isDone).toBe(true);
      expect(state.entities['task1']!.doneOn).toBeDefined();
    });

    it('should mark a task as undone', () => {
      // First mark as done
      let state = taskReducer(
        stateWithTasks,
        fromActions.updateTask({
          task: { id: 'task1', changes: { isDone: true, doneOn: 123456789 } },
        }),
      );

      // Then mark as undone
      const action = fromActions.updateTask({
        task: { id: 'task1', changes: { isDone: false } },
      });
      state = taskReducer(state, action);

      expect(state.entities['task1']!.isDone).toBe(false);
      expect(state.entities['task1']!.doneOn).toBeUndefined();
    });
  });

  describe('Time tracking operations', () => {
    it('should update time estimate for a task', () => {
      const timeEstimate = 7200000; // 2 hours
      const action = fromActions.updateTask({
        task: { id: 'task2', changes: { timeEstimate } },
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.entities['task2']!.timeEstimate).toBe(timeEstimate);
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

  describe('Complex operations', () => {
    it('should recalculate time estimate for parent task when subtask is updated', () => {
      // Start with clean test state
      let state = { ...stateWithTasks };

      // Add time estimates to subtasks
      state = taskReducer(
        state,
        fromActions.updateTask({
          task: { id: 'subTask1', changes: { timeEstimate: 3600000 } },
        }),
      );

      state = taskReducer(
        state,
        fromActions.updateTask({
          task: { id: 'subTask2', changes: { timeEstimate: 7200000 } },
        }),
      );

      // Verify parent has combined estimate
      expect(state.entities['task1']!.timeEstimate).toBe(10800000);

      // Mark one subtask as done
      // The reducer should automatically exclude done subtasks from parent's estimate
      state = taskReducer(
        state,
        fromActions.updateTask({
          task: { id: 'subTask1', changes: { isDone: true } },
        }),
      );

      // Verify parent's estimate excludes completed subtask
      expect(state.entities['task1']!.timeEstimate).toBe(7200000);
    });
  });

  describe('Tag operations', () => {
    it('should add a tag to a task', () => {
      const N_ID = 'NEW_TAG_ID';
      const action = fromActions.updateTaskTags({
        task: task2,
        newTagIds: [N_ID],
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.entities['task2']!.tagIds).toContain(N_ID);
    });

    it('should remove a tag from a task', () => {
      const N_ID = 'NEW_TAG_ID';
      // First add a tag
      let state = taskReducer(
        stateWithTasks,
        fromActions.updateTaskTags({
          task: task2,
          newTagIds: [N_ID],
        }),
      );

      // Then remove it
      const action = fromActions.updateTaskTags({
        task: state.entities['task2'] as Task,
        newTagIds: [],
      });
      state = taskReducer(state, action);

      expect(state.entities['task2']!.tagIds).not.toContain(TODAY_TAG.id);
    });
  });
});
