import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, firstValueFrom } from 'rxjs';
import { first, map } from 'rxjs/operators';

import { selectBoardsState } from '../features/boards/store/boards.selectors';
import { selectConfigFeatureState } from '../features/config/store/global-config.reducer';
import { selectIssueProviderState } from '../features/issue/store/issue-provider.selectors';
import { selectMenuTreeState } from '../features/menu-tree/store/menu-tree.selectors';
import { selectMetricFeatureState } from '../features/metric/store/metric.selectors';
import { selectPluginUserDataFeatureState } from '../plugins/store/plugin-user-data.reducer';
import { selectPluginMetadataFeatureState } from '../plugins/store/plugin-metadata.reducer';
import { selectReminderFeatureState } from '../features/reminder/store/reminder.reducer';
import { selectArchiveYoungFeatureState } from '../features/time-tracking/store/archive-young.reducer';
import { selectArchiveOldFeatureState } from '../features/time-tracking/store/archive-old.reducer';
import { selectNoteFeatureState } from '../features/note/store/note.reducer';
import { selectPlannerState } from '../features/planner/store/planner.selectors';
import { selectProjectFeatureState } from '../features/project/store/project.selectors';
import { selectSimpleCounterFeatureState } from '../features/simple-counter/store/simple-counter.reducer';
import { selectTagFeatureState } from '../features/tag/store/tag.reducer';
import { selectTaskFeatureState } from '../features/tasks/store/task.selectors';
import { selectTaskRepeatCfgFeatureState } from '../features/task-repeat-cfg/store/task-repeat-cfg.selectors';
import { selectTimeTrackingState } from '../features/time-tracking/store/time-tracking.selectors';

import { AllSyncModels } from './api/pfapi.model';
import { PfapiAllModelCfg } from './pfapi-config';
import { environment } from '../../environments/environment';

/**
 * Service that provides a delegate function to read all sync model data from the NgRx store.
 *
 * Persistence happens via OperationLogEffects to SUP_OPS IndexedDB, so ModelCtrl caches
 * are stale. This delegate allows legacy sync (WebDAV/Dropbox) to read the current state
 * directly from NgRx instead of ModelCtrl caches.
 */
@Injectable({
  providedIn: 'root',
})
export class PfapiStoreDelegateService {
  private _store = inject(Store);

  /**
   * Gets all sync model data from NgRx store.
   * All models are read from NgRx state (current runtime state).
   */
  getAllSyncModelDataFromStore(): Promise<AllSyncModels<PfapiAllModelCfg>> {
    return firstValueFrom(
      combineLatest([
        this._store.select(selectTaskFeatureState),
        this._store.select(selectProjectFeatureState),
        this._store.select(selectTagFeatureState),
        this._store.select(selectConfigFeatureState),
        this._store.select(selectNoteFeatureState),
        this._store.select(selectIssueProviderState),
        this._store.select(selectPlannerState),
        this._store.select(selectBoardsState),
        this._store.select(selectMetricFeatureState),
        this._store.select(selectSimpleCounterFeatureState),
        this._store.select(selectTaskRepeatCfgFeatureState),
        this._store.select(selectMenuTreeState),
        this._store.select(selectTimeTrackingState),
        this._store.select(selectPluginUserDataFeatureState),
        this._store.select(selectPluginMetadataFeatureState),
        this._store.select(selectReminderFeatureState),
        this._store.select(selectArchiveYoungFeatureState),
        this._store.select(selectArchiveOldFeatureState),
      ]).pipe(
        first(),
        map(
          ([
            task,
            project,
            tag,
            globalConfig,
            note,
            issueProvider,
            planner,
            boards,
            metric,
            simpleCounter,
            taskRepeatCfg,
            menuTree,
            timeTracking,
            pluginUserData,
            pluginMetadata,
            reminders,
            archiveYoung,
            archiveOld,
          ]) =>
            ({
              // Clean up task state before sync
              task: {
                ...task,
                selectedTaskId: environment.production ? null : task.selectedTaskId,
                currentTaskId: null,
              },
              project,
              tag,
              globalConfig,
              note,
              issueProvider,
              planner,
              boards,
              metric,
              simpleCounter,
              taskRepeatCfg,
              menuTree,
              timeTracking,
              pluginUserData,
              pluginMetadata,
              reminders,
              archiveYoung,
              archiveOld,
            }) as AllSyncModels<PfapiAllModelCfg>,
        ),
      ),
    );
  }
}
