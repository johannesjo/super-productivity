/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { plannerSharedMetaReducer } from './planner-shared.reducer';
import { RootState } from '../../root-state';
import { Task } from '../../../features/tasks/task.model';
import { Action, ActionReducer } from '@ngrx/store';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { PlannerActions } from '../../../features/planner/store/planner.actions';
import {
  createBaseState,
  createMockTask,
  createStateWithExistingTasks,
  expectStateUpdate,
  expectTagUpdate,
} from './test-utils';

describe('plannerSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = plannerSharedMetaReducer(mockReducer);
    baseState = createBaseState();
  });

  describe('PlannerActions.transferTask action', () => {
    const createTransferTaskAction = (
      task: Task,
      today: string,
      targetIndex: number,
      newDay: string,
      prevDay: string,
      targetTaskId?: string,
    ) =>
      PlannerActions.transferTask({
        task,
        today,
        targetIndex,
        newDay,
        prevDay,
        targetTaskId,
      });

    it('should remove task from Today tag when moving from today to different day', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createTransferTaskAction(task, todayStr, 0, 'tomorrow', todayStr);

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['other-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should add task to Today tag when moving from different day to today', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks([], [], [], ['existing-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createTransferTaskAction(task, todayStr, 1, todayStr, 'yesterday');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['existing-task', 'task1'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should insert task at specific position when targetTaskId is provided', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['first-task', 'target-task', 'last-task'],
      );
      const task = createMockTask({ id: 'new-task' });
      const action = createTransferTaskAction(
        task,
        todayStr,
        0,
        todayStr,
        'yesterday',
        'target-task',
      );

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['first-task', 'new-task', 'target-task', 'last-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not change state when transferring within same day', () => {
      const todayStr = getDbDateStr();
      const task = createMockTask({ id: 'task1' });
      const action = createTransferTaskAction(task, todayStr, 0, todayStr, todayStr);

      metaReducer(baseState, action);
      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });

    it('should handle unique task IDs when adding to Today', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createTransferTaskAction(task, todayStr, 0, todayStr, 'yesterday');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'other-task'] }),
        action,
        mockReducer,
        testState,
      );
    });
  });

  describe('PlannerActions.planTaskForDay action', () => {
    const createPlanTaskForDayAction = (
      task: Task,
      day: string,
      isAddToTop: boolean = false,
    ) =>
      PlannerActions.planTaskForDay({
        task,
        day,
        isAddToTop,
      });

    it('should add task to Today tag when planning for today', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks([], [], [], ['existing-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createPlanTaskForDayAction(task, todayStr, false);

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['existing-task', 'task1'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should add task to top of Today tag when isAddToTop is true', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks([], [], [], ['existing-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createPlanTaskForDayAction(task, todayStr, true);

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'existing-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should remove task from Today tag when planning for different day', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createPlanTaskForDayAction(task, 'tomorrow', false);

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['other-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not change state when task is already in Today and planned for today', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createPlanTaskForDayAction(task, todayStr, false);

      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalledWith(testState, action);
    });

    it('should not change state when task is not in Today and not planned for today', () => {
      const testState = createStateWithExistingTasks([], [], [], ['other-task']);
      const task = createMockTask({ id: 'task1' });
      const action = createPlanTaskForDayAction(task, 'tomorrow', false);

      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalledWith(testState, action);
    });
  });

  describe('PlannerActions.moveBeforeTask action', () => {
    const createMoveBeforeTaskAction = (fromTask: Task, toTaskId: string) =>
      PlannerActions.moveBeforeTask({
        fromTask,
        toTaskId,
      });

    it('should move task before target task in Today tag', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['task1', 'middle-task', 'target-task', 'last-task'],
      );
      const fromTask = createMockTask({ id: 'task1' });
      const action = createMoveBeforeTaskAction(fromTask, 'target-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['middle-task', 'task1', 'target-task', 'last-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should remove task from Today when moving to task not in Today', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const fromTask = createMockTask({ id: 'task1' });
      const action = createMoveBeforeTaskAction(fromTask, 'non-today-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['other-task'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle unique task IDs when moving task', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['first-task', 'target-task', 'last-task'],
      );
      const fromTask = createMockTask({ id: 'move-task' });
      const action = createMoveBeforeTaskAction(fromTask, 'target-task');

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('TODAY', {
          taskIds: ['first-task', 'move-task', 'target-task', 'last-task'],
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not change state when fromTask is not in Today and toTask is not in Today', () => {
      const testState = createStateWithExistingTasks([], [], [], ['other-task']);
      const fromTask = createMockTask({ id: 'not-in-today' });
      const action = createMoveBeforeTaskAction(fromTask, 'also-not-in-today');

      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalledWith(testState, action);
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
