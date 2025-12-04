/* eslint-disable @typescript-eslint/naming-convention */
import { Task, TaskState } from '../task.model';
import { initialTaskState, taskReducer } from './task.reducer';
import * as fromActions from './task.actions';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { INBOX_PROJECT } from '../../project/project.const';
import { TimeTrackingActions } from '../../time-tracking/store/time-tracking.actions';

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

  describe('TaskSharedActions.addTagToTask', () => {
    it('should add tagId to task tagIds', () => {
      const action = TaskSharedActions.addTagToTask({
        taskId: 'task1',
        tagId: 'tag1',
      });
      const state = taskReducer(stateWithTasks, action);

      expect(state.entities['task1']!.tagIds).toContain('tag1');
    });

    it('should ensure tagId uniqueness', () => {
      const stateWithTag = taskReducer(
        stateWithTasks,
        TaskSharedActions.addTagToTask({ taskId: 'task1', tagId: 'tag1' }),
      );

      const action = TaskSharedActions.addTagToTask({
        taskId: 'task1',
        tagId: 'tag1',
      });
      const state = taskReducer(stateWithTag, action);

      expect(state.entities['task1']!.tagIds.length).toBe(1);
      expect(state.entities['task1']!.tagIds).toContain('tag1');
    });
  });

  describe('Incremental parent time update optimization', () => {
    const createTaskWithTime = (
      id: string,
      timeSpentOnDay: { [key: string]: number },
      parentId?: string,
    ): Task =>
      createTask(id, {
        timeSpentOnDay,
        timeSpent: Object.values(timeSpentOnDay).reduce((a, b) => a + b, 0),
        parentId,
      });

    it('should incrementally update parent timeSpentOnDay when subtask time is added', () => {
      const parentTask = createTaskWithTime('parent', {
        '2024-01-01': 3600,
        '2024-01-02': 1800,
      });
      const subtask1 = createTaskWithTime(
        'sub1',
        { '2024-01-01': 1800, '2024-01-02': 900 },
        'parent',
      );
      const subtask2 = createTaskWithTime(
        'sub2',
        { '2024-01-01': 1800, '2024-01-02': 900 },
        'parent',
      );

      const stateWithParent: TaskState = {
        ...initialTaskState,
        ids: ['parent', 'sub1', 'sub2'],
        entities: {
          parent: { ...parentTask, subTaskIds: ['sub1', 'sub2'] },
          sub1: subtask1,
          sub2: subtask2,
        },
      };

      // Add 600ms to subtask1 on 2024-01-01
      const action = TimeTrackingActions.addTimeSpent({
        task: subtask1,
        date: '2024-01-01',
        duration: 600,
        isFromTrackingReminder: false,
      });
      const state = taskReducer(stateWithParent, action);

      // Parent should have incremental update: 3600 + 600 = 4200 for 01-01
      expect(state.entities['parent']!.timeSpentOnDay['2024-01-01']).toBe(4200);
      expect(state.entities['parent']!.timeSpentOnDay['2024-01-02']).toBe(1800);
      expect(state.entities['parent']!.timeSpent).toBe(6000); // 4200 + 1800
    });

    it('should handle adding time to a new day', () => {
      const parentTask = createTaskWithTime('parent', { '2024-01-01': 3600 });
      const subtask = createTaskWithTime('sub', { '2024-01-01': 3600 }, 'parent');

      const stateWithParent: TaskState = {
        ...initialTaskState,
        ids: ['parent', 'sub'],
        entities: {
          parent: { ...parentTask, subTaskIds: ['sub'] },
          sub: subtask,
        },
      };

      // Add time to a new day (2024-01-02)
      const action = TimeTrackingActions.addTimeSpent({
        task: subtask,
        date: '2024-01-02',
        duration: 1800,
        isFromTrackingReminder: false,
      });
      const state = taskReducer(stateWithParent, action);

      expect(state.entities['parent']!.timeSpentOnDay['2024-01-01']).toBe(3600);
      expect(state.entities['parent']!.timeSpentOnDay['2024-01-02']).toBe(1800);
      expect(state.entities['parent']!.timeSpent).toBe(5400);
    });

    it('should correctly update subtask and parent timeSpent totals', () => {
      const parentTask = createTaskWithTime('parent', { '2024-01-01': 1000 });
      const subtask = createTaskWithTime('sub', { '2024-01-01': 1000 }, 'parent');

      const stateWithParent: TaskState = {
        ...initialTaskState,
        ids: ['parent', 'sub'],
        entities: {
          parent: { ...parentTask, subTaskIds: ['sub'] },
          sub: subtask,
        },
      };

      // Add more time
      const action = TimeTrackingActions.addTimeSpent({
        task: subtask,
        date: '2024-01-01',
        duration: 500,
        isFromTrackingReminder: false,
      });
      const state = taskReducer(stateWithParent, action);

      // Subtask should have updated timeSpent
      expect(state.entities['sub']!.timeSpentOnDay['2024-01-01']).toBe(1500);
      expect(state.entities['sub']!.timeSpent).toBe(1500);

      // Parent should have incremental update
      expect(state.entities['parent']!.timeSpentOnDay['2024-01-01']).toBe(1500);
      expect(state.entities['parent']!.timeSpent).toBe(1500);
    });
  });
});
