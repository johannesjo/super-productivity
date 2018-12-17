import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { GitIssueActionTypes } from './git-issue.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { selectGitIssueEntities, selectGitIssueFeatureState, selectGitIssueIds } from './git-issue.reducer';
import { selectCurrentProjectId, selectProjectGitCfg } from '../../../../project/store/project.reducer';
import { GitApiService } from '../../git-api.service';
import { GitIssueService } from '../git-issue.service';
import { JIRA_POLL_INTERVAL } from '../../git.const';
import { ConfigService } from '../../../../core/config/config.service';
import { Dictionary } from '@ngrx/entity';
import { GitIssue } from '../git-issue.model';
import { GitCfg } from '../../git';
import { SnackService } from '../../../../core/snack/snack.service';

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
        this._store$.pipe(select(selectGitIssueIds)),
        this._store$.pipe(select(selectGitIssueEntities)),
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
  private _pollingIntervalId: number;

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: ConfigService,
              private readonly _snackService: SnackService,
              private readonly _gitApiService: GitApiService,
              private readonly _gitIssueService: GitIssueService,
              private readonly _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, gitIssueFeatureState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.saveIssuesForProject(currentProjectId, 'JIRA', gitIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _reInitIssuePolling(
    [action, issueIds, entities, gitCfg]: [GitIssueActionTypes, string[], Dictionary<GitIssue>, GitCfg]
  ) {
    if (this._pollingIntervalId) {
      window.clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = 0;
    }
    const isPollingEnabled = gitCfg && gitCfg.isEnabled && gitCfg.isAutoPollTickets;
    if (isPollingEnabled && issueIds && issueIds.length) {
      this._pollingIntervalId = window.setInterval(() => {
        // TODO remove
        this._snackService.open({message: 'Git: Polling Changes for issues', icon: 'cloud_download'});
        issueIds.forEach((id) => this._updateIssueFromApi(id, entities[id]));
      }, JIRA_POLL_INTERVAL);
    }
  }

  private _updateIssueFromApi(issueId, oldIssueData) {
    this._gitApiService.getIssueById(issueId, true)
      .then((res) => {
        if (res.updated !== oldIssueData.updated) {
          this._gitIssueService.update(issueId, {...res, wasUpdated: true});
        }
      });
  }
}

