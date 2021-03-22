import { Injectable } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { MetricService } from './metric.service';
import { concatMap, first } from 'rxjs/operators';
import { EntityState } from '@ngrx/entity';
import { MetricCopy, MetricState } from './metric.model';
import { initialMetricState } from './store/metric.reducer';
import { initialImprovementState } from './improvement/store/improvement.reducer';
import { initialObstructionState } from './obstruction/store/obstruction.reducer';
import { ImprovementState } from './improvement/improvement.model';
import { DataImportService } from '../../imex/sync/data-import.service';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { METRIC_MODEL_VERSION } from './metric.const';
import { SyncService } from '../../imex/sync/sync.service';

@Injectable({
  providedIn: 'root'
})
export class MigrateMetricService {

  constructor(
    private _metricService: MetricService,
    private _persistenceService: PersistenceService,
    private _dataImportService: DataImportService,
    private _syncService: SyncService,
  ) {

  }

  checkMigrate() {
    // TODO check for model version number instead
    this._syncService.afterInitialSyncDoneAndDataLoadedInitially$.pipe(
      first(),
      concatMap(() => this._metricService.state$),
      first(),
    ).subscribe(async (metricState: MetricState) => {
      console.log('Migrating Legacy Metric State to new model');
      console.log(metricState [MODEL_VERSION_KEY], {metricState});
      if (!metricState [MODEL_VERSION_KEY]) {
        const projectState = await this._persistenceService.project.loadState();
        // For new instances
        if (!projectState?.ids?.length) {
          return;
        }

        console.log(projectState);
        let newM = initialMetricState;
        let newI = initialImprovementState;
        let newO = initialObstructionState;

        for (const id of (projectState.ids as string[])) {
          const m = await this._persistenceService.legacyMetric.load(id);
          const i = await this._persistenceService.legacyImprovement.load(id);
          const o = await this._persistenceService.legacyObstruction.load(id);
          if (m && (o || i)) {
            console.log({m, i, o});
            newM = this._mergeMetricsState(newM, m);
            newI = this._mergeIntoState(newI, i) as ImprovementState;
            newO = this._mergeIntoState(newO, o);
          }
        }
        console.log({newM, newI, newO});

        await this._persistenceService.improvement.saveState(newI, {isSyncModelChange: false});
        await this._persistenceService.obstruction.saveState(newO, {isSyncModelChange: false});
        await this._persistenceService.metric.saveState({
          ...newM,
          [MODEL_VERSION_KEY]: METRIC_MODEL_VERSION
        }, {isSyncModelChange: false});
        const data = await this._persistenceService.loadComplete();
        await this._dataImportService.importCompleteSyncData(data);
      }
    });
  }

  private _mergeMetricsState(completeState: MetricState, newState: MetricState): MetricState {
    const s = {
      ...completeState,
      ...newState,
      ids: [...completeState.ids as string[], ...newState.ids as string[]],
      entities: {
        ...completeState.entities,
        ...newState.entities,
      }
    };

    Object.keys(newState.entities).forEach(dayStr => {
      const mOld = completeState.entities[dayStr] as MetricCopy;
      const mNew = newState.entities[dayStr] as MetricCopy;
      if (mOld && mNew) {
        s.entities[dayStr] = {
          ...mOld,
          obstructions: [...mOld.obstructions, ...mNew.obstructions],
          improvements: [...mOld.improvements, ...mNew.improvements],
          improvementsTomorrow: [...mOld.improvementsTomorrow, ...mNew.improvementsTomorrow],
        };
      }
    });
    return s;
  }

  private _mergeIntoState(completeState: EntityState<any>, newState: EntityState<any>): EntityState<any> {
    return {
      ...completeState,
      ...newState,
      ids: [...completeState.ids as string[], ...newState.ids as string[]],
      entities: {
        ...completeState.entities,
        ...newState.entities,
      }
    };
  }
}
