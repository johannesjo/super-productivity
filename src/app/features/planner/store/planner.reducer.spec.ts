import { plannerInitialState, plannerReducer } from './planner.reducer';
import { PlannerActions } from './planner.actions';
import { TaskCopy } from '../../tasks/task.model';

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
        fromTask: { id: '1' } as TaskCopy,
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
        fromTask: { id: '1' } as TaskCopy,
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
});
