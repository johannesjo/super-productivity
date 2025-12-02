import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, firstValueFrom } from 'rxjs';
import { first, map } from 'rxjs/operators';

import { selectBoardsState } from '../features/boards/store/boards.selectors';
import { selectConfigFeatureState } from '../features/config/store/global-config.reducer';
import { selectIssueProviderState } from '../features/issue/store/issue-provider.selectors';
import { selectMenuTreeState } from '../features/menu-tree/store/menu-tree.selectors';
import { selectImprovementFeatureState } from '../features/metric/improvement/store/improvement.reducer';
import { selectObstructionFeatureState } from '../features/metric/obstruction/store/obstruction.reducer';
import { selectMetricFeatureState } from '../features/metric/store/metric.selectors';
import { selectNoteFeatureState } from '../features/note/store/note.reducer';
import { selectPlannerState } from '../features/planner/store/planner.selectors';
import { selectProjectFeatureState } from '../features/project/store/project.selectors';
import { selectSimpleCounterFeatureState } from '../features/simple-counter/store/simple-counter.reducer';
import { selectTagFeatureState } from '../features/tag/store/tag.reducer';
import { selectTaskFeatureState } from '../features/tasks/store/task.selectors';
import { selectTaskRepeatCfgFeatureState } from '../features/task-repeat-cfg/store/task-repeat-cfg.selectors';
import { selectTimeTrackingState } from '../features/time-tracking/store/time-tracking.selectors';

import { AllSyncModels, ModelCfgToModelCtrl } from './api/pfapi.model';
import { PfapiAllModelCfg } from './pfapi-config';
import { environment } from '../../environments/environment';

/**
 * Service that provides a delegate function to read all sync model data from the NgRx store.
 *
 * When operation log sync is enabled, SaveToDbEffects is completely disabled. This delegate
 * allows legacy sync (WebDAV/Dropbox) to read the current state directly from NgRx instead
 * of ModelCtrl caches.
 *
 * For models not in NgRx (reminders, archives, plugins),
 * we load from the 'pf' database on-demand via ModelCtrl.load().
 */
@Injectable({
  providedIn: 'root',
})
export class PfapiStoreDelegateService {
  private _store = inject(Store);

  // Reference to model controllers, set by PfapiService during initialization
  private _modelCtrls: ModelCfgToModelCtrl<PfapiAllModelCfg> | null = null;

  /**
   * Sets the model controllers reference. Called by PfapiService during initialization.
   */
  setModelCtrls(modelCtrls: ModelCfgToModelCtrl<PfapiAllModelCfg>): void {
    this._modelCtrls = modelCtrls;
  }

  /**
   * Gets all sync model data from NgRx store combined with non-NgRx models from 'pf' database.
   *
   * Models in NgRx are read from the store (current runtime state).
   * Models NOT in NgRx (reminders, archives, plugins, etc.) are loaded from 'pf' database.
   */
  async getAllSyncModelDataFromStore(): Promise<AllSyncModels<PfapiAllModelCfg>> {
    if (!this._modelCtrls) {
      throw new Error(
        'PfapiStoreDelegateService: modelCtrls not set. Call setModelCtrls first.',
      );
    }

    // Get all NgRx state in one snapshot
    const ngrxData = await firstValueFrom(
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
        this._store.select(selectImprovementFeatureState),
        this._store.select(selectObstructionFeatureState),
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
            improvement,
            obstruction,
          ]) => ({
            // Clean up task state before sync (same as SaveToDbEffects)
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
            improvement,
            obstruction,
          }),
        ),
      ),
    );

    // Load non-NgRx models from 'pf' database on-demand
    // These models are not in NgRx state, so we load them directly from IndexedDB
    const [reminders, pluginUserData, pluginMetadata, archiveYoung, archiveOld] =
      await Promise.all([
        this._modelCtrls.reminders.load(),
        this._modelCtrls.pluginUserData.load(),
        this._modelCtrls.pluginMetadata.load(),
        this._modelCtrls.archiveYoung.load(),
        this._modelCtrls.archiveOld.load(),
      ]);

    return {
      ...ngrxData,
      reminders,
      pluginUserData,
      pluginMetadata,
      archiveYoung,
      archiveOld,
    } as AllSyncModels<PfapiAllModelCfg>;
  }
}
