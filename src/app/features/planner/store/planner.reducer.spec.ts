/* eslint-disable @typescript-eslint/naming-convention */
import { plannerInitialState, plannerReducer } from './planner.reducer';
import { PlannerActions } from './planner.actions';
import { DEFAULT_TASK } from '../../tasks/task.model';
import * as getDbDateStrUtil from '../../../util/get-db-date-str';

describe('Planner Reducer', () => {
  describe('an unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;
      const result = plannerReducer(plannerInitialState, action);
      expect(result).toBe(plannerInitialState);
    });
  });

  describe('moveBeforeTask', () => {
    it('should do nothing when the target does not exist', () => {
      const action = PlannerActions.moveBeforeTask({
        fromTask: { ...DEFAULT_TASK, id: '1', projectId: 'test' },
        toTaskId: '2',
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            someDay: [],
          },
        },
        action,
      );
      expect(result).toEqual({
        ...plannerInitialState,
        days: {
          someDay: [],
        },
      });
    });

    it('should move to index before target task', () => {
      const action = PlannerActions.moveBeforeTask({
        fromTask: { ...DEFAULT_TASK, id: '1', projectId: 'test' },
        toTaskId: '2',
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            someDay: ['2'],
          },
        },
        action,
      );
      expect(result).toEqual({
        ...plannerInitialState,
        days: {
          someDay: ['1', '2'],
        },
      });
    });
  });

  describe('planTaskForDay', () => {
    it('should not add task to planner days when planning for today', () => {
      const todayStr = getDbDateStrUtil.getDbDateStr();
      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: todayStr,
        isAddToTop: false,
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            '2024-01-16': ['task2'],
          },
        },
        action,
      );
      expect(result.days[todayStr]).toBeUndefined();
      expect(result.days['2024-01-16']).toEqual(['task2']);
    });

    it('should remove task from all days when planning for today', () => {
      const todayStr = getDbDateStrUtil.getDbDateStr();
      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: todayStr,
        isAddToTop: false,
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            '2024-01-16': ['task1', 'task2'],
            '2024-01-17': ['task3'],
          },
        },
        action,
      );
      expect(result.days[todayStr]).toBeUndefined();
      expect(result.days['2024-01-16']).toEqual(['task2']);
      expect(result.days['2024-01-17']).toEqual(['task3']);
    });

    it('should add task to planner days when planning for future day', () => {
      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: '2024-01-16', // future day
        isAddToTop: false,
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            '2024-01-16': ['task2'],
          },
        },
        action,
      );
      expect(result.days['2024-01-16']).toEqual(['task2', 'task1']);
    });

    it('should add task to top when isAddToTop is true', () => {
      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: '2024-01-16',
        isAddToTop: true,
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            '2024-01-16': ['task2'],
          },
        },
        action,
      );
      expect(result.days['2024-01-16']).toEqual(['task1', 'task2']);
    });

    it('should handle reordering task within same day', () => {
      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: '2024-01-16',
        isAddToTop: false,
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            '2024-01-16': ['task1', 'task2', 'task3'],
          },
        },
        action,
      );
      expect(result.days['2024-01-16']).toEqual(['task2', 'task3', 'task1']);
    });

    it('should remove subtasks when moving parent task', () => {
      const action = PlannerActions.planTaskForDay({
        task: {
          ...DEFAULT_TASK,
          id: 'parent',
          projectId: 'test',
          subTaskIds: ['sub1', 'sub2'],
        },
        day: '2024-01-16',
        isAddToTop: false,
      });
      const result = plannerReducer(
        {
          ...plannerInitialState,
          days: {
            '2024-01-16': ['task1', 'sub1', 'task2', 'sub2'],
          },
        },
        action,
      );
      expect(result.days['2024-01-16']).toEqual(['task1', 'task2', 'parent']);
    });
  });
});
