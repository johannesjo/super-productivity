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
import { GlobalConfigService } from '../../features/config/global-config.service';

const ALWAYS_IGNORED_ACTIONS = [loadAllData.type];

@Injectable()
export class SaveToDbEffects {
  private _store = inject(Store<RootState>);
  private _actions = inject(Actions);
  private _pfapiService = inject(PfapiService);
  private _dataInitStateService = inject(DataInitStateService);
  private _globalConfigService = inject(GlobalConfigService);

  // --------------------------------------------------
  // NOTE: These effects are DISABLED when useOperationLogSync is true.
  // When operation log sync is enabled, persistence happens via OperationLogEffects
  // which writes to SUP_OPS IndexedDB instead of the 'pf' database.
  // --------------------------------------------------

  tag$ = this._createSaveEffect(selectTagFeatureState, 'tag');
  project$ = this._createSaveEffect(selectProjectFeatureState, 'project');
  menuTree$ = this._createSaveEffect(selectMenuTreeState, 'menuTree');
  globalCfg$ = this._createSaveEffect(selectConfigFeatureState, 'globalConfig');
  planner$ = this._createSaveEffect(selectPlannerState, 'planner');
  boards$ = this._createSaveEffect(selectBoardsState, 'boards');
  issueProvider$ = this._createSaveEffect(selectIssueProviderState, 'issueProvider');
  note$ = this._createSaveEffect(selectNoteFeatureState, 'note');
  metric$ = this._createSaveEffect(selectMetricFeatureState, 'metric');
  simpleCounter$ = this._createSaveEffect(
    selectSimpleCounterFeatureState,
    'simpleCounter',
  );
  taskRepeatCfg$ = this._createSaveEffect(
    selectTaskRepeatCfgFeatureState,
    'taskRepeatCfg',
  );

  // ---------------------------------------------------
  task$ = this._createSaveEffectWithFilter(selectTaskFeatureState, 'task', [
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
        ofType(TimeTrackingActions.addTimeSpent),
        withLatestFrom(this._globalConfigService.sync$),
        filter(([, syncCfg]) => !syncCfg?.useOperationLogSync),
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
  timeTracking$ = this._createSaveEffectWithFilter(
    selectTimeTrackingState,
    'timeTracking',
    [TimeTrackingActions.addTimeSpent.type],
  );

  updateTimeTrackingStorageAuditTime$ = createEffect(
    () =>
      this._actions.pipe(
        ofType(TimeTrackingActions.addTimeSpent),
        withLatestFrom(this._globalConfigService.sync$),
        filter(([, syncCfg]) => !syncCfg?.useOperationLogSync),
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
  private _createSaveEffect<K extends keyof typeof this._pfapiService.m>(
    selector: MemoizedSelector<
      RootState,
      Parameters<(typeof this._pfapiService.m)[K]['save']>[0]
    >,
    modelKey: K,
  ) {
    return createEffect(
      () =>
        this._dataInitStateService.isAllDataLoadedInitially$.pipe(
          switchMap(() =>
            this._globalConfigService.sync$.pipe(
              // Only enable when operation log sync is DISABLED
              filter((syncCfg) => !syncCfg?.useOperationLogSync),
              switchMap(() => this._store.select(selector)),
              skip(1),
              switchMap((state) =>
                // thankfully the next action after is the action that triggered the change
                this._actions.pipe(
                  first(),
                  map((a) => [state, a] as const),
                ),
              ),
              filter(([, action]) => !ALWAYS_IGNORED_ACTIONS.includes(action.type)),
              switchMap(([state]) =>
                this._pfapiService.m[modelKey].save(state, {
                  isUpdateRevAndLastUpdate: true,
                }),
              ),
            ),
          ),
        ),
      { dispatch: false },
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private _createSaveEffectWithFilter<K extends keyof typeof this._pfapiService.m>(
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
          switchMap(() =>
            this._globalConfigService.sync$.pipe(
              // Only enable when operation log sync is DISABLED
              filter((syncCfg) => !syncCfg?.useOperationLogSync),
              switchMap(() => this._store.select(selector)),
              skip(1),
              switchMap((state) =>
                // thankfully the next action after is the action that triggered the change
                this._actions.pipe(
                  first(),
                  map((a) => [state, a] as const),
                ),
              ),
              tap(([, action]) =>
                Log.log(
                  `__DB_S_${modelKey}__`,
                  !ignoredActionTypesToUse.includes(action.type),
                  action.type,
                ),
              ),
              filter(([, action]) => !ignoredActionTypesToUse.includes(action.type)),
              switchMap(([state]) =>
                this._pfapiService.m[modelKey].save(state, {
                  isUpdateRevAndLastUpdate: true,
                }),
              ),
            ),
          ),
        ),
      { dispatch: false },
    );
  }
}
