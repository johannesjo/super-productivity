import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectCfg } from './project';
import { PersistenceService } from '../core/persistence/persistence.service';
import { ProjectDataLsKey } from '../core/persistence/persistence';
import { LS_TASK_STATE } from '../core/persistence/ls-keys.const';
import { LS_PROJECT_CFG } from '../core/persistence/ls-keys.const';
import { TaskActionTypes } from '../tasks/store/task.actions';
import { Store } from '@ngrx/store';

@Injectable()
export class ProjectService {
  // TODO get from store
  list$: Observable<ProjectCfg[]>;
  currentCfg$: Observable<ProjectCfg>;
  currentId$: Observable<string>;
  private _currentProjectId;

  constructor(
    private readonly _persistenceService: PersistenceService,
    // TODO correct type?
    private readonly _store: Store<any>,
  ) {
    // this will be the actual mechanism
    // or refactor this to an effect??? both valid
    // this.currentProjectsId$.subscribe((projectId) => {
    //   this._currentProjectId = projectId;
    //   const projects = this._persistenceService.loadProjectsMeta();
    //   this.loadTasksForCurrentProject();
    // });

    const projects = this._persistenceService.loadProjectsMeta();
    this.loadTasksForCurrent();
  }

  // ONLY PERSISTENCE
  // ----------------
  // TODO add taskState type
  saveTasksForCurrent(taskState: any) {
    this.persistData(this._currentProjectId, LS_TASK_STATE, taskState);
  }

  saveProjectCfg(projectId, cfg: ProjectCfg) {
    this.persistData(projectId, LS_PROJECT_CFG, cfg);
  }

  persistData(projectId, dataKey: ProjectDataLsKey, cfg: ProjectCfg) {
    this._persistenceService.saveProjectData(projectId, dataKey, cfg);
  }

  // USING ALSO STORE
  // ----------------
  create() {
  }

  remove() {
  }

  setCurrentId(projectId) {
    // ...
    // dispatch save
  }

  loadCurrentCfg() {
    // TODO load issue config
  }

  loadTasksForCurrent() {
    const lsTaskState = this._persistenceService.loadProjectData(this._currentProjectId, LS_TASK_STATE);
    if (lsTaskState) {
      this._store.dispatch({
        type: TaskActionTypes.LoadState,
        payload: {
          state: lsTaskState,
        }
      });
    }
  }
}
