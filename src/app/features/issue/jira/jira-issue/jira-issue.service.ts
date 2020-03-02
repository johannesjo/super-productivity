import {Injectable} from '@angular/core';
import {JiraIssue} from './jira-issue.model';
import {Store} from '@ngrx/store';
import {JiraIssueActionTypes} from './store/jira-issue.actions';
import {JiraApiService} from '../jira-api.service';
import {SnackService} from '../../../../core/snack/snack.service';
import {TaskService} from '../../../tasks/task.service';


@Injectable({
  providedIn: 'root',
})
export class JiraIssueService {

  constructor(
    private readonly _store: Store<any>,
    private readonly _jiraApiService: JiraApiService,
    private readonly _snackService: SnackService,
    private readonly _taskService: TaskService,
  ) {
  }
  // NOTE: this can stay for now
  update(jiraIssueId: string, changedFields: Partial<JiraIssue>, oldIssue?: JiraIssue) {
    this._store.dispatch({
      type: JiraIssueActionTypes.UpdateJiraIssue,
      payload: {
        jiraIssue: {
          id: jiraIssueId,
          changes: changedFields
        },
        oldIssue
      }
    });
  }
}
