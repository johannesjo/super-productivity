import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectCfg } from './project';
import { Project } from './project';
import { PersistenceService } from '../core/persistence/persistence.service';
import { ProjectDataLsKey } from '../core/persistence/persistence';
import { LS_TASK_STATE } from '../core/persistence/ls-keys.const';
import { TaskActionTypes } from '../tasks/store/task.actions';
import { Store } from '@ngrx/store';
import { select } from '@ngrx/store';
import { ProjectActionTypes } from './store/project.actions';
import shortid from 'shortid';
import { selectCurrentProjectId } from './store/project.reducer';
import { selectAllProjects } from './store/project.reducer';

@Injectable()
export class ProjectService {
  // TODO get from store
  list$: Observable<Project[]> = this._store.pipe(select(selectAllProjects));
  currentProject$: Observable<Project>;
  currentId$: Observable<string> = this._store.pipe(select(selectCurrentProjectId));

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


    this.load();
    this.loadTasksForCurrent();
  }

  load() {
    const projectState = this._persistenceService.loadProjectsMeta();
    if (projectState) {
      this._store.dispatch({
        type: ProjectActionTypes.LoadState,
        payload: {state: projectState}
      });
    }
  }

  add(project: Partial<Project>) {
    this._store.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: Object.assign(project, {
          id: shortid(),
        })
      }
    });
  }

  remove(projectId) {
    this._store.dispatch({
      type: ProjectActionTypes.DeleteProject,
      payload: {id: projectId}
    });
  }

  update(projectId: string, changedFields: Partial<Project>) {
    this._store.dispatch({
      type: ProjectActionTypes.UpdateProject,
      payload: {
        project: {
          id: projectId,
          changes: changedFields
        }
      }
    });
  }

  setCurrentId(projectId: string) {
    this._store.dispatch({
      type: ProjectActionTypes.SetCurrentProject,
      payload: projectId,
    });
  }

  // TODO there is probably a smarter way make it work as part from project effects
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

  // PERSISTENCE
  // -----------
  // TODO make this work via tasks effect directly (get project id from state)
  saveTasksForCurrent(taskState: any) {
    this._persistData(this._currentProjectId, LS_TASK_STATE, taskState);
  }

  private _persistData(projectId, dataKey: ProjectDataLsKey, cfg: ProjectCfg) {
    this._persistenceService.saveProjectData(projectId, dataKey, cfg);
  }

}
