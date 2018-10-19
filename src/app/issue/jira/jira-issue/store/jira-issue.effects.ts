import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { JiraIssueActionTypes } from './jira-issue.actions';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/withLatestFrom';
import { withLatestFrom } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
// import { LS_JIRA_ISSUE_STATE } from '../../core/persistence/ls-keys.const';
// import { PROJECT_FEATURE_NAME } from '../../project/store/project.reducer';
// import { PersistenceService } from '../../core/persistence/persistence.service';

@Injectable()
export class JiraIssueEffects {
  @Effect({dispatch: false}) updateIssue$: any = this._actions$
    .pipe(
      ofType(
        JiraIssueActionTypes.AddJiraIssue,
        JiraIssueActionTypes.DeleteJiraIssue,
        JiraIssueActionTypes.AddSubJiraIssue,
        JiraIssueActionTypes.UpdateJiraIssue,
      ),
      withLatestFrom(this._store$),
      tap(this._saveToLs.bind(this))
    );

  constructor(private _actions$: Actions,
              private _store$: Store<any>,
              // private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs(state) {
    // const jiraIssuesFeatureState = state[1][JIRA_ISSUE_FEATURE_NAME];
    // const projectId = state[1][PROJECT_FEATURE_NAME].currentId;
    // if (projectId) {
    //   this._persistenceService.saveIssuesForProject(projectId, jiraIssuesFeatureState);
    // } else {
    //   throw new Error('No current project id');
    // }
  }
}

