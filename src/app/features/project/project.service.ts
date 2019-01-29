import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  GoogleTimeSheetExport,
  Project,
  ProjectAdvancedCfg,
  ProjectAdvancedCfgKey,
  SimpleSummarySettings
} from './project.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {select, Store} from '@ngrx/store';
import {ProjectActionTypes} from './store/project.actions';
import shortid from 'shortid';
import {
  initialProjectState,
  ProjectState,
  selectAdvancedProjectCfg,
  selectAllProjects,
  selectCurrentProject,
  selectCurrentProjectId,
  selectProjectGitCfg,
  selectProjectJiraCfg
} from './store/project.reducer';
import {IssueIntegrationCfg, IssueProviderKey} from '../issue/issue';
import {JiraCfg} from '../issue/jira/jira';
import {DEFAULT_PROJECT} from './project.const';
import {Dictionary} from '@ngrx/entity';
import {getWorklogStr} from '../../util/get-work-log-str';
import {GitCfg} from '../issue/git/git';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';
import {Actions} from "@ngrx/effects";
import {ofType} from "@ngrx/effects";

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  list$: Observable<Project[]> = this._store.pipe(select(selectAllProjects));
  currentProject$: Observable<Project> = this._store.pipe(
    select(selectCurrentProject),
    // TODO investigate share replay issues
    // shareReplay(),
  );
  currentJiraCfg$: Observable<JiraCfg> = this._store.pipe(
    select(selectProjectJiraCfg),
    // shareReplay(),
  );
  currentGitCfg$: Observable<GitCfg> = this._store.pipe(
    select(selectProjectGitCfg),
    // shareReplay(),
  );
  advancedCfg$: Observable<ProjectAdvancedCfg> = this._store.pipe(
    select(selectAdvancedProjectCfg),
    // shareReplay(),
  );
  currentId$: Observable<string> = this._store.pipe(select(selectCurrentProjectId));
  currentId: string;

  onProjectChange$: Observable<any> = this._actions$.pipe(ofType(ProjectActionTypes.SetCurrentProject));

  constructor(
    private readonly _persistenceService: PersistenceService,
    // TODO correct type?
    private readonly _store: Store<any>,
    private readonly _actions$: Actions,
  ) {
    // dirty trick to make effect catch up :/
    // setTimeout(() => {
    //   this.load();
    // }, 50);

    this.currentId$.subscribe((id) => this.currentId = id);
  }

  async load() {
    const projectState_ = await this._persistenceService.loadProjectsMeta() || initialProjectState;
    const projectState = this._extendProjectDefaults(projectState_);

    if (projectState) {
      if (!projectState.currentId) {
        projectState.currentId = projectState.ids[0] as string;
      }
      this.loadState(projectState);
    }
  }

  loadState(projectState: ProjectState) {
    this._store.dispatch({
      type: ProjectActionTypes.LoadProjectState,
      payload: {state: projectState}
    });
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

  upsert(project: Partial<Project>) {
    this._store.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: {
          id: shortid(),
          ...project
        }
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

  updateAdvancedCfg(projectId: string, sectionKey: ProjectAdvancedCfgKey, data: any) {
    this._store.dispatch({
      type: ProjectActionTypes.UpdateProjectAdvancedCfg,
      payload: {
        projectId,
        sectionKey,
        data,
      }
    });
  }

  updateIssueProviderConfig(
    projectId: string,
    issueProviderKey: IssueProviderKey,
    providerCfg: IssueIntegrationCfg,
    isOverwrite = false
  ) {
    this._store.dispatch({
      type: ProjectActionTypes.UpdateProjectIssueProviderCfg,
      payload: {
        projectId,
        issueProviderKey,
        providerCfg,
        isOverwrite
      }
    });
  }

  setCurrentId(projectId: string) {
    this._store.dispatch({
      type: ProjectActionTypes.SetCurrentProject,
      payload: projectId,
    });
  }

  // HELPER
  updateTimeSheetExportSettings(projectId: string, data: GoogleTimeSheetExport, isExport = false) {
    this.updateAdvancedCfg(projectId, 'googleTimeSheetExport', {
      ...data,
      ...(isExport ? {lastExported: getWorklogStr()} : {})
    });
  }

  // HELPER
  updateSimpleSummarySettings(projectId: string, data: SimpleSummarySettings) {
    this.updateAdvancedCfg(projectId, 'simpleSummarySettings', {
      ...data,
    });
  }


  // we need to make sure our model stays compatible with new props added
  private _extendProjectDefaults(projectState: ProjectState): ProjectState {
    const projectEntities: Dictionary<Project> = {...projectState.entities};
    Object.keys(projectEntities).forEach((key) => {
      // we possibly need to extend this
      // NOTE: check if we need a deep copy
      projectEntities[key] = {
        ...DEFAULT_PROJECT,
        ...projectEntities[key],
        // also add missing issue integration cfgs
        issueIntegrationCfgs: {
          ...DEFAULT_ISSUE_PROVIDER_CFGS,
          ...projectEntities[key].issueIntegrationCfgs,
        }
      };
    });
    return {...projectState, entities: projectEntities};
  }
}
