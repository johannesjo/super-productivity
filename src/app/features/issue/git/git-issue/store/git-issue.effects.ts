import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { GitIssueActionTypes } from './git-issue.actions';
import { select, Store } from '@ngrx/store';
import { delay, filter, map, switchMap, tap, throttleTime, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../../core/persistence/persistence.service';
import { selectAllGitIssues, selectGitIssueFeatureState } from './git-issue.reducer';
import { selectCurrentProjectId, selectProjectGitCfg } from '../../../../project/store/project.reducer';
import { GitApiService } from '../../git-api.service';
import { GitIssueService } from '../git-issue.service';
import { ConfigService } from '../../../../config/config.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { Task } from '../../../../tasks/task.model';
import { ProjectActionTypes } from '../../../../project/store/project.actions';
import { GIT_TYPE } from '../../../issue.const';
import { EMPTY, timer } from 'rxjs';
import { GIT_INITIAL_POLL_DELAY, GIT_POLL_INTERVAL, } from '../../git.const';
import { GitCfg } from '../../git';
import { GitIssue } from '../git-issue.model';

const isRepoConfigured_ = (gitCfg) => gitCfg && gitCfg.repo && gitCfg.repo.length > 2;
const isRepoConfigured = ([a, gitCfg]) => isRepoConfigured_(gitCfg);

@Injectable()
export class GitIssueEffects {
  @Effect({dispatch: false}) refreshCachePoll$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        GitIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectGitCfg)),
      ),
      switchMap(([a, gitCfg]) => {
        // console.log('CACHE REFRESH', isRepoConfigured_(gitCfg) && (gitCfg.isAutoAddToBacklog || gitCfg.isAutoPoll));
        return (isRepoConfigured_(gitCfg) && (gitCfg.isAutoAddToBacklog || gitCfg.isAutoPoll))
          ? timer(GIT_INITIAL_POLL_DELAY, GIT_POLL_INTERVAL)
            .pipe(
              tap(() => {
                this._gitApiService.refreshIssuesCacheIfOld();
                // trigger fake refresh for when issues are deleted or cache is more up to date
                // then the data
                this._gitApiService.onCacheRefresh$.next(true);
              })
            )
          : EMPTY;
      })
    );

  @Effect({dispatch: false}) refreshIssueData$: any = this._gitApiService.onCacheRefresh$.pipe(
    delay(5000),
    throttleTime(10000),
    withLatestFrom(
      this._store$.pipe(select(selectProjectGitCfg)),
      this._store$.pipe(select(selectAllGitIssues)),
    ),
    filter(([a, gitCfg]) => gitCfg.isAutoPoll),
    tap(([x, gitCfg, issues]: [any, GitCfg, GitIssue[]]) => {
      if (issues && issues.length > 0) {
        this._snackService.open({
          message: 'Git: Polling Changes for issues',
          svgIcon: 'github',
          isSubtle: true,
        });
        this._gitIssueService.updateIssuesFromApi(issues, gitCfg, true);
      }
    })
  );

  @Effect({dispatch: false}) refreshBacklog: any = this._gitApiService.onCacheRefresh$.pipe(
    delay(10000),
    throttleTime(10000),
    withLatestFrom(
      this._store$.pipe(select(selectProjectGitCfg)),
    ),
    filter(([a, gitCfg]) => gitCfg.isAutoAddToBacklog),
    tap(() => {
      this._gitIssueService.addOpenIssuesToBacklog();
    })
  );


  @Effect({dispatch: false}) syncIssueStateToLs$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.MoveToArchive,
        GitIssueActionTypes.AddGitIssue,
        GitIssueActionTypes.DeleteGitIssue,
        GitIssueActionTypes.UpdateGitIssue,
        GitIssueActionTypes.AddGitIssues,
        GitIssueActionTypes.DeleteGitIssues,
        GitIssueActionTypes.UpsertGitIssue,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectGitIssueFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) addOpenIssuesToBacklog$: any = this._actions$
    .pipe(
      ofType(
        GitIssueActionTypes.AddOpenGitIssuesToBacklog,
      ),
      tap(this._importNewIssuesToBacklog.bind(this))
    );

  @Effect({dispatch: false}) loadMissingIssues$: any = this._taskService.tasksWithMissingIssueData$
    .pipe(
      withLatestFrom(
        this._store$.pipe(select(selectProjectGitCfg)),
      ),
      filter(([tasks, gitCfg]) => isRepoConfigured_(gitCfg)),
      throttleTime(60 * 1000),
      map(([tasks, gitCfg]) => tasks.filter(task => task.issueId && task.issueType === GIT_TYPE)),
      filter((tasks) => tasks && tasks.length > 0),
      tap(tasks => {
        console.warn('TASKS WITH MISSING ISSUE DATA FOR GIT', tasks);
        this._snackService.open({
          message: 'Git: Tasks with missing issue data found. Reloading.',
          svgIcon: 'github',
          isSubtle: true,
        });
        tasks.forEach((task) => this._gitIssueService.loadMissingIssueData(task.issueId));
      })
    );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: ConfigService,
              private readonly _snackService: SnackService,
              private readonly _gitApiService: GitApiService,
              private readonly _taskService: TaskService,
              private readonly _gitIssueService: GitIssueService,
              private readonly _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, gitIssueFeatureState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.saveIssuesForProject(currentProjectId, GIT_TYPE, gitIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _importNewIssuesToBacklog([action]: [Actions, Task[]]) {
    this._gitApiService.getCompleteIssueDataForRepo().subscribe(async issues => {
      const allTaskGitIssueIds = await this._taskService.getAllIssueIds(GIT_TYPE) as number[];
      const issuesToAdd = issues.filter(issue => !allTaskGitIssueIds.includes(issue.id));
      issuesToAdd.forEach((issue) => {
        this._taskService.addWithIssue(
          `#${issue.number} ${issue.title}`,
          GIT_TYPE,
          issue,
          true,
        );
      });

      if (issuesToAdd.length === 1) {
        this._snackService.open({
          message: `Git: Imported issue "#${issuesToAdd[0].number} ${issuesToAdd[0].title}" from git to backlog`,
          icon: 'cloud_download',
          isSubtle: true,
        });
      } else if (issuesToAdd.length > 1) {
        this._snackService.open({
          message: `Git: Imported ${issuesToAdd.length} new issues from git to backlog`,
          icon: 'cloud_download',
          isSubtle: true,
        });
      }
    });
  }
}

