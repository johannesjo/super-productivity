import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {ExportedProject, Project,} from './project.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {select, Store} from '@ngrx/store';
import {ProjectActionTypes, UpdateProjectOrder} from './store/project.actions';
import shortid from 'shortid';
import {
  initialProjectState,
  ProjectState,
  selectAdvancedProjectCfg,
  selectArchivedProjects,
  selectGithubCfgByProjectId,
  selectGitlabCfgByProjectId,
  selectIsGithubEnabledByProjectId,
  selectIsJiraEnabledByProjectId,
  selectIsRelatedDataLoadedForCurrentProject,
  selectJiraCfgByProjectId,
  selectProjectBreakNr,
  selectProjectBreakTime,
  selectProjectById,
  selectProjectGitlabCfg,
  selectProjectGitlabIsEnabled,
  selectUnarchivedProjects,
  selectUnarchivedProjectsWithoutCurrent
} from './store/project.reducer';
import {IssueIntegrationCfg, IssueProviderKey} from '../issue/issue.model';
import {JiraCfg} from '../issue/providers/jira/jira.model';
import {GithubCfg} from '../issue/providers/github/github.model';
import {Actions} from '@ngrx/effects';
import {map, shareReplay, switchMap, take} from 'rxjs/operators';
import {isValidProjectExport} from './util/is-valid-project-export';
import {SnackService} from '../../core/snack/snack.service';
import {migrateProjectState} from './migrate-projects-state.util';
import {T} from '../../t.const';
import {BreakNr, BreakTime, WorkContextAdvancedCfg, WorkContextType} from '../work-context/work-context.model';
import {WorkContextService} from '../work-context/work-context.service';
import {GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE} from '../issue/issue.const';
import {GitlabCfg} from '../issue/providers/gitlab/gitlab';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  isRelatedDataLoadedForCurrentProject$: Observable<boolean> = this._store$.pipe(select(selectIsRelatedDataLoadedForCurrentProject));

  list$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjects));

  listWithoutCurrent$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjectsWithoutCurrent));

  archived$: Observable<Project[]> = this._store$.pipe(select(selectArchivedProjects));

  currentProject$: Observable<Project> = this._workContextService.activeWorkContextTypeAndId$.pipe(
    switchMap(({activeId, activeType}) => activeType === WorkContextType.PROJECT
      ? this.getByIdLive$(activeId)
      : of(null)
    ),
    shareReplay(1),
  );

  advancedCfg$: Observable<WorkContextAdvancedCfg> = this._store$.pipe(
    select(selectAdvancedProjectCfg),
  );

  currentGitlabCfg$: Observable<GitlabCfg> = this._store$.pipe(
    select(selectProjectGitlabCfg),
    shareReplay(1),
  );
  isGitlabEnabled$: Observable<boolean> = this._store$.pipe(
    select(selectProjectGitlabIsEnabled),
  );


  // TODO remove completely
  currentId$: Observable<string> = this._workContextService.activeWorkContextTypeAndId$.pipe(
    map(({activeId, activeType}) => activeType === WorkContextType.PROJECT
      ? activeId
      : null
    )
  );
  currentId: string;

  breakTime$: Observable<BreakTime> = this._store$.pipe(select(selectProjectBreakTime));
  breakNr$: Observable<BreakNr> = this._store$.pipe(select(selectProjectBreakNr));


  // DYNAMIC
  // -------
  isJiraEnabledForProject$(projectId: string): Observable<boolean> {
    return this._store$.pipe(select(selectIsJiraEnabledByProjectId, {id: projectId}));
  }

  getJiraCfgForProject$(projectId: string): Observable<JiraCfg> {
    return this._store$.pipe(select(selectJiraCfgByProjectId, {id: projectId}));
  }

  isGithubEnabledForProject$(projectId: string): Observable<boolean> {
    return this._store$.pipe(select(selectIsGithubEnabledByProjectId, {id: projectId}));
  }

  getGithubCfgForProject$(projectId: string): Observable<GithubCfg> {
    return this._store$.pipe(select(selectGithubCfgByProjectId, {id: projectId}));
  }

  getGitlabCfgForProject$(projectId: string): Observable<GitlabCfg> {
    return this._store$.pipe(select(selectGitlabCfgByProjectId, {id: projectId}));
  }

  getIssueProviderCfgForProject$(projectId: string, issueProviderKey: IssueProviderKey): Observable<IssueIntegrationCfg> {
    if (issueProviderKey === GITHUB_TYPE) {
      return this.getGithubCfgForProject$(projectId);
    } else if (issueProviderKey === JIRA_TYPE) {
      return this.getJiraCfgForProject$(projectId);
    } else if (issueProviderKey === GITLAB_TYPE) {
      return this.getGitlabCfgForProject$(projectId);
    } else {
      throw new Error('Invalid IssueProviderKey');
    }
  }


  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _snackService: SnackService,
    private readonly _workContextService: WorkContextService,
    // TODO correct type?
    private readonly _store$: Store<any>,
    private readonly _actions$: Actions,
  ) {
    this.currentId$.subscribe((id) => this.currentId = id);
  }

  async load() {
    const projectStateIN = await this._persistenceService.project.loadState() || initialProjectState;
    // we need to do this to migrate to the latest model if new fields are added
    const projectState = migrateProjectState({...projectStateIN});

    if (projectState) {
      if (!projectState.currentId) {
        projectState.currentId = projectState.ids[0] as string;
      }
      this.loadState(projectState);
    }
  }

  loadState(projectState: ProjectState) {
    this._store$.dispatch({
      type: ProjectActionTypes.LoadProjectState,
      payload: {state: projectState}
    });
  }

  archive(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.ArchiveProject,
      payload: {id: projectId}
    });
  }

  unarchive(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.UnarchiveProject,
      payload: {id: projectId}
    });
  }

  getByIdOnce$(id: string): Observable<Project> {
    return this._store$.pipe(select(selectProjectById, {id}), take(1));
  }

  getByIdLive$(id: string): Observable<Project> {
    return this._store$.pipe(select(selectProjectById, {id}));
  }

  add(project: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: Object.assign(project, {
          id: shortid(),
        })
      }
    });
  }

  upsert(project: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: {
          id: project.id || shortid(),
          ...project
        }
      }
    });
  }

  remove(projectId) {
    this._store$.dispatch({
      type: ProjectActionTypes.DeleteProject,
      payload: {id: projectId}
    });
  }

  update(projectId: string, changedFields: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProject,
      payload: {
        project: {
          id: projectId,
          changes: changedFields
        }
      }
    });
  }

  updateIssueProviderConfig(
    projectId: string,
    issueProviderKey: IssueProviderKey,
    providerCfg: Partial<IssueIntegrationCfg>,
    isOverwrite = false
  ) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProjectIssueProviderCfg,
      payload: {
        projectId,
        issueProviderKey,
        providerCfg,
        isOverwrite
      }
    });
  }


  updateOrder(ids: string[]) {
    this._store$.dispatch(new UpdateProjectOrder({ids}));
  }

  // DB INTERFACE
  async importCompleteProject(data: ExportedProject): Promise<any> {
    console.log(data);
    const {relatedModels, ...project} = data;
    if (isValidProjectExport(data)) {
      const state = await this._persistenceService.project.loadState();
      if (state.entities[project.id]) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.PROJECT.S.E_EXISTS,
          translateParams: {title: project.title}
        });
      } else {
        await this._persistenceService.restoreCompleteRelatedDataForProject(project.id, relatedModels);
        this.upsert(project);
      }
    } else {
      this._snackService.open({type: 'ERROR', msg: T.F.PROJECT.S.E_INVALID_FILE});
    }
  }
}
