/* eslint-disable @typescript-eslint/naming-convention */
import { createActionGroup, props } from '@ngrx/store';
import { WorkContextType } from '../../work-context/work-context.model';
import { TimeTrackingState, TTWorkContextData } from '../time-tracking.model';
import { Task } from '../../tasks/task.model';

export const TimeTrackingActions = createActionGroup({
  source: 'TimeTracking',
  events: {
    'Update Work Context Data': props<{
      ctx: { id: string; type: WorkContextType };
      date: string;
      updates: Partial<TTWorkContextData>;
    }>(),
    'Add time spent': props<{
      task: Task;
      date: string;
      duration: number;
      isFromTrackingReminder: boolean;
    }>(),
    'Update whole State': props<{
      newState: TimeTrackingState;
    }>(),
  },
});
