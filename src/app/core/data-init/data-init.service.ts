import {Injectable} from '@angular/core';
import {combineLatest, forkJoin, Observable} from 'rxjs';
import {filter, map, shareReplay, take} from 'rxjs/operators';
import {ProjectService} from '../../features/project/project.service';
import {TagService} from '../../features/tag/tag.service';
import {TaskRepeatCfgService} from '../../features/task-repeat-cfg/task-repeat-cfg.service';
import {TaskService} from '../../features/tasks/task.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {WorkContextService} from '../../features/work-context/work-context.service';

@Injectable({
  providedIn: 'root'
})
export class DataInitService {
  isAllDataLoadedInitially$: Observable<boolean> = combineLatest([
    this._projectService.isRelatedDataLoadedForCurrentProject$,

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
    map(([isProjectDataLoaded]) => isProjectDataLoaded),
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
  ) {
  }
}
