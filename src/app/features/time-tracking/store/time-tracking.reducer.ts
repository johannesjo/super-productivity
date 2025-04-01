import { TimeTrackingActions } from './time-tracking.actions';
import { createFeature, createReducer, on } from '@ngrx/store';
import { TimeTrackingState } from '../time-tracking.model';

export const TIME_TRACKING_FEATURE_KEY = 'timeTracking' as const;

// export const initialTimeTrackingState: TimeTrackingState = {
export const initialTimeTrackingState: TimeTrackingState = {
  tag: {},
  project: {},
  lastFlush: 0,
} as const;

export const timeTrackingReducer = createReducer(
  initialTimeTrackingState,

  on(TimeTrackingActions.loadTimeTracking, (state) => state),
);

export const timeTrackingFeature = createFeature({
  name: TIME_TRACKING_FEATURE_KEY,
  reducer: timeTrackingReducer,
});
