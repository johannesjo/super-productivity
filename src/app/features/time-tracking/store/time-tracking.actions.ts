/* eslint-disable @typescript-eslint/naming-convention */
import { createActionGroup, emptyProps } from '@ngrx/store';

export const TimeTrackingActions = createActionGroup({
  source: 'TimeTracking',
  events: {
    'Load TimeTracking': emptyProps(),
  },
});
