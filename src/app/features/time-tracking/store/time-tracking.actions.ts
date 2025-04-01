/* eslint-disable @typescript-eslint/naming-convention */
import { createActionGroup, props } from '@ngrx/store';
import { WorkContextType } from '../../work-context/work-context.model';
import { TTWorkContextData } from '../time-tracking.model';

export const TimeTrackingActions = createActionGroup({
  source: 'TimeTracking',
  events: {
    'Update Work Context Data': props<{
      ctx: { id: string; type: WorkContextType };
      date: string;
      updates: Partial<TTWorkContextData>;
    }>(),
  },
});
