import * as fromWeekPlanner from './week-planner.reducer';
import { selectWeekPlannerState } from './week-planner.selectors';

describe('WeekPlanner Selectors', () => {
  it('should select the feature state', () => {
    const result = selectWeekPlannerState({
      [fromWeekPlanner.weekPlannerFeatureKey]: {},
    });

    expect(result).toEqual({});
  });
});
