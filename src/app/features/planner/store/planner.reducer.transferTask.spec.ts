/* eslint-disable @typescript-eslint/naming-convention,@typescript-eslint/explicit-function-return-type */
import {
  PlannerState,
  plannerInitialState,
  plannerReducer,
  plannerFeatureKey,
} from './planner.reducer';
import { PlannerActions } from './planner.actions';
import { TaskCopy } from '../../tasks/task.model';
import { DEFAULT_TASK } from '../../tasks/task.model';
import { ADD_TASK_PANEL_ID, OVERDUE_LIST_ID } from '../planner.model';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { createCombinedTaskSharedMetaReducer } from '../../../root-store/meta/task-shared-meta-reducers/test-helpers';
import { RootState } from '../../../root-store/root-state';
import { TASK_FEATURE_NAME, initialTaskState } from '../../tasks/store/task.reducer';
import { TAG_FEATURE_NAME, initialTagState } from '../../tag/store/tag.reducer';
import { TODAY_TAG } from '../../tag/tag.const';

describe('Planner Reducer - transferTask action', () => {
  // Apply meta-reducers to simulate the full reducer chain
  const reducerWithMetaReducers = createCombinedTaskSharedMetaReducer((state, action) => {
    const rootState = (state as RootState) || {
      [TASK_FEATURE_NAME]: initialTaskState,
      [TAG_FEATURE_NAME]: {
        ...initialTagState,
        entities: {
          [TODAY_TAG.id]: TODAY_TAG,
        },
        ids: [TODAY_TAG.id],
      },
      [plannerFeatureKey]: plannerInitialState,
    };

    return {
      ...rootState,
      [plannerFeatureKey]: plannerReducer(rootState[plannerFeatureKey], action),
    };
  });
  const createMockTask = (id: string, partial: Partial<TaskCopy> = {}): TaskCopy =>
    ({
      ...DEFAULT_TASK,
      id,
      title: `Task ${id}`,
      subTaskIds: [],
      projectId: 'project1',
      ...partial,
    }) as TaskCopy;

  const createTransferTaskAction = (
    task: TaskCopy,
    prevDay: string,
    newDay: string,
    targetIndex: number = 0,
    today: string = getDbDateStr(),
    targetTaskId?: string,
  ) =>
    PlannerActions.transferTask({
      task,
      prevDay,
      newDay,
      targetIndex,
      today,
      targetTaskId,
    });

  let baseState: PlannerState;
  let rootState: RootState;

  beforeEach(() => {
    baseState = {
      ...plannerInitialState,
      days: {
        '2025-01-15': ['task1', 'task2'],
        '2025-01-16': ['task3', 'task4'],
        '2025-01-17': [],
      },
    };

    // Create root state with all necessary slices
    rootState = {
      [TASK_FEATURE_NAME]: {
        ...initialTaskState,
        entities: {
          task1: createMockTask('task1'),
          task2: createMockTask('task2'),
          task3: createMockTask('task3'),
          task4: createMockTask('task4'),
          task5: createMockTask('task5'),
        },
        ids: ['task1', 'task2', 'task3', 'task4', 'task5'],
      },
      [TAG_FEATURE_NAME]: {
        ...initialTagState,
        entities: {
          [TODAY_TAG.id]: TODAY_TAG,
        },
        ids: [TODAY_TAG.id],
      },
      [plannerFeatureKey]: baseState,
    } as any as RootState;
  });

  describe('removing task from previous day', () => {
    it('should remove task from prevDay when transferring to another day', () => {
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      expect(plannerState.days['2025-01-15']).toEqual(['task2']);
    });

    it('should not update prevDay when it is ADD_TASK_PANEL_ID', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, ADD_TASK_PANEL_ID, '2025-01-17');

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Days should remain unchanged except for the new day
      expect(plannerState.days['2025-01-15']).toEqual(['task1', 'task2']);
      expect(plannerState.days['2025-01-16']).toEqual(['task3', 'task4']);
    });

    it('should not update prevDay when it is OVERDUE_LIST_ID', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, OVERDUE_LIST_ID, '2025-01-17');

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Days should remain unchanged except for the new day
      expect(plannerState.days['2025-01-15']).toEqual(['task1', 'task2']);
      expect(plannerState.days['2025-01-16']).toEqual(['task3', 'task4']);
    });

    it('should not update prevDay when it equals today', () => {
      const today = getDbDateStr();
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, today, '2025-01-17', 0, today);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should only update the new day
      expect(plannerState.days[today]).toBeUndefined();
    });

    it('should handle prevDay that does not exist in state', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-20', '2025-01-17');

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should not create an entry for non-existent prevDay
      expect(plannerState.days['2025-01-20']).toBeUndefined();
      expect(plannerState.days['2025-01-17']).toEqual(['task5']);
    });
  });

  describe('adding task to new day', () => {
    it('should add task to newDay at targetIndex', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-16', 1);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      expect(plannerState.days['2025-01-16']).toEqual(['task3', 'task5', 'task4']);
    });

    it('should add task to empty day', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17', 0);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      expect(plannerState.days['2025-01-17']).toEqual(['task5']);
    });

    it('should create new day entry if it does not exist', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-20', 0);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      expect(plannerState.days['2025-01-20']).toEqual(['task5']);
    });

    it('should not update newDay when it is ADD_TASK_PANEL_ID', () => {
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', ADD_TASK_PANEL_ID);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should only remove from prevDay
      expect(plannerState.days['2025-01-15']).toEqual(['task2']);
      expect(plannerState.days[ADD_TASK_PANEL_ID]).toBeUndefined();
    });

    it('should not update newDay when it equals today', () => {
      const today = getDbDateStr();
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', today, 0, today);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should only remove from prevDay
      expect(plannerState.days['2025-01-15']).toEqual(['task2']);
      expect(plannerState.days[today]).toBeUndefined();
    });

    it('should handle unique task IDs when adding', () => {
      // Task3 is already in 2025-01-16
      const task = createMockTask('task3');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-16', 0);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should not duplicate task3
      expect(plannerState.days['2025-01-16']).toEqual(['task3', 'task4']);
    });

    it('should filter out subtasks when moving parent task', () => {
      const parentTask = createMockTask('parent1', { subTaskIds: ['sub1', 'sub2'] });
      const stateWithSubtasks: PlannerState = {
        ...baseState,
        days: {
          ...baseState.days,
          '2025-01-16': ['task3', 'sub1', 'parent1', 'sub2', 'task4'],
        },
      };

      const customRootState = {
        ...rootState,
        [plannerFeatureKey]: stateWithSubtasks,
        [TASK_FEATURE_NAME]: {
          ...rootState[TASK_FEATURE_NAME],
          entities: {
            ...rootState[TASK_FEATURE_NAME].entities,
            parent1: parentTask,
          },
        },
      } as any as RootState;

      const action = createTransferTaskAction(parentTask, '2025-01-15', '2025-01-16', 2);

      const result = reducerWithMetaReducers(customRootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should remove subtasks when adding parent
      expect(plannerState.days['2025-01-16']).toEqual(['task3', 'parent1', 'task4']);
    });
  });

  describe('moving within same day', () => {
    it('should handle transferring within the same day', () => {
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-15', 1);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // When moving within the same day, task is removed then re-added at target position
      // unique() ensures no duplicates, which causes the task to move
      expect(plannerState.days['2025-01-15']).toEqual(['task2', 'task1']);
    });
  });

  describe('edge cases', () => {
    it('should handle transferring from today to future day', () => {
      const today = getDbDateStr();
      const task = createMockTask('task1');
      const stateWithToday: PlannerState = {
        ...baseState,
        days: {
          ...baseState.days,
          [today]: ['todayTask1', 'todayTask2'],
        },
      };

      const customRootState = {
        ...rootState,
        [plannerFeatureKey]: stateWithToday,
      } as any as RootState;

      const action = createTransferTaskAction(task, today, '2025-01-20', 0, today);

      const result = reducerWithMetaReducers(customRootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should not modify today but should add to future day
      expect(plannerState.days[today]).toEqual(['todayTask1', 'todayTask2']);
      expect(plannerState.days['2025-01-20']).toEqual(['task1']);
    });

    it('should handle transferring to today from past day', () => {
      const today = getDbDateStr();
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', today, 0, today);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should remove from past day but not add to today
      expect(plannerState.days['2025-01-15']).toEqual(['task2']);
      expect(plannerState.days[today]).toBeUndefined();
    });

    it('should handle empty state', () => {
      const emptyState: PlannerState = {
        ...plannerInitialState,
        days: {},
      };
      const customRootState = {
        ...rootState,
        [plannerFeatureKey]: emptyState,
      } as any as RootState;

      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');

      const result = reducerWithMetaReducers(customRootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should only create entry for new day
      expect(plannerState.days).toEqual({
        '2025-01-17': ['task1'],
      });
    });

    it('should handle targetIndex beyond array bounds', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-16', 10);

      const result = reducerWithMetaReducers(rootState, action) as RootState;
      const plannerState = result[plannerFeatureKey] as PlannerState;

      // Should add at the end
      expect(plannerState.days['2025-01-16']).toEqual(['task3', 'task4', 'task5']);
    });
  });
});
