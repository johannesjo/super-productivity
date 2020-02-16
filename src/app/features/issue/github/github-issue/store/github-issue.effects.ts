import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {DeleteGithubIssues, GithubIssueActionTypes, LoadState} from './github-issue.actions';
import {select, Store} from '@ngrx/store';
import {delay, filter, map, mergeMap, switchMap, tap, throttleTime, withLatestFrom} from 'rxjs/operators';
import {TaskActionTypes} from '../../../../tasks/store/task.actions';
import {PersistenceService} from '../../../../../core/persistence/persistence.service';
import {selectAllGithubIssues, selectGithubIssueFeatureState} from './github-issue.reducer';
import {selectCurrentProjectId, selectProjectGithubCfg} from '../../../../project/store/project.reducer';
import {GithubApiService} from '../../github-api.service';
import {GithubIssueService} from '../github-issue.service';
import {GlobalConfigService} from '../../../../config/global-config.service';
import {SnackService} from '../../../../../core/snack/snack.service';
import {TaskService} from '../../../../tasks/task.service';
import {Task} from '../../../../tasks/task.model';
import {ProjectActionTypes} from '../../../../project/store/project.actions';
import {GITHUB_TYPE} from '../../../issue.const';
import {EMPTY, of, timer} from 'rxjs';
import {GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL} from '../../github.const';
import {GithubCfg} from '../../github';
import {GithubIssue} from '../github-issue.model';
import {T} from '../../../../../t.const';
import {ProjectService} from '../../../../project/project.service';

@Injectable()
export class GithubIssueEffects {
  @Effect({dispatch: false}) refreshCachePoll$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        GithubIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._projectService.isGithubEnabled$,
        this._projectService.currentGithubCfg$,
      ),
      switchMap(([a, isEnabled, githubCfg]) => {
        // console.log('CACHE REFRESH', isRepoConfigured_(githubCfg) && (githubCfg.isAutoAddToBacklog || githubCfg.isAutoPoll));
        return (isEnabled && (githubCfg.isAutoAddToBacklog || githubCfg.isAutoPoll))
          ? timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL)
            .pipe(
              tap(() => {
                this._githubApiService.refreshIssuesCacheIfOld();
              })
            )
          : EMPTY;
      })
    );
  @Effect({dispatch: false}) cleanup$: any = this._actions$
    .pipe(
      ofType(
        GithubIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._projectService.isGithubEnabled$,
        this._taskService.allTasks$,
      ),
      filter(([a, isEnabled]) => isEnabled),
      mergeMap(([a, isEnabled, allTasks]: [LoadState, boolean, Task[]]) => {
        const ids = a.payload.state.ids as string[];
        const idsToRemove = allTasks.filter((task) => {
          return task.issueId && task.issueType === GITHUB_TYPE && !ids.includes(task.issueId);
        })
          .map(task => +task.issueId) as number[];
        console.log('Autoclean Stale Github Issues:', idsToRemove);
        return (idsToRemove && idsToRemove.length)
          ? of(new DeleteGithubIssues({ids: idsToRemove}))
          : EMPTY;
      })
    );


  @Effect({dispatch: false}) syncIssueStateToLs$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.MoveToArchive,
        GithubIssueActionTypes.AddGithubIssue,
        GithubIssueActionTypes.DeleteGithubIssue,
        GithubIssueActionTypes.UpdateGithubIssue,
        GithubIssueActionTypes.AddGithubIssues,
        GithubIssueActionTypes.DeleteGithubIssues,
        GithubIssueActionTypes.UpsertGithubIssue,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectGithubIssueFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) addOpenIssuesToBacklog$: any = this._actions$
    .pipe(
      ofType(
        GithubIssueActionTypes.AddOpenGithubIssuesToBacklog,
      ),
      tap(this._importNewIssuesToBacklog.bind(this))
    );

  @Effect({dispatch: false}) loadMissingIssues$: any = this._taskService.tasksWithMissingIssueData$
    .pipe(
      withLatestFrom(
        this._projectService.isGithubEnabled$,
      ),
      filter(([tasks, isEnabled]) => isEnabled),
      throttleTime(60 * 1000),
      map(([tasks]) => tasks.filter(task => task.issueId && task.issueType === GITHUB_TYPE)),
      filter((tasks) => tasks && tasks.length > 0),
      tap(tasks => {
        console.warn('TASKS WITH MISSING ISSUE DATA FOR GITHUB', tasks);
        this._snackService.open({
          msg: T.F.GITHUB.S.MISSING_ISSUE_DATA,
          svgIco: 'github',
          config: {
            duration: 9000,
          }
        });
        tasks.forEach((task) => this._githubIssueService.loadMissingIssueData(task.issueId));
      })
    );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: GlobalConfigService,
              private readonly _snackService: SnackService,
              private readonly _projectService: ProjectService,
              private readonly _githubApiService: GithubApiService,
              private readonly _taskService: TaskService,
              private readonly _githubIssueService: GithubIssueService,
              private readonly _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, githubIssueFeatureState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.saveIssuesForProject(currentProjectId, GITHUB_TYPE, githubIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _importNewIssuesToBacklog([action]: [Actions, Task[]]) {
    this._githubApiService.getCompleteIssueDataForRepo$().subscribe(async issues => {
      const allTaskGithubIssueIds = await this._taskService.getAllIssueIdsForCurrentProject(GITHUB_TYPE) as number[];
      const issuesToAdd = issues.filter(issue => !allTaskGithubIssueIds.includes(issue.id));
      issuesToAdd.forEach((issue) => {
        this._taskService.addWithIssue(
          `#${issue.number} ${issue.title}`,
          GITHUB_TYPE,
          issue,
          true,
        );
      });

      if (issuesToAdd.length === 1) {
        this._snackService.open({
          ico: 'cloud_download',
          translateParams: {
            issueText: `#${issuesToAdd[0].number} ${issuesToAdd[0].title}`
          },
          msg: T.F.GITHUB.S.IMPORTED_SINGLE_ISSUE,
        });
      } else if (issuesToAdd.length > 1) {
        this._snackService.open({
          ico: 'cloud_download',
          translateParams: {
            issuesLength: issuesToAdd.length
          },
          msg: T.F.GITHUB.S.IMPORTED_MULTIPLE_ISSUES,
        });
      }
    });
  }
}

