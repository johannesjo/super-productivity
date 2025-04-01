import * as fromTimeTracking from './time-tracking.reducer';
import { selectTimeTrackingState } from './time-tracking.selectors';

describe('TimeTracking Selectors', () => {
  it('should select the feature state', () => {
    const result = selectTimeTrackingState({
      [fromTimeTracking.timeTrackingFeatureKey]: {},
    });

    expect(result).toEqual({});
  });
});
