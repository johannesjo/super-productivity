import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { JiraIssueActionTypes } from './jira-issue.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { selectJiraIssueEntities, selectJiraIssueFeatureState, selectJiraIssueIds } from './jira-issue.reducer';
import { selectCurrentProjectId } from '../../../../project/store/project.reducer';
import { JiraApiService } from '../../jira-api.service';
import { JiraIssueService } from '../jira-issue.service';
import { JIRA_POLL_INTERVAL } from '../../jira.const';

@Injectable()
export class JiraIssueEffects {
  private _pollingIntervalId: number;

  @Effect({dispatch: false}) issuePolling$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        JiraIssueActionTypes.LoadState,
        JiraIssueActionTypes.LoadJiraIssues,
        JiraIssueActionTypes.AddJiraIssue,
        JiraIssueActionTypes.DeleteJiraIssue,

        // also needs to be here to reinit entity data
        JiraIssueActionTypes.UpdateJiraIssue,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectJiraIssueIds)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      // TODO should be done in a more modern way via switchmap and timer
      tap(this._reInitIssuePolling.bind(this))
    );

  @Effect({dispatch: false}) syncIssueStateToLs$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        JiraIssueActionTypes.AddJiraIssue,
        JiraIssueActionTypes.DeleteJiraIssue,
        JiraIssueActionTypes.UpdateJiraIssue,
        JiraIssueActionTypes.AddJiraIssues,
        JiraIssueActionTypes.DeleteJiraIssues,
        JiraIssueActionTypes.UpsertJiraIssue,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectJiraIssueFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _jiraApiService: JiraApiService,
              private readonly _jiraIssueService: JiraIssueService,
              private readonly _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, jiraIssueFeatureState]) {
    if (currentProjectId) {
      this._persistenceService.saveIssuesForProject(currentProjectId, 'JIRA', jiraIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _reInitIssuePolling([action, issueIds, entities]) {
    if (this._pollingIntervalId) {
      window.clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = 0;
    }
    if (issueIds && issueIds.length) {
      this._pollingIntervalId = window.setInterval(() => {
        issueIds.forEach((id) => this._updateIssueFromApi(id, entities[id]));
      }, JIRA_POLL_INTERVAL);
    }
  }

  private _updateIssueFromApi(issueId, oldIssueData) {
    this._jiraApiService.getIssueById(issueId)
      .then((res) => {
        if (res.updated !== oldIssueData.updated) {
          this._jiraIssueService.update(issueId, {...res, wasUpdated: true});
        }
      });
  }
}

