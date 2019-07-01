import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {GithubIssueActionTypes} from './github-issue.actions';
import {select, Store} from '@ngrx/store';
import {delay, filter, map, switchMap, tap, throttleTime, withLatestFrom} from 'rxjs/operators';
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
import {EMPTY, timer} from 'rxjs';
import {GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL,} from '../../github.const';
import {GithubCfg} from '../../github';
import {GithubIssue} from '../github-issue.model';

const isRepoConfigured_ = (githubCfg) => githubCfg && githubCfg.repo && githubCfg.repo.length > 2;
const isRepoConfigured = ([a, githubCfg]) => isRepoConfigured_(githubCfg);

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
        this._store$.pipe(select(selectProjectGithubCfg)),
      ),
      switchMap(([a, githubCfg]) => {
        // console.log('CACHE REFRESH', isRepoConfigured_(githubCfg) && (githubCfg.isAutoAddToBacklog || githubCfg.isAutoPoll));
        return (isRepoConfigured_(githubCfg) && (githubCfg.isAutoAddToBacklog || githubCfg.isAutoPoll))
          ? timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL)
            .pipe(
              tap(() => {
                this._githubApiService.refreshIssuesCacheIfOld();
                // trigger fake refresh for when issues are deleted or cache is more up to date
                // then the data
                // this._githubApiService.onCacheRefresh$.next(true);
              })
            )
          : EMPTY;
      })
    );

  @Effect({dispatch: false}) refreshIssueData$: any = this._githubApiService.onCacheRefresh$.pipe(
    delay(5000),
    throttleTime(10000),
    withLatestFrom(
      this._store$.pipe(select(selectProjectGithubCfg)),
      this._store$.pipe(select(selectAllGithubIssues)),
    ),
    filter(([a, githubCfg]) => githubCfg.isAutoPoll),
    tap(([x, githubCfg, issues]: [any, GithubCfg, GithubIssue[]]) => {
      if (issues && issues.length > 0) {
        this._snackService.open({
          msg: 'Github: Polling Changes for issues',
          svgIco: 'github',
          isSubtle: true,
        });
        this._githubIssueService.updateIssuesFromApi(issues, githubCfg, true);
      }
    })
  );

  @Effect({dispatch: false}) refreshBacklog: any = this._githubApiService.onCacheRefresh$.pipe(
    delay(10000),
    throttleTime(10000),
    withLatestFrom(
      this._store$.pipe(select(selectProjectGithubCfg)),
    ),
    filter(([a, githubCfg]) => githubCfg.isAutoAddToBacklog),
    tap(() => {
      this._githubIssueService.addOpenIssuesToBacklog();
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
        this._store$.pipe(select(selectProjectGithubCfg)),
      ),
      filter(([tasks, githubCfg]) => isRepoConfigured_(githubCfg)),
      throttleTime(60 * 1000),
      map(([tasks, githubCfg]) => tasks.filter(task => task.issueId && task.issueType === GITHUB_TYPE)),
      filter((tasks) => tasks && tasks.length > 0),
      tap(tasks => {
        console.warn('TASKS WITH MISSING ISSUE DATA FOR GITHUB', tasks);
        this._snackService.open({
          msg: 'Github: Tasks with missing issue data found. Reloading.',
          svgIco: 'github',
          isSubtle: true,
        });
        tasks.forEach((task) => this._githubIssueService.loadMissingIssueData(task.issueId));
      })
    );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: GlobalConfigService,
              private readonly _snackService: SnackService,
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
          msg: `Github: Imported issue "#${issuesToAdd[0].number} ${issuesToAdd[0].title}" from git to backlog`,
          ico: 'cloud_download',
          isSubtle: true,
        });
      } else if (issuesToAdd.length > 1) {
        this._snackService.open({
          msg: `Github: Imported ${issuesToAdd.length} new issues from git to backlog`,
          ico: 'cloud_download',
          isSubtle: true,
        });
      }
    });
  }
}

