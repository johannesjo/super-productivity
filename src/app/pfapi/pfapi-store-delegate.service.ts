import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, firstValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';

import { selectBoardsState } from '../features/boards/store/boards.selectors';
import { selectConfigFeatureState } from '../features/config/store/global-config.reducer';
import { selectIssueProviderState } from '../features/issue/store/issue-provider.selectors';
import { selectMenuTreeState } from '../features/menu-tree/store/menu-tree.selectors';
import { selectMetricFeatureState } from '../features/metric/store/metric.selectors';
import { selectPluginUserDataFeatureState } from '../plugins/store/plugin-user-data.reducer';
import { selectPluginMetadataFeatureState } from '../plugins/store/plugin-metadata.reducer';
import { selectReminderFeatureState } from '../features/reminder/store/reminder.reducer';
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
import { PfapiService } from './pfapi.service';

/**
 * Service that provides a delegate function to read all sync model data from the NgRx store.
 *
 * Most models are persisted via OperationLogEffects to SUP_OPS IndexedDB, so ModelCtrl caches
 * are stale for those models. This delegate reads from NgRx instead of ModelCtrl caches.
 *
 * EXCEPTION: archiveYoung and archiveOld are persisted directly to ModelCtrl (pf database),
 * not via OperationLogEffects. So for archives, we read from ModelCtrl (the source of truth).
 */
@Injectable({
  providedIn: 'root',
})
export class PfapiStoreDelegateService {
  private _store = inject(Store);

  // Use lazy injection to break circular dependency:
  // PfapiService -> Pfapi -> ... -> PfapiStoreDelegateService -> PfapiService
  private readonly _injector = inject(Injector);
  private _pfapiService?: PfapiService;
  private get pfapiService(): PfapiService {
    if (!this._pfapiService) {
      this._pfapiService = this._injector.get(PfapiService);
    }
    return this._pfapiService;
  }

  /**
   * Gets all sync model data from NgRx store and ModelCtrl.
   *
   * Most models are read from NgRx state (persisted via OperationLogEffects).
   * archiveYoung and archiveOld are read from ModelCtrl (persisted directly to pf database).
   */
  async getAllSyncModelDataFromStore(): Promise<AllSyncModels<PfapiAllModelCfg>> {
    // Archive data is stored in ModelCtrl (pf database), not NgRx store.
    // The NgRx archiveYoung/archiveOld state is only populated on loadAllData (import)
    // but is never updated when ArchiveService writes to ModelCtrl during finish day.
    const [archiveYoung, archiveOld] = await Promise.all([
      this.pfapiService.m.archiveYoung.load(),
      this.pfapiService.m.archiveOld.load(),
    ]);

    // Debug logging for E2E tests
    console.log(
      '[PfapiStoreDelegateService] archiveYoung task IDs:',
      archiveYoung?.task?.ids,
    );
    console.log(
      '[PfapiStoreDelegateService] archiveYoung task count:',
      archiveYoung?.task?.ids?.length,
    );

    // All other models are read from NgRx store (persisted via OperationLogEffects)
    const ngRxData = await firstValueFrom(
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
      ]).pipe(first()),
    );

    const [
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
    ] = ngRxData;

    return {
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
      // Archive data from ModelCtrl (source of truth for archives)
      archiveYoung,
      archiveOld,
    } as AllSyncModels<PfapiAllModelCfg>;
  }
}
