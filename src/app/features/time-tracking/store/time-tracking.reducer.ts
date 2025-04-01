import { TimeTrackingActions } from './time-tracking.actions';
import { createFeature, createReducer, on } from '@ngrx/store';
import { TimeTrackingState } from '../time-tracking.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';

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

// updateWorkStart$: any = createEffect(() =>
//   this._actions$.pipe(
//     ofType(addTimeSpent),
//     filter(({ task }) => !!task.projectId),
//     concatMap(({ task }) =>
//       this._projectService.getByIdOnce$(task.projectId as string).pipe(first()),
//     ),
//     filter((project: Project) => !project.workStart[this._dateService.todayStr()]),
//     map((project) => {
//       return updateProjectWorkStart({
//         id: project.id,
//         date: this._dateService.todayStr(),
//         newVal: Date.now(),
//       });
//     }),
//   ),
// );

// updateWorkEnd$: Observable<unknown> = createEffect(() =>
//   this._actions$.pipe(
//     ofType(addTimeSpent),
//     filter(({ task }) => !!task.projectId),
//     map(({ task }) => {
//       return updateProjectWorkEnd({
//         id: task.projectId as string,
//         date: this._dateService.todayStr(),
//         newVal: Date.now(),
//       });
//     }),
//   ),
// );

// updateWorkStart$: any = createEffect(() =>
//   this._actions$.pipe(
//     ofType(addTimeSpent),
//     concatMap(({ task }) =>
//       task.parentId
//         ? this._taskService.getByIdOnce$(task.parentId).pipe(first())
//         : of(task),
//     ),
//     filter((task: Task) => task.tagIds && !!task.tagIds.length),
//     concatMap((task: Task) =>
//       this._tagService.getTagsByIds$(task.tagIds).pipe(first()),
//     ),
//     concatMap((tags: Tag[]) =>
//       tags
//         // only if not assigned for day already
//         .filter((tag) => !tag.workStart[this._dateService.todayStr()])
//         .map((tag) =>
//           updateWorkStartForTag({
//             id: tag.id,
//             date: this._dateService.todayStr(),
//             newVal: Date.now(),
//           }),
//         ),
//     ),
//   ),
// );

// updateWorkEnd$: Observable<unknown> = createEffect(() =>
//   this._actions$.pipe(
//     ofType(addTimeSpent),
//     concatMap(({ task }) =>
//       task.parentId
//         ? this._taskService.getByIdOnce$(task.parentId).pipe(first())
//         : of(task),
//     ),
//     filter((task: Task) => task.tagIds && !!task.tagIds.length),
//     concatMap((task: Task) =>
//       this._tagService.getTagsByIds$(task.tagIds).pipe(first()),
//     ),
//     concatMap((tags: Tag[]) =>
//       tags.map((tag) =>
//         updateWorkEndForTag({
//           id: tag.id,
//           date: this._dateService.todayStr(),
//           newVal: Date.now(),
//         }),
//       ),
//     ),
//   ),
// );
