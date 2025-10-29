import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  auditTime,
  filter,
  first,
  map,
  skip,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { MemoizedSelector, select, Store } from '@ngrx/store';
import { PfapiService } from '../../pfapi/pfapi.service';
import { selectBoardsState } from '../../features/boards/store/boards.selectors';
import { selectConfigFeatureState } from '../../features/config/store/global-config.reducer';
import { selectIssueProviderState } from '../../features/issue/store/issue-provider.selectors';
import { selectNoteFeatureState } from '../../features/note/store/note.reducer';
import { selectProjectFeatureState } from '../../features/project/store/project.selectors';
import { selectTagFeatureState } from '../../features/tag/store/tag.reducer';
import { selectPlannerState } from '../../features/planner/store/planner.selectors';
import { selectSimpleCounterFeatureState } from '../../features/simple-counter/store/simple-counter.reducer';
import { selectMetricFeatureState } from '../../features/metric/store/metric.selectors';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { RootState } from '../root-state';
import { selectTaskFeatureState } from '../../features/tasks/store/task.selectors';
import { TimeTrackingActions } from '../../features/time-tracking/store/time-tracking.actions';
import {
  setCurrentTask,
  setSelectedTask,
  toggleStart,
  toggleTaskHideSubTasks,
  unsetCurrentTask,
  updateTaskUi,
} from '../../features/tasks/store/task.actions';
import { TIME_TRACKING_TO_DB_INTERVAL } from '../../app.constants';
import { environment } from '../../../environments/environment';
import { selectTimeTrackingState } from '../../features/time-tracking/store/time-tracking.selectors';
import { TaskSharedActions } from '../meta/task-shared.actions';
import { loadAllData } from '../meta/load-all-data.action';
import { selectTaskRepeatCfgFeatureState } from '../../features/task-repeat-cfg/store/task-repeat-cfg.selectors';
import { Log } from '../../core/log';
import { selectMenuTreeState } from '../../features/menu-tree/store/menu-tree.selectors';

const ALWAYS_IGNORED_ACTIONS = [loadAllData.type];

@Injectable()
export class SaveToDbEffects {
  private _store = inject(Store<RootState>);
  private _actions = inject(Actions);
  private _pfapiService = inject(PfapiService);
  private _dataInitStateService = inject(DataInitStateService);

  // --------------------------------------------------
  // NOTE TimeTrackingState is also a bit special, since we throttle addTimeSpent => TimeTrackingEffects
  // NOTE: reminders are saved in reminderService => ReminderService
  // --------------------------------------------------

  tag$ = this.createSaveEffect(selectTagFeatureState, 'tag');
  project$ = this.createSaveEffect(selectProjectFeatureState, 'project');
  menuTree$ = this.createSaveEffect(selectMenuTreeState, 'menuTree');
  globalCfg$ = this.createSaveEffect(selectConfigFeatureState, 'globalConfig');
  planner$ = this.createSaveEffect(selectPlannerState, 'planner');
  boards$ = this.createSaveEffect(selectBoardsState, 'boards');
  issueProvider$ = this.createSaveEffect(selectIssueProviderState, 'issueProvider');
  note$ = this.createSaveEffect(selectNoteFeatureState, 'note');
  metric$ = this.createSaveEffect(selectMetricFeatureState, 'metric');
  simpleCounter$ = this.createSaveEffect(
    selectSimpleCounterFeatureState,
    'simpleCounter',
  );
  taskRepeatCfg$ = this.createSaveEffect(
    selectTaskRepeatCfgFeatureState,
    'taskRepeatCfg',
  );

  // ---------------------------------------------------

  task$ = this.createSaveEffectWithFilter(selectTaskFeatureState, 'task', [
    TimeTrackingActions.addTimeSpent.type,
    setCurrentTask.type,
    setSelectedTask.type,
    updateTaskUi.type,
    toggleTaskHideSubTasks.type,
    unsetCurrentTask.type,
    toggleStart.type,
    TaskSharedActions.removeTasksFromTodayTag.type,
  ]);

  updateTaskAuditTime$ = createEffect(
    () =>
      this._actions.pipe(
        ofType(
          // TIME TRACKING
          TimeTrackingActions.addTimeSpent,
        ),
        auditTime(TIME_TRACKING_TO_DB_INTERVAL),
        switchMap(() => this._store.pipe(select(selectTaskFeatureState), first())),
        tap((taskState) => {
          this._pfapiService.m.task.save(
            {
              ...taskState,

              // make sure those are never set to something
              selectedTaskId: environment.production ? null : taskState.selectedTaskId,
              currentTaskId: null,
            },
            { isUpdateRevAndLastUpdate: true },
          );
        }),
      ),
    { dispatch: false },
  );

  // ---------------------------------------------------

  timeTracking$ = this.createSaveEffectWithFilter(
    selectTimeTrackingState,
    'timeTracking',
    [TimeTrackingActions.addTimeSpent.type],
  );

  updateTimeTrackingStorageAuditTime$ = createEffect(
    () =>
      this._actions.pipe(
        ofType(TimeTrackingActions.addTimeSpent),
        auditTime(TIME_TRACKING_TO_DB_INTERVAL),
        withLatestFrom(this._store.select(selectTimeTrackingState)),
        tap(([, ttState]) => {
          this._pfapiService.m.timeTracking.save(ttState, {
            isUpdateRevAndLastUpdate: true,
          });
        }),
      ),
    { dispatch: false },
  );

  // ---------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private createSaveEffect<K extends keyof typeof this._pfapiService.m>(
    selector: MemoizedSelector<
      RootState,
      Parameters<(typeof this._pfapiService.m)[K]['save']>[0]
    >,
    modelKey: K,
  ) {
    return createEffect(
      () =>
        this._dataInitStateService.isAllDataLoadedInitially$.pipe(
          switchMap(() => this._store.select(selector)),
          skip(1),
          switchMap((state) =>
            // thankfully the next action after is the action that triggered the change
            this._actions.pipe(
              first(),
              map((a) => [state, a]),
            ),
          ),
          filter(([state, action]) => !ALWAYS_IGNORED_ACTIONS.includes(action.type)),
          switchMap(([state]) =>
            this._pfapiService.m[modelKey].save(state, {
              isUpdateRevAndLastUpdate: true,
            }),
          ),
        ),
      { dispatch: false },
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private createSaveEffectWithFilter<K extends keyof typeof this._pfapiService.m>(
    selector: MemoizedSelector<
      RootState,
      Parameters<(typeof this._pfapiService.m)[K]['save']>[0]
    >,
    modelKey: K,
    ignoredActionsTypes: string[],
  ) {
    const ignoredActionTypesToUse = [...ALWAYS_IGNORED_ACTIONS, ...ignoredActionsTypes];
    return createEffect(
      () =>
        this._dataInitStateService.isAllDataLoadedInitially$.pipe(
          switchMap(() => this._store.select(selector)),
          skip(1),
          switchMap((state) =>
            // thankfully the next action after is the action that triggered the change
            this._actions.pipe(
              first(),
              map((a) => [state, a]),
            ),
          ),
          tap(([state, action]) =>
            Log.log(
              `__DB_S_${modelKey}__`,
              !ignoredActionTypesToUse.includes(action.type),
              action.type,
            ),
          ),
          filter(([state, action]) => !ignoredActionTypesToUse.includes(action.type)),
          switchMap(([state]) =>
            this._pfapiService.m[modelKey].save(state, {
              isUpdateRevAndLastUpdate: true,
            }),
          ),
        ),
      { dispatch: false },
    );
  }
}
