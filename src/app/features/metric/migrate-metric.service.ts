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
import { SyncTriggerService } from '../../imex/sync/sync-trigger.service';
import { unique } from '../../util/unique';

@Injectable({
  providedIn: 'root',
})
export class MigrateMetricService {
  constructor(
    private _metricService: MetricService,
    private _persistenceService: PersistenceService,
    private _dataImportService: DataImportService,
    private _syncTriggerService: SyncTriggerService,
  ) {}

  checkMigrate() {
    // TODO check for model version number instead
    this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$
      .pipe(
        first(),
        concatMap(() => this._metricService.state$),
        first(),
      )
      .subscribe(async (metricState: MetricState) => {
        console.log('Migrating Legacy Metric State to new model');
        console.log('metricMigration:', metricState[MODEL_VERSION_KEY], { metricState });
        if (!metricState[MODEL_VERSION_KEY]) {
          const projectState = await this._persistenceService.project.loadState();
          // For new instances
          if (!projectState?.ids?.length) {
            return;
          }

          console.log(projectState);
          let newM = initialMetricState;
          let newI = initialImprovementState;
          let newO = initialObstructionState;

          for (const id of projectState.ids as string[]) {
            const mForProject = await this._persistenceService.legacyMetric.load(id);
            const iForProject = await this._persistenceService.legacyImprovement.load(id);
            const oForProject = await this._persistenceService.legacyObstruction.load(id);
            if (mForProject && (oForProject || iForProject)) {
              console.log('metricMigration:', { mForProject, iForProject, oForProject });
              newM = this._mergeMetricsState(newM, mForProject);
              if (iForProject) {
                newI = this._mergeIntoState(newI, iForProject) as ImprovementState;
              }
              if (oForProject) {
                newO = this._mergeIntoState(newO, oForProject);
              }
            }
          }
          console.log('metricMigration:', { newM, newI, newO });

          await this._persistenceService.improvement.saveState(newI, {
            isSyncModelChange: false,
          });
          await this._persistenceService.obstruction.saveState(newO, {
            isSyncModelChange: false,
          });
          await this._persistenceService.metric.saveState(
            {
              ...newM,
              [MODEL_VERSION_KEY]: METRIC_MODEL_VERSION,
            },
            { isSyncModelChange: false },
          );
          const data = await this._persistenceService.loadComplete();
          await this._dataImportService.importCompleteSyncData(data);
        }
      });
  }

  private _mergeMetricsState(
    completeState: MetricState,
    newState: MetricState,
  ): MetricState {
    const s = {
      ...completeState,
      ...newState,
      // NOTE: we need to make them unique, because we're possibly merging multiple entities into one
      ids: unique([...(completeState.ids as string[]), ...(newState.ids as string[])]),
      entities: {
        ...completeState.entities,
        ...newState.entities,
      },
    };

    Object.keys(newState.entities).forEach((dayStr) => {
      const mOld = completeState.entities[dayStr] as MetricCopy;
      const mNew = newState.entities[dayStr] as MetricCopy;
      // merge same entry into one
      if (mOld && mNew) {
        s.entities[dayStr] = {
          ...mOld,
          obstructions: [...mOld.obstructions, ...mNew.obstructions],
          improvements: [...mOld.improvements, ...mNew.improvements],
          improvementsTomorrow: [
            ...mOld.improvementsTomorrow,
            ...mNew.improvementsTomorrow,
          ],
        };
      }
    });
    return s;
  }

  private _mergeIntoState(
    completeState: EntityState<any>,
    newState: EntityState<any>,
  ): EntityState<any> {
    return {
      ...completeState,
      ...newState,
      ids: [...(completeState.ids as string[]), ...(newState.ids as string[])],
      entities: {
        ...completeState.entities,
        ...newState.entities,
      },
    };
  }
}
