import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Project } from './project.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { IssueIntegrationCfg, IssueProviderKey } from '../issue/issue.model';
import { JiraCfg } from '../issue/providers/jira/jira.model';
import { GithubCfg } from '../issue/providers/github/github.model';
import { Actions, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { isValidProjectExport } from './util/is-valid-project-export';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { BreakNr, BreakTime, WorkContextType } from '../work-context/work-context.model';
import { WorkContextService } from '../work-context/work-context.service';
import { GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from '../issue/issue.const';
import { GitlabCfg } from '../issue/providers/gitlab/gitlab';
import { ExportedProject } from './project-archive.model';
import { CaldavCfg } from '../issue/providers/caldav/caldav.model';
import {
  addProject,
  archiveProject,
  deleteProject,
  loadProjectRelatedDataSuccess,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
  moveProjectTaskToTodayListAuto,
  toggleHideFromMenu,
  unarchiveProject,
  updateProject,
  updateProjectIssueProviderCfg,
  updateProjectOrder,
  upsertProject,
} from './store/project.actions';
import { DEFAULT_PROJECT } from './project.const';
import {
  selectArchivedProjects,
  selectCaldavCfgByProjectId,
  selectGiteaCfgByProjectId,
  selectGithubCfgByProjectId,
  selectGitlabCfgByProjectId,
  selectJiraCfgByProjectId,
  selectOpenProjectCfgByProjectId,
  selectProjectBreakNrForProject,
  selectProjectBreakTimeForProject,
  selectProjectById,
  selectRedmineCfgByProjectId,
  selectUnarchivedProjects,
  selectUnarchivedProjectsWithoutCurrent,
} from './store/project.selectors';
import { OpenProjectCfg } from '../issue/providers/open-project/open-project.model';
import { GiteaCfg } from '../issue/providers/gitea/gitea.model';
import { RedmineCfg } from '../issue/providers/redmine/redmine.model';
import { devError } from '../../util/dev-error';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  list$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjects));

  archived$: Observable<Project[]> = this._store$.pipe(select(selectArchivedProjects));

  currentProject$: Observable<Project | null> =
    this._workContextService.activeWorkContextTypeAndId$.pipe(
      switchMap(({ activeId, activeType }) =>
        activeType === WorkContextType.PROJECT ? this.getByIdLive$(activeId) : of(null),
      ),
      shareReplay(1),
    );

  /* @deprecated  todo fix */
  isRelatedDataLoadedForCurrentProject$: Observable<boolean> =
    this._workContextService.isActiveWorkContextProject$.pipe(
      switchMap((isProject) =>
        isProject
          ? this._workContextService.activeWorkContextIdIfProject$.pipe(
              switchMap((activeId) =>
                this._actions$.pipe(
                  ofType(loadProjectRelatedDataSuccess.type),
                  map(({ payload: { projectId } }) => projectId === activeId),
                ),
              ),
            )
          : of(false),
      ),
    );

  onMoveToBacklog$: Observable<any> = this._actions$.pipe(
    ofType(moveProjectTaskToBacklogList),
  );

  // DYNAMIC

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _snackService: SnackService,
    private readonly _workContextService: WorkContextService,
    // TODO correct type?
    private readonly _store$: Store<any>,
    private readonly _actions$: Actions,
  ) {}

  // -------
  getJiraCfgForProject$(projectId: string): Observable<JiraCfg> {
    return this._store$.pipe(select(selectJiraCfgByProjectId, { id: projectId }));
  }

  getGithubCfgForProject$(projectId: string): Observable<GithubCfg> {
    return this._store$.pipe(select(selectGithubCfgByProjectId, { id: projectId }));
  }

  getGitlabCfgForProject$(projectId: string): Observable<GitlabCfg> {
    return this._store$.pipe(select(selectGitlabCfgByProjectId, { id: projectId }));
  }

  getCaldavCfgForProject$(projectId: string): Observable<CaldavCfg> {
    return this._store$.pipe(select(selectCaldavCfgByProjectId, { id: projectId }));
  }

  getOpenProjectCfgForProject$(projectId: string): Observable<OpenProjectCfg> {
    return this._store$.pipe(select(selectOpenProjectCfgByProjectId, { id: projectId }));
  }

  getGiteaCfgForProject$(projectId: string): Observable<GiteaCfg> {
    return this._store$.pipe(select(selectGiteaCfgByProjectId, { id: projectId }));
  }

  getRedmineCfgForProject$(projectId: string): Observable<RedmineCfg> {
    return this._store$.pipe(select(selectRedmineCfgByProjectId, { id: projectId }));
  }

  getProjectsWithoutId$(projectId: string | null): Observable<Project[]> {
    return this._store$.pipe(
      select(selectUnarchivedProjectsWithoutCurrent, { currentId: projectId }),
    );
  }

  getBreakNrForProject$(projectId: string): Observable<BreakNr> {
    return this._store$.pipe(select(selectProjectBreakNrForProject, { id: projectId }));
  }

  getBreakTimeForProject$(projectId: string): Observable<BreakTime> {
    return this._store$.pipe(select(selectProjectBreakTimeForProject, { id: projectId }));
  }

  getIssueProviderCfgForProject$(
    projectId: string,
    issueProviderKey: IssueProviderKey,
  ): Observable<IssueIntegrationCfg> {
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

  archive(projectId: string): void {
    this._store$.dispatch(archiveProject({ id: projectId }));
  }

  unarchive(projectId: string): void {
    this._store$.dispatch(unarchiveProject({ id: projectId }));
  }

  getByIdOnce$(id: string): Observable<Project> {
    if (!id) {
      throw new Error('No id given');
    }
    return this._store$.pipe(select(selectProjectById, { id }), take(1));
  }

  getByIdOnceCatchError$(id: string): Observable<Project | null> {
    if (!id) {
      throw new Error('No id given');
    }
    return this._store$.pipe(
      select(selectProjectById, { id }),
      take(1),
      catchError((err) => {
        devError(err);
        return of(null);
      }),
    );
  }

  getByIdLive$(id: string): Observable<Project> {
    return this._store$.pipe(select(selectProjectById, { id }));
  }

  add(project: Partial<Project>): void {
    this._store$.dispatch(
      addProject({
        project: {
          ...DEFAULT_PROJECT,
          ...project,
          id: nanoid(),
        },
      }),
    );
  }

  upsert(project: Partial<Project>): void {
    this._store$.dispatch(
      upsertProject({
        project: {
          ...project,
          id: project.id || nanoid(),
        } as Project,
      }),
    );
  }

  remove(projectId: string): void {
    this._store$.dispatch(deleteProject({ id: projectId }));
  }

  toggleHideFromMenu(projectId: string): void {
    this._store$.dispatch(toggleHideFromMenu({ id: projectId }));
  }

  update(projectId: string, changedFields: Partial<Project>): void {
    this._store$.dispatch(
      updateProject({
        project: {
          id: projectId,
          changes: changedFields,
        },
      }),
    );
  }

  moveTaskToTodayList(id: string, projectId: string, isMoveToTop: boolean = false): void {
    this._store$.dispatch(
      moveProjectTaskToTodayListAuto({
        taskId: id,
        isMoveToTop,
        projectId,
      }),
    );
  }

  moveTaskToBacklog(taskId: string, projectId: string): void {
    this._store$.dispatch(moveProjectTaskToBacklogListAuto({ taskId, projectId }));
  }

  updateIssueProviderConfig(
    projectId: string,
    issueProviderKey: IssueProviderKey,
    providerCfg: Partial<IssueIntegrationCfg>,
    isOverwrite: boolean = false,
  ): void {
    this._store$.dispatch(
      updateProjectIssueProviderCfg({
        projectId,
        issueProviderKey,
        providerCfg,
        isOverwrite,
      }),
    );
  }

  updateOrder(ids: string[]): void {
    this._store$.dispatch(updateProjectOrder({ ids }));
  }

  // DB INTERFACE
  async importCompleteProject(data: ExportedProject): Promise<any> {
    console.log(data);
    const { relatedModels, ...project } = data;
    if (isValidProjectExport(data)) {
      const state = await this._persistenceService.project.loadState();
      if (state.entities[project.id]) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.PROJECT.S.E_EXISTS,
          translateParams: { title: project.title },
        });
      } else {
        await this._persistenceService.restoreCompleteRelatedDataForProject(
          project.id,
          relatedModels,
        );
        this.upsert(project);
      }
    } else {
      this._snackService.open({ type: 'ERROR', msg: T.F.PROJECT.S.E_INVALID_FILE });
    }
  }
}
