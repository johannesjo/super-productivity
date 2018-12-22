import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { GitIssueActionTypes } from './git-issue.actions';
import { select, Store } from '@ngrx/store';
import { take, tap, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { selectAllGitIssues, selectGitIssueFeatureState } from './git-issue.reducer';
import { selectCurrentProjectId, selectProjectGitCfg } from '../../../../project/store/project.reducer';
import { GitApiService } from '../../git-api.service';
import { GitIssueService } from '../git-issue.service';
import { GIT_POLL_INTERVAL } from '../../git.const';
import { ConfigService } from '../../../../core/config/config.service';
import { GitIssue } from '../git-issue.model';
import { GitCfg } from '../../git';
import { SnackService } from '../../../../core/snack/snack.service';
import { selectAllTasks } from '../../../../tasks/store/task.selectors';
import { TaskService } from '../../../../tasks/task.service';
import { Task } from '../../../../tasks/task.model';

@Injectable()
export class GitIssueEffects {
  @Effect({dispatch: false}) issuePolling$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        GitIssueActionTypes.LoadState,
        GitIssueActionTypes.LoadGitIssues,
        GitIssueActionTypes.AddGitIssue,
        GitIssueActionTypes.DeleteGitIssue,

        // also needs to be here to reinit entity data
        GitIssueActionTypes.UpdateGitIssue,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectAllGitIssues)),
        this._store$.pipe(select(selectProjectGitCfg)),
      ),
      // TODO should be done in a more modern way via switchmap and timer
      tap(this._reInitIssuePolling.bind(this))
    );
  @Effect({dispatch: false}) syncIssueStateToLs$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
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
      withLatestFrom(
        this._store$.pipe(select(selectAllTasks)),
      ),
      tap(this._addNewIssuesToBacklog.bind(this))
    );

  private _pollingIntervalId: number;

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
      this._persistenceService.saveIssuesForProject(currentProjectId, 'GIT', gitIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _addNewIssuesToBacklog([action, allTasks]: [Actions, Task[]]) {

    this._gitApiService.getCompleteIssueDataForRepo().subscribe(issues => {
      issues.forEach(issue => {
        const isIssueAlreadyImported = allTasks.find(task => {
          return task.issueType === 'GIT' && task.issueId.toString() === issue.id.toString();
        });

        if (!isIssueAlreadyImported) {
          console.log('add ', issue.id, issue);
          this._taskService.addWithIssue(
            `#${issue.number} ${issue.title}`,
            'GIT',
            issue,
            true,
          );
        }
      });
    });
  }

  private _reInitIssuePolling(
    [action, issues, gitCfg]: [GitIssueActionTypes, GitIssue[], GitCfg]
  ) {
    if (this._pollingIntervalId) {
      window.clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = 0;
    }
    const isPollingEnabled = gitCfg && gitCfg.isAutoPoll;
    if (isPollingEnabled) {
      this._pollingIntervalId = window.setInterval(() => {
        this._snackService.open({message: 'Git: Polling Changes for issues', icon: 'cloud_download'});
        this._updateIssuesFromApi(issues);
      }, GIT_POLL_INTERVAL);
    }
  }

  private _updateIssuesFromApi(oldIssues: GitIssue[]) {
    console.log('UPDATE ISSUE FROM API');
    this._gitApiService.getCompleteIssueDataForRepo()
      .pipe(
        take(1)
      ).subscribe(newIssues => {
      oldIssues.forEach((oldIssue: GitIssue) => {
        const matchingNewIssue: GitIssue = newIssues.find(newIssue => newIssue.id === oldIssue.id);
        if (!matchingNewIssue) {
          this._snackService.open({
            type: 'ERROR',
            message: `Git: Issue ${oldIssue.number} "${oldIssue.title}" seems to be deleted on git`
          });
        } else {
          const isNewComment = matchingNewIssue.comments.length !== (oldIssue.comments && oldIssue.comments.length);
          const isIssueChanged = (matchingNewIssue.updated_at !== oldIssue.updated_at);
          const wasUpdated = isNewComment || isIssueChanged;
          if (isNewComment) {
            this._snackService.open({
              icon: 'cloud_download',
              message: `Git: New comment for ${matchingNewIssue.number} "${matchingNewIssue.title}"`
            });
          } else if (isIssueChanged) {
            this._snackService.open({
              icon: 'cloud_download',
              message: `Git: Update for ${matchingNewIssue.number} "${matchingNewIssue.title}"`
            });
          }

          if (wasUpdated) {
            this._gitIssueService.update(oldIssue.id, {...matchingNewIssue, wasUpdated: true});
          }
        }
      });
    });
  }
}

