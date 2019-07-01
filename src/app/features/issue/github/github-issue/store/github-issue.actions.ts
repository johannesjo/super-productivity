import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {GithubIssue} from '../github-issue.model';
import {GithubIssueState} from './github-issue.reducer';

export enum GithubIssueActionTypes {
  LoadState = '[GithubIssue] Load GithubIssue State',
  AddOpenGithubIssuesToBacklog = '[GithubIssue] Add open issues to backlog',

  // GithubIssue Actions
  LoadGithubIssues = '[GithubIssue] Load GithubIssues',
  UpsertGithubIssue = '[GithubIssue] Upsert GithubIssue',
  AddGithubIssue = '[GithubIssue] Add GithubIssue',
  AddGithubIssues = '[GithubIssue] Add GithubIssues',
  UpdateGithubIssue = '[GithubIssue] Update GithubIssue',
  UpdateGithubIssues = '[GithubIssue] Update GithubIssues',
  DeleteGithubIssue = '[GithubIssue] Delete GithubIssue',
  DeleteGithubIssues = '[GithubIssue] Delete GithubIssues',
  ClearGithubIssues = '[GithubIssue] Clear GithubIssues',
}

export class LoadState implements Action {
  readonly type = GithubIssueActionTypes.LoadState;

  constructor(public payload: { state: GithubIssueState }) {
  }
}

export class AddOpenGithubIssuesToBacklog implements Action {
  readonly type = GithubIssueActionTypes.AddOpenGithubIssuesToBacklog;
}

export class LoadGithubIssues implements Action {
  readonly type = GithubIssueActionTypes.LoadGithubIssues;

  constructor(public payload: { githubIssues: GithubIssue[] }) {
  }
}

export class AddGithubIssue implements Action {
  readonly type = GithubIssueActionTypes.AddGithubIssue;

  constructor(public payload: { githubIssue: GithubIssue }) {
  }
}

export class UpsertGithubIssue implements Action {
  readonly type = GithubIssueActionTypes.UpsertGithubIssue;

  constructor(public payload: { githubIssue: GithubIssue }) {
  }
}

export class AddGithubIssues implements Action {
  readonly type = GithubIssueActionTypes.AddGithubIssues;

  constructor(public payload: { githubIssues: GithubIssue[] }) {
  }
}

export class UpdateGithubIssue implements Action {
  readonly type = GithubIssueActionTypes.UpdateGithubIssue;

  constructor(public payload: { githubIssue: Update<GithubIssue> }) {
  }
}

export class UpdateGithubIssues implements Action {
  readonly type = GithubIssueActionTypes.UpdateGithubIssues;

  constructor(public payload: { githubIssues: Update<GithubIssue>[] }) {
  }
}

export class DeleteGithubIssue implements Action {
  readonly type = GithubIssueActionTypes.DeleteGithubIssue;

  constructor(public payload: { id: number }) {
  }
}

export class DeleteGithubIssues implements Action {
  readonly type = GithubIssueActionTypes.DeleteGithubIssues;

  constructor(public payload: { ids: number[] }) {
  }
}

export class ClearGithubIssues implements Action {
  readonly type = GithubIssueActionTypes.ClearGithubIssues;
}

export type GithubIssueActions
  = LoadGithubIssues
  | AddOpenGithubIssuesToBacklog
  | LoadState
  | UpsertGithubIssue
  | AddGithubIssue
  | AddGithubIssues
  | UpdateGithubIssue
  | UpdateGithubIssues
  | DeleteGithubIssue
  | DeleteGithubIssues
  | ClearGithubIssues
  ;

