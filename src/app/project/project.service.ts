import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Project } from './project';
import { PersistenceService } from '../core/persistence/persistence.service';
import { Store } from '@ngrx/store';
import { select } from '@ngrx/store';
import { ProjectActionTypes } from './store/project.actions';
import shortid from 'shortid';
import { selectCurrentProjectId } from './store/project.reducer';
import { selectAllProjects } from './store/project.reducer';
import { selectCurrentProject } from './store/project.reducer';

@Injectable()
export class ProjectService {
  // TODO get from store
  list$: Observable<Project[]> = this._store.pipe(select(selectAllProjects));
  // currentProject$: Observable<Project> = this._store.pipe(select(selectCurrentProject));
  currentProject$: any = this._store.pipe(select(selectCurrentProject));
  currentId$: Observable<string> = this._store.pipe(select(selectCurrentProjectId));


  constructor(
    private readonly _persistenceService: PersistenceService,
    // TODO correct type?
    private readonly _store: Store<any>,
  ) {
    this.load();
    this.currentProject$.subscribe((x) => console.log(x));
  }

  load() {
    const projectState = this._persistenceService.loadProjectsMeta();
    if (projectState) {
      if (!projectState.currentId) {
        projectState.currentId = projectState.ids[0];
      }
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
}
