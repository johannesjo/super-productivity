import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Project } from './project';
import { PersistenceService } from '../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { ProjectActionTypes } from './store/project.actions';
import shortid from 'shortid';
import { selectAllProjects, selectCurrentProject, selectCurrentProjectId } from './store/project.reducer';
import { IssueIntegrationCfg, IssueProviderKey } from '../issue/issue';
import { JiraCfg } from '../issue/jira/jira';

@Injectable()
export class ProjectService {
  list$: Observable<Project[]> = this._store.pipe(select(selectAllProjects));
  // currentProject$: Observable<Project> = this._store.pipe(select(selectCurrentProject));
  // TODO fix type
  currentProject$: any = this._store.pipe(select(selectCurrentProject));
  currentId$: Observable<string> = this._store.pipe(select(selectCurrentProjectId));
  currentJiraCfg$: Observable<JiraCfg> = this.currentProject$.map((project: Project) => {
    return project && project.issueIntegrationCfgs && project.issueIntegrationCfgs.JIRA;
  });


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


  updateIssueProviderConfig(projectId: string, issueProviderKey: IssueProviderKey, providerCfg: IssueIntegrationCfg) {
    this._store.dispatch({
      type: ProjectActionTypes.UpdateProject,
      payload: {
        projectId,
        issueProviderKey,
        providerCfg
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
