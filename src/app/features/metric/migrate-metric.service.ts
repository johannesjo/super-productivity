import { Injectable } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { MetricService } from './metric.service';
import { first } from 'rxjs/operators';
import { EntityState } from '@ngrx/entity';
import { MetricCopy, MetricState } from './metric.model';
import { initialMetricState } from './store/metric.reducer';
import { initialImprovementState } from './improvement/store/improvement.reducer';
import { initialObstructionState } from './obstruction/store/obstruction.reducer';
import { ImprovementState } from './improvement/improvement.model';
import { DataImportService } from '../../imex/sync/data-import.service';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { METRIC_MODEL_VERSION } from './metric.const';

@Injectable({
  providedIn: 'root'
})
export class MigrateMetricService {

  constructor(
    private _metricService: MetricService,
    private _persistenceService: PersistenceService,
    private _dataImportService: DataImportService,
  ) {

  }

  checkMigrate() {
    // TODO check for model version number instead
    this._metricService.state$.pipe(first()).subscribe(async (metricState: MetricState) => {
      console.log({metricState});

      if (!metricState [MODEL_VERSION_KEY]) {
        const projectState = await this._persistenceService.project.loadState();
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

  // private _mergeAllIntoOne(projectStates: { [key: string]: EntityState<any> }): EntityState<any> {
  //   let allIds: string[] = [];
  //   const allEntities: any = {};
  //
  //   if (projectStates.ids && projectStates.entities) {
  //     console.log('No migration necessary');
  //     return projectStates as any;
  //   }
  //   alert('MIGRATEION SCRIPT TRGGERED FOR METRICS');
  //
  //   Object.keys(projectStates).forEach((pid: string) => {
  //     if (projectStates[pid] && Array.isArray(projectStates[pid].ids)) {
  //       const idsForProject = projectStates[pid].ids as string[];
  //       allIds = [...allIds, ...idsForProject];
  //       idsForProject.forEach(entityId => {
  //         allEntities[entityId] = projectStates[pid].entities[entityId];
  //       });
  //     }
  //   });
  //
  //   console.log('MERGED_METRICS', {projectStates}, {
  //     ids: allIds,
  //     entities: allEntities,
  //   });
  //
  //   return {
  //     ids: allIds,
  //     entities: allEntities,
  //   };
  // }
}
