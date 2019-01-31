import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { GitIssueActionTypes } from './git-issue.actions';
import { select, Store } from '@ngrx/store';
import { filter, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../../core/persistence/persistence.service';
import { selectAllGitIssues, selectGitIssueFeatureState } from './git-issue.reducer';
import { selectCurrentProjectId, selectProjectGitCfg } from '../../../../project/store/project.reducer';
import { GitApiService } from '../../git-api.service';
import { GitIssueService } from '../git-issue.service';
import { ConfigService } from '../../../../config/config.service';
import { GitIssue } from '../git-issue.model';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { Task } from '../../../../tasks/task.model';
import { ProjectActionTypes } from '../../../../project/store/project.actions';
import { GIT_TYPE } from '../../../issue.const';
import { timer } from 'rxjs';
import { GIT_INITIAL_POLL_DELAY, GIT_POLL_INTERVAL } from '../../git.const';

const isRepoConfigured = ([a, gitCfg]) => gitCfg && gitCfg.repo && gitCfg.repo.length > 2;

@Injectable()
export class GitIssueEffects {
  @Effect({dispatch: false}) issuePolling$: any = this._actions$
    .pipe(
      ofType(
        // while load state should be enough this just might fix the error of polling for inactive projects?
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        GitIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectGitCfg)),
      ),
      filter(isRepoConfigured),
      filter(([a, gitCfg]) => gitCfg && gitCfg.isAutoPoll),
      switchMap(([a, gitCfg]) => {
        return timer(GIT_INITIAL_POLL_DELAY, GIT_POLL_INTERVAL)
          .pipe(
            withLatestFrom(
              this._store$.pipe(select(selectAllGitIssues)),
            ),
            tap(([x, issues]: [number, GitIssue[]]) => {
              console.log('git tap poll', x, issues);

              if (issues && issues.length > 0) {
                this._snackService.open({
                  message: 'Git: Polling Changes for issues',
                  svgIcon: 'github',
                  isSubtle: true,
                });
                this._gitIssueService.updateIssuesFromApi(issues, gitCfg);
              }
            })
          );
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
      let count = 0;
      let lastImportedIssue;
      await Promise.all(issues.map(async issue => {
        const res = await this._taskService.checkForTaskWithIssue(issue);
        if (!res) {
          count++;
          lastImportedIssue = issue;
          this._taskService.addWithIssue(
            `#${issue.number} ${issue.title}`,
            GIT_TYPE,
            issue,
            true,
          );
        }
        return res;
      }));

      if (count === 1) {
        this._snackService.open({
          message: `Git: Imported issue "#${lastImportedIssue.number} ${lastImportedIssue.title}" from git to backlog`,
          icon: 'cloud_download',
          isSubtle: true,
        });
      } else if (count > 1) {
        this._snackService.open({
          message: `Git: Imported ${count} new issues from git to backlog`,
          icon: 'cloud_download',
          isSubtle: true,
        });
      }
    });
  }
}

