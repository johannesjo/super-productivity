import { createFeatureSelector } from '@ngrx/store';
import * as fromTimeTracking from './time-tracking.reducer';

export const selectTimeTrackingState = createFeatureSelector<fromTimeTracking.State>(
  fromTimeTracking.timeTrackingFeatureKey,
);
