import { timeTrackingReducer, initialTimeTrackingState } from './time-tracking.reducer';

describe('TimeTracking Reducer', () => {
  describe('an unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;

      const result = timeTrackingReducer(initialTimeTrackingState, action);

      expect(result).toBe(initialTimeTrackingState);
    });
  });
});
