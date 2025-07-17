/* eslint-disable @typescript-eslint/naming-convention,@typescript-eslint/explicit-function-return-type */
import { PlannerState, plannerInitialState, plannerReducer } from './planner.reducer';
import { PlannerActions } from './planner.actions';
import { TaskCopy } from '../../tasks/task.model';
import { DEFAULT_TASK } from '../../tasks/task.model';
import { ADD_TASK_PANEL_ID, OVERDUE_LIST_ID } from '../planner.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

describe('Planner Reducer - transferTask action', () => {
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
    today: string = getWorklogStr(),
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

  beforeEach(() => {
    baseState = {
      ...plannerInitialState,
      days: {
        '2025-01-15': ['task1', 'task2'],
        '2025-01-16': ['task3', 'task4'],
        '2025-01-17': [],
      },
    };
  });

  describe('removing task from previous day', () => {
    it('should remove task from prevDay when transferring to another day', () => {
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');

      const result = plannerReducer(baseState, action);

      expect(result.days['2025-01-15']).toEqual(['task2']);
    });

    it('should not update prevDay when it is ADD_TASK_PANEL_ID', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, ADD_TASK_PANEL_ID, '2025-01-17');

      const result = plannerReducer(baseState, action);

      // Days should remain unchanged except for the new day
      expect(result.days['2025-01-15']).toEqual(['task1', 'task2']);
      expect(result.days['2025-01-16']).toEqual(['task3', 'task4']);
    });

    it('should not update prevDay when it is OVERDUE_LIST_ID', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, OVERDUE_LIST_ID, '2025-01-17');

      const result = plannerReducer(baseState, action);

      // Days should remain unchanged except for the new day
      expect(result.days['2025-01-15']).toEqual(['task1', 'task2']);
      expect(result.days['2025-01-16']).toEqual(['task3', 'task4']);
    });

    it('should not update prevDay when it equals today', () => {
      const today = getWorklogStr();
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, today, '2025-01-17', 0, today);

      const result = plannerReducer(baseState, action);

      // Should only update the new day
      expect(result.days[today]).toBeUndefined();
    });

    it('should handle prevDay that does not exist in state', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-20', '2025-01-17');

      const result = plannerReducer(baseState, action);

      // Should not create an entry for non-existent prevDay
      expect(result.days['2025-01-20']).toBeUndefined();
      expect(result.days['2025-01-17']).toEqual(['task5']);
    });
  });

  describe('adding task to new day', () => {
    it('should add task to newDay at targetIndex', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-16', 1);

      const result = plannerReducer(baseState, action);

      expect(result.days['2025-01-16']).toEqual(['task3', 'task5', 'task4']);
    });

    it('should add task to empty day', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17', 0);

      const result = plannerReducer(baseState, action);

      expect(result.days['2025-01-17']).toEqual(['task5']);
    });

    it('should create new day entry if it does not exist', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-20', 0);

      const result = plannerReducer(baseState, action);

      expect(result.days['2025-01-20']).toEqual(['task5']);
    });

    it('should not update newDay when it is ADD_TASK_PANEL_ID', () => {
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', ADD_TASK_PANEL_ID);

      const result = plannerReducer(baseState, action);

      // Should only remove from prevDay
      expect(result.days['2025-01-15']).toEqual(['task2']);
      expect(result.days[ADD_TASK_PANEL_ID]).toBeUndefined();
    });

    it('should not update newDay when it equals today', () => {
      const today = getWorklogStr();
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', today, 0, today);

      const result = plannerReducer(baseState, action);

      // Should only remove from prevDay
      expect(result.days['2025-01-15']).toEqual(['task2']);
      expect(result.days[today]).toBeUndefined();
    });

    it('should handle unique task IDs when adding', () => {
      // Task3 is already in 2025-01-16
      const task = createMockTask('task3');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-16', 0);

      const result = plannerReducer(baseState, action);

      // Should not duplicate task3
      expect(result.days['2025-01-16']).toEqual(['task3', 'task4']);
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

      const action = createTransferTaskAction(parentTask, '2025-01-15', '2025-01-16', 2);

      const result = plannerReducer(stateWithSubtasks, action);

      // Should remove subtasks when adding parent
      expect(result.days['2025-01-16']).toEqual(['task3', 'parent1', 'task4']);
    });
  });

  describe('moving within same day', () => {
    it('should handle transferring within the same day', () => {
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-15', 1);

      const result = plannerReducer(baseState, action);

      // When moving within the same day, task is removed then re-added at target position
      // unique() ensures no duplicates, so task1 stays at original position
      expect(result.days['2025-01-15']).toEqual(['task1', 'task2']);
    });
  });

  describe('edge cases', () => {
    it('should handle transferring from today to future day', () => {
      const today = getWorklogStr();
      const task = createMockTask('task1');
      const stateWithToday: PlannerState = {
        ...baseState,
        days: {
          ...baseState.days,
          [today]: ['todayTask1', 'todayTask2'],
        },
      };

      const action = createTransferTaskAction(task, today, '2025-01-20', 0, today);

      const result = plannerReducer(stateWithToday, action);

      // Should not modify today but should add to future day
      expect(result.days[today]).toEqual(['todayTask1', 'todayTask2']);
      expect(result.days['2025-01-20']).toEqual(['task1']);
    });

    it('should handle transferring to today from past day', () => {
      const today = getWorklogStr();
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', today, 0, today);

      const result = plannerReducer(baseState, action);

      // Should remove from past day but not add to today
      expect(result.days['2025-01-15']).toEqual(['task2']);
      expect(result.days[today]).toBeUndefined();
    });

    it('should handle empty state', () => {
      const emptyState: PlannerState = {
        ...plannerInitialState,
        days: {},
      };
      const task = createMockTask('task1');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');

      const result = plannerReducer(emptyState, action);

      // Should only create entry for new day
      expect(result.days).toEqual({
        '2025-01-17': ['task1'],
      });
    });

    it('should handle targetIndex beyond array bounds', () => {
      const task = createMockTask('task5');
      const action = createTransferTaskAction(task, '2025-01-15', '2025-01-16', 10);

      const result = plannerReducer(baseState, action);

      // Should add at the end
      expect(result.days['2025-01-16']).toEqual(['task3', 'task4', 'task5']);
    });
  });
});
