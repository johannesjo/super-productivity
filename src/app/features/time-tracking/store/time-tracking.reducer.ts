import { TimeTrackingActions } from './time-tracking.actions';
import { createFeature, createReducer, on } from '@ngrx/store';
import { TimeTrackingState } from '../time-tracking.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';
import { addTimeSpent } from '../../tasks/store/task.actions';
import { roundTsToMinutes } from '../../../util/round-ts-to-minutes';

export const TIME_TRACKING_FEATURE_KEY = 'timeTracking' as const;

// export const initialTimeTrackingState: TimeTrackingState = {
export const initialTimeTrackingState: TimeTrackingState = {
  tag: {},
  project: {},
  lastFlush: 0,
} as const;

export const timeTrackingReducer = createReducer(
  initialTimeTrackingState,

  on(loadAllData, (state, { appDataComplete }) =>
    (appDataComplete as AppDataCompleteNew).timeTracking
      ? (appDataComplete as AppDataCompleteNew).timeTracking
      : state,
  ),

  on(addTimeSpent, (state, { task, date }) => {
    const isUpdateProject = !!task.projectId;
    const isUpdateTags = task.tagIds && !!task.tagIds.length;
    return {
      ...state,
      ...(isUpdateProject
        ? {
            project: {
              ...state.project,
              [task.projectId]: {
                ...state.project[task.projectId],
                [date]: {
                  ...state.project[task.projectId]?.[date],
                  end: roundTsToMinutes(Date.now()),
                  start: roundTsToMinutes(
                    state.project[task.projectId]?.[date]?.start || Date.now(),
                  ),
                },
              },
            },
          }
        : {}),
      ...(isUpdateTags
        ? {
            tag: {
              ...state.tag,
              ...(task.tagIds as string[]).reduce((acc, tagId) => {
                acc[tagId] = {
                  ...state.tag[tagId],
                  [date]: {
                    ...state.tag[tagId]?.[date],
                    end: roundTsToMinutes(Date.now()),
                    start: roundTsToMinutes(
                      state.tag[tagId]?.[date]?.start || Date.now(),
                    ),
                  },
                };
                return acc;
              }, {}),
            },
          }
        : {}),
    };
  }),

  on(TimeTrackingActions.updateWorkContextData, (state, { ctx, date, updates }) => {
    const prop = ctx.type === 'TAG' ? 'tag' : 'project';
    return {
      ...state,
      [prop]: {
        ...state[prop],
        [ctx.id]: {
          ...state[prop][ctx.id],
          [date]: {
            ...state[prop][ctx.id][date],
            ...updates,
          },
        },
      },
    };
  }),
);

export const timeTrackingFeature = createFeature({
  name: TIME_TRACKING_FEATURE_KEY,
  reducer: timeTrackingReducer,
});
