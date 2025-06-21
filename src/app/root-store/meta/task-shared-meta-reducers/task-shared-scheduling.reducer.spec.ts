/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { taskSharedSchedulingMetaReducer } from './task-shared-scheduling.reducer';
import { TaskSharedActions } from '../task-shared.actions';
import { RootState } from '../../root-state';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { Task } from '../../../features/tasks/task.model';
import { Action, ActionReducer } from '@ngrx/store';
import {
  createBaseState,
  createMockTask,
  createStateWithExistingTasks,
  expectStateUpdate,
  expectTagUpdate,
} from './test-utils';

describe('taskSharedSchedulingMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = taskSharedSchedulingMetaReducer(mockReducer);
    baseState = createBaseState();
  });

  describe('scheduleTaskWithTime action', () => {
    const createScheduleAction = (
      taskOverrides: Partial<Task> = {},
      dueWithTime: number,
    ) =>
      TaskSharedActions.scheduleTaskWithTime({
        task: createMockTask(taskOverrides),
        dueWithTime,
        isMoveToBacklog: false,
      });

    it('should add task to Today tag when scheduled for today', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1'], []);
      const action = createScheduleAction({}, Date.now());

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should remove task from Today tag when scheduled for different day', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1']);
      // eslint-disable-next-line no-mixed-operators
      const tomorrowTimestamp = Date.now() + 24 * 60 * 60 * 1000;
      const action = createScheduleAction({}, tomorrowTimestamp);

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: [] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not change state when task is already correctly scheduled', () => {
      const now = Date.now();
      const testState = createStateWithExistingTasks([], [], [], ['task1']);
      // Update the task to already have the correct dueWithTime
      const task1 = testState[TASK_FEATURE_NAME].entities.task1 as Task;
      testState[TASK_FEATURE_NAME].entities.task1 = {
        ...task1,
        dueWithTime: now,
        dueDay: undefined,
      } as Task;
      const action = createScheduleAction({}, now);

      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalledWith(testState, action);
    });
  });

  describe('unScheduleTask action', () => {
    it('should remove task from Today tag when task is in Today', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const action = TaskSharedActions.unscheduleTask({ id: 'task1' });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['other-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not change state when task is not in Today tag', () => {
      const action = TaskSharedActions.unscheduleTask({ id: 'task1' });

      metaReducer(baseState, action);
      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });

  describe('planTasksForToday action', () => {
    it('should add new tasks to the top of Today tag', () => {
      const testState = createStateWithExistingTasks([], [], [], ['existing-task']);
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'task2', 'existing-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not add tasks that are already in Today tag', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['task1', 'existing-task'],
      );
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task2', 'task1', 'existing-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle parentTaskMap filtering', () => {
      const testState = createStateWithExistingTasks([], [], [], ['parent-task']);
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['subtask1', 'task2'],
        parentTaskMap: { subtask1: 'parent-task' },
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task2', 'parent-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should remove tasks from planner days when adding to Today', () => {
      const testState = {
        ...createStateWithExistingTasks([], [], [], []),
        planner: {
          ...createStateWithExistingTasks([], [], [], []).planner,
          days: {
            '2024-01-01': ['task1', 'task2', 'keep-task'],
            '2024-01-02': ['task2', 'other-task'],
          },
        },
      };
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      metaReducer(testState, action);
      const updatedState = mockReducer.calls.mostRecent().args[0];

      expect(updatedState.planner.days['2024-01-01']).toEqual(['keep-task']);
      expect(updatedState.planner.days['2024-01-02']).toEqual(['other-task']);
    });
  });

  describe('removeTasksFromTodayTag action', () => {
    it('should remove specified tasks from Today tag', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['task1', 'task2', 'keep-task'],
      );
      const action = TaskSharedActions.removeTasksFromTodayTag({
        taskIds: ['task1', 'task2'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['keep-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle empty taskIds array', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'task2']);
      const action = TaskSharedActions.removeTasksFromTodayTag({ taskIds: [] });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'task2'] }),
        action,
        mockReducer,
        testState,
      );
    });
  });

  describe('TaskSharedActions.moveTaskInTodayTagList action', () => {
    const createMoveTaskInTodayTagListAction = (toTaskId: string, fromTaskId: string) =>
      TaskSharedActions.moveTaskInTodayTagList({
        toTaskId,
        fromTaskId,
      });

    it('should move task before target task in Today tag', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['first-task', 'move-task', 'middle-task', 'target-task', 'last-task'],
      );
      const action = createMoveTaskInTodayTagListAction('target-task', 'move-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['first-task', 'middle-task', 'move-task', 'target-task', 'last-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle moving task to beginning of list', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['first-task', 'move-task', 'last-task'],
      );
      const action = createMoveTaskInTodayTagListAction('first-task', 'move-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['move-task', 'first-task', 'last-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle moving task to end of list', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['move-task', 'middle-task', 'last-task'],
      );
      const action = createMoveTaskInTodayTagListAction('last-task', 'move-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['middle-task', 'move-task', 'last-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle single task in Today list', () => {
      const testState = createStateWithExistingTasks([], [], [], ['only-task']);
      const action = createMoveTaskInTodayTagListAction('only-task', 'only-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['only-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle empty Today list gracefully', () => {
      const testState = createStateWithExistingTasks([], [], [], []);
      const action = createMoveTaskInTodayTagListAction('target-task', 'move-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: [],
        }),
        action,
        mockReducer,
        testState,
      );
    });
  });

  describe('other actions', () => {
    it('should pass through other actions to the reducer', () => {
      const action = { type: 'SOME_OTHER_ACTION' };
      metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });
});
