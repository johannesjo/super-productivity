import { createFeature, createReducer, on } from '@ngrx/store';
import { TimeTrackingActions } from './time-tracking.actions';
import { TimeTrackingState } from '../time-tracking.model';

export const timeTrackingFeatureKey = 'timeTracking';

export const initialTimeTrackingState: TimeTrackingState = {
  break: {},
  tag: {},
  project: {},
  task: {},
  lastFlush: 0,
};

export const timeTrackingReducer = createReducer(
  initialTimeTrackingState,
  on(TimeTrackingActions.loadTimeTracking, (state) => state),
);

export const timeTrackingFeature = createFeature({
  name: timeTrackingFeatureKey,
  reducer: timeTrackingReducer,
});
