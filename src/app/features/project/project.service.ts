import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Project } from './project.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { ProjectActionTypes, UpdateProjectOrder } from './store/project.actions';
import * as shortid from 'shortid';
import {
  selectArchivedProjects,
  selectCaldavCfgByProjectId,
  selectGithubCfgByProjectId,
  selectGitlabCfgByProjectId,
  selectJiraCfgByProjectId,
  selectProjectBreakNrForProject,
  selectProjectBreakTimeForProject,
  selectProjectById,
  selectUnarchivedProjects,
  selectUnarchivedProjectsWithoutCurrent,
} from './store/project.reducer';
import { IssueIntegrationCfg, IssueProviderKey } from '../issue/issue.model';
import { JiraCfg } from '../issue/providers/jira/jira.model';
import { GithubCfg } from '../issue/providers/github/github.model';
import { Actions, ofType } from '@ngrx/effects';
import { map, shareReplay, switchMap, take } from 'rxjs/operators';
import { isValidProjectExport } from './util/is-valid-project-export';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { BreakNr, BreakTime, WorkContextType } from '../work-context/work-context.model';
import { WorkContextService } from '../work-context/work-context.service';
import { GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from '../issue/issue.const';
import { GitlabCfg } from '../issue/providers/gitlab/gitlab';
import { ExportedProject } from './project-archive.model';
import { CaldavCfg } from '../issue/providers/caldav/caldav.model';

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
                  ofType(ProjectActionTypes.LoadProjectRelatedDataSuccess),
                  map(({ payload: { projectId } }) => projectId === activeId),
                ),
              ),
            )
          : of(false),
      ),
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

  archive(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.ArchiveProject,
      payload: { id: projectId },
    });
  }

  unarchive(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.UnarchiveProject,
      payload: { id: projectId },
    });
  }

  getByIdOnce$(id: string): Observable<Project> {
    if (!id) {
      throw new Error('No id given');
    }
    return this._store$.pipe(select(selectProjectById, { id }), take(1));
  }

  getByIdLive$(id: string): Observable<Project> {
    return this._store$.pipe(select(selectProjectById, { id }));
  }

  add(project: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: Object.assign(project, {
          id: shortid(),
        }),
      },
    });
  }

  upsert(project: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: {
          id: project.id || shortid(),
          ...project,
        },
      },
    });
  }

  remove(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.DeleteProject,
      payload: { id: projectId },
    });
  }

  update(projectId: string, changedFields: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProject,
      payload: {
        project: {
          id: projectId,
          changes: changedFields,
        },
      },
    });
  }

  updateIssueProviderConfig(
    projectId: string,
    issueProviderKey: IssueProviderKey,
    providerCfg: Partial<IssueIntegrationCfg>,
    isOverwrite: boolean = false,
  ) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProjectIssueProviderCfg,
      payload: {
        projectId,
        issueProviderKey,
        providerCfg,
        isOverwrite,
      },
    });
  }

  updateOrder(ids: string[]) {
    this._store$.dispatch(new UpdateProjectOrder({ ids }));
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
