import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {JiraIssue} from '../jira-issue.model';

export enum JiraIssueActionTypes {
  AddOpenJiraIssuesToBacklog = '[JiraIssue] Add open issues to backlog',
  UpdateJiraIssue = '[JiraIssue] Update JiraIssue',
}

// TODO maybe remove entirely
export class AddOpenJiraIssuesToBacklog implements Action {
  readonly type = JiraIssueActionTypes.AddOpenJiraIssuesToBacklog;
}

export class UpdateJiraIssue implements Action {
  readonly type = JiraIssueActionTypes.UpdateJiraIssue;

  constructor(public payload: { jiraIssue: Update<JiraIssue>, oldIssue: JiraIssue }) {
  }
}

