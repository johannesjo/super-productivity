import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {JiraIssue} from '../jira-issue.model';

export enum JiraIssueActionTypes {
  UpdateJiraIssue = '[JiraIssue] Update JiraIssue',
}

export class UpdateJiraIssue implements Action {
  readonly type = JiraIssueActionTypes.UpdateJiraIssue;

  constructor(public payload: { jiraIssue: Update<JiraIssue>, oldIssue: JiraIssue }) {
  }
}

