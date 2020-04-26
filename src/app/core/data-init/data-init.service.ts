import {Injectable} from '@angular/core';
import {from, Observable, of} from 'rxjs';
import {concatMap, filter, shareReplay, switchMap, take} from 'rxjs/operators';
import {ProjectService} from '../../features/project/project.service';
import {TagService} from '../../features/tag/tag.service';
import {TaskRepeatCfgService} from '../../features/task-repeat-cfg/task-repeat-cfg.service';
import {TaskService} from '../../features/tasks/task.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {WorkContextService} from '../../features/work-context/work-context.service';
import {Store} from '@ngrx/store';
import {allDataLoaded} from './data-init.actions';
import {PersistenceService} from '../persistence/persistence.service';
import {ProjectState} from '../../features/project/store/project.reducer';
import {MigrationService} from '../migration/migration.service';
import {loadDataComplete} from '../../root-store/meta/load-data-complete.action';

@Injectable({
  providedIn: 'root'
})
export class DataInitService {
  isAllDataLoadedInitially$: Observable<boolean> = from(this._persistenceService.project.loadState(true)).pipe(
    concatMap((projectState: ProjectState) => this._migrationService.migrateIfNecessaryToProjectState$(projectState)),
    concatMap((projectState: ProjectState) => from(this.reInit(projectState))),
    switchMap(() => this._workContextService.isActiveWorkContextProject$),
    switchMap(isProject => isProject
      ? this._projectService.isRelatedDataLoadedForCurrentProject$
      : of(true)
    ),
    filter(isLoaded => isLoaded),
    take(1),
    // only ever load once
    shareReplay(1),
  );

  constructor(
    private _persistenceService: PersistenceService,
    private _migrationService: MigrationService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _taskService: TaskService,
    private _configService: GlobalConfigService,
    private _workContextService: WorkContextService,
    private _store$: Store<any>,
  ) {
    // TODO better construction than this
    this.isAllDataLoadedInitially$.pipe(
      take(1)
    ).subscribe(() => {
      // here because to avoid circular dependencies
      this._store$.dispatch(allDataLoaded());
    });
  }

  // NOTE: it's important to remember that this doesn't mean that no changes are occurring any more
  // because the data load is triggered, but not necessarily already reflected inside the store
  async reInit(projectState: ProjectState = null, isOmitTokens = false): Promise<any> {
    const appDataComplete = await this._persistenceService.loadComplete();
    this._store$.dispatch(loadDataComplete({appDataComplete, isOmitTokens}));

    // return forkJoin([
    //   // LOAD GLOBAL MODELS
    //   this._configService.load(isOmitTokens),
    //   this._tagService.load(),
    //   this._workContextService.load(),
    //   this._taskService.load(),
    //   this._taskRepeatCfgService.load(),
    //   // NOTE: loading the project state should deal with reloading the for project states via effect
    //   this._projectService.load(projectState),
    // ]);
  }
}
