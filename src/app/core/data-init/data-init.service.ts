import {Injectable} from '@angular/core';
import {combineLatest, forkJoin, Observable, of} from 'rxjs';
import {filter, shareReplay, switchMap, take} from 'rxjs/operators';
import {ProjectService} from '../../features/project/project.service';
import {TagService} from '../../features/tag/tag.service';
import {TaskRepeatCfgService} from '../../features/task-repeat-cfg/task-repeat-cfg.service';
import {TaskService} from '../../features/tasks/task.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {WorkContextService} from '../../features/work-context/work-context.service';
import {Store} from '@ngrx/store';
import {allDataLoaded} from './data-init.actions';

@Injectable({
  providedIn: 'root'
})
export class DataInitService {
  isAllDataLoadedInitially$: Observable<boolean> = combineLatest([
    // LOAD GLOBAL MODELS
    forkJoin([
      this._taskService.load(),
      this._taskRepeatCfgService.load(),
      this._configService.load(),
      this._tagService.load(),
      this._projectService.load(),
      this._workContextService.load(),
    ])
  ]).pipe(
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
}
