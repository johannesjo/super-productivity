import {Injectable} from '@angular/core';
import {PersistenceService} from '../persistence/persistence.service';
import {ProjectState} from '../../features/project/store/project.reducer';
import {forkJoin, Observable} from 'rxjs';
import {concatMap, map, tap} from 'rxjs/operators';
import {LS_TASK_STATE} from '../persistence/ls-keys.const';
import {TaskState} from 'src/app/features/tasks/task.model';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {

  constructor(
    private _persistenceService: PersistenceService,
  ) {
  }

  migrate$(projectState: ProjectState): Observable<ProjectState> {
    const ids = projectState.ids as string[];
    console.log(projectState);

    return forkJoin([
      this._migrateTaskFromProjectToSingle$(ids),
    ]).pipe(
      // concatMap(() => this._persistenceService.cleanDatabase()),
      concatMap(() => this._persistenceService.project.loadState())
    );
  }


  private _migrateTaskFromProjectToSingle$(projectIds: string[]): Observable<any> {
    console.log(projectIds);
    return forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_STATE, id)
    )).pipe(
      tap((args) => console.log('TASK_BEFORE', args)),
      map((taskStates: TaskState[]) => taskStates.reduce(
        (acc, s) => {
          if (!s || !s.ids) {
            return acc;
          }
          return {
            ...acc,
            ids: [...acc.ids, ...s.ids],
            entities: {...acc.entities, ...s.entities}
          };
        }, {
          ids: [],
          entities: {}
        })
      ),
      // concatMap((mergedState: TaskState) => this._persistenceService.task.saveState(mergedState)),
      tap((args) => console.log('TASK_AFTER', args)),
    );
  }

  // private _finalCleanup$() {
  // this._persistenceService.cleanDatabase()
  // }
}
