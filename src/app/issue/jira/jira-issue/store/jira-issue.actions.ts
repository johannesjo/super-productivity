import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { JiraIssue } from '../jira-issue.model';
import { JiraIssueState } from './jira-issue.reducer';
import { AddTask } from '../../../../tasks/store/task.actions';

export enum JiraIssueActionTypes {
  LoadState = '[JiraIssue] Load JiraIssue State',
  AddOpenJiraIssuesToBacklog = '[JiraIssue] Add open issues to backlog',

  // JiraIssue Actions
  LoadJiraIssues = '[JiraIssue] Load JiraIssues',
  UpsertJiraIssue = '[JiraIssue] Upsert JiraIssue',
  AddJiraIssue = '[JiraIssue] Add JiraIssue',
  AddJiraIssues = '[JiraIssue] Add JiraIssues',
  UpdateJiraIssue = '[JiraIssue] Update JiraIssue',
  UpdateJiraIssues = '[JiraIssue] Update JiraIssues',
  DeleteJiraIssue = '[JiraIssue] Delete JiraIssue',
  DeleteJiraIssues = '[JiraIssue] Delete JiraIssues',
  ClearJiraIssues = '[JiraIssue] Clear JiraIssues',
}

export class LoadState implements Action {
  readonly type = JiraIssueActionTypes.LoadState;

  constructor(public payload: { state: JiraIssueState }) {
  }
}

export class AddOpenJiraIssuesToBacklog implements Action {
  readonly type = JiraIssueActionTypes.AddOpenJiraIssuesToBacklog;
}

export class LoadJiraIssues implements Action {
  readonly type = JiraIssueActionTypes.LoadJiraIssues;

  constructor(public payload: { jiraIssues: JiraIssue[] }) {
  }
}

export class AddJiraIssue implements Action {
  readonly type = JiraIssueActionTypes.AddJiraIssue;

  constructor(public payload: { jiraIssue: JiraIssue }) {
  }
}

export class UpsertJiraIssue implements Action {
  readonly type = JiraIssueActionTypes.UpsertJiraIssue;

  constructor(public payload: { jiraIssue: JiraIssue }) {
  }
}

export class AddJiraIssues implements Action {
  readonly type = JiraIssueActionTypes.AddJiraIssues;

  constructor(public payload: { jiraIssues: JiraIssue[] }) {
  }
}

export class UpdateJiraIssue implements Action {
  readonly type = JiraIssueActionTypes.UpdateJiraIssue;

  constructor(public payload: { jiraIssue: Update<JiraIssue> }) {
  }
}

export class UpdateJiraIssues implements Action {
  readonly type = JiraIssueActionTypes.UpdateJiraIssues;

  constructor(public payload: { jiraIssues: Update<JiraIssue>[] }) {
  }
}

export class DeleteJiraIssue implements Action {
  readonly type = JiraIssueActionTypes.DeleteJiraIssue;

  constructor(public payload: { id: string }) {
  }
}

export class DeleteJiraIssues implements Action {
  readonly type = JiraIssueActionTypes.DeleteJiraIssues;

  constructor(public payload: { ids: string[] }) {
  }
}

export class ClearJiraIssues implements Action {
  readonly type = JiraIssueActionTypes.ClearJiraIssues;
}

export type JiraIssueActions
  = LoadJiraIssues
  | LoadState
  | AddOpenJiraIssuesToBacklog
  | UpsertJiraIssue
  | AddJiraIssue
  | AddJiraIssues
  | UpdateJiraIssue
  | UpdateJiraIssues
  | DeleteJiraIssue
  | DeleteJiraIssues
  | ClearJiraIssues
  ;

