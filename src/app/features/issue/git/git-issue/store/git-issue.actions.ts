import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { GitIssue } from '../git-issue.model';
import { GitIssueState } from './git-issue.reducer';
import { AddTask, DeleteTask, MoveToArchive, RestoreTask } from '../../../../tasks/store/task.actions';

export enum GitIssueActionTypes {
  LoadState = '[GitIssue] Load GitIssue State',
  AddOpenGitIssuesToBacklog = '[GitIssue] Add open issues to backlog',

  // GitIssue Actions
  LoadGitIssues = '[GitIssue] Load GitIssues',
  UpsertGitIssue = '[GitIssue] Upsert GitIssue',
  AddGitIssue = '[GitIssue] Add GitIssue',
  AddGitIssues = '[GitIssue] Add GitIssues',
  UpdateGitIssue = '[GitIssue] Update GitIssue',
  UpdateGitIssues = '[GitIssue] Update GitIssues',
  DeleteGitIssue = '[GitIssue] Delete GitIssue',
  DeleteGitIssues = '[GitIssue] Delete GitIssues',
  ClearGitIssues = '[GitIssue] Clear GitIssues',
}

export class LoadState implements Action {
  readonly type = GitIssueActionTypes.LoadState;

  constructor(public payload: { state: GitIssueState }) {
  }
}

export class AddOpenGitIssuesToBacklog implements Action {
  readonly type = GitIssueActionTypes.AddOpenGitIssuesToBacklog;
}

export class LoadGitIssues implements Action {
  readonly type = GitIssueActionTypes.LoadGitIssues;

  constructor(public payload: { gitIssues: GitIssue[] }) {
  }
}

export class AddGitIssue implements Action {
  readonly type = GitIssueActionTypes.AddGitIssue;

  constructor(public payload: { gitIssue: GitIssue }) {
  }
}

export class UpsertGitIssue implements Action {
  readonly type = GitIssueActionTypes.UpsertGitIssue;

  constructor(public payload: { gitIssue: GitIssue }) {
  }
}

export class AddGitIssues implements Action {
  readonly type = GitIssueActionTypes.AddGitIssues;

  constructor(public payload: { gitIssues: GitIssue[] }) {
  }
}

export class UpdateGitIssue implements Action {
  readonly type = GitIssueActionTypes.UpdateGitIssue;

  constructor(public payload: { gitIssue: Update<GitIssue> }) {
  }
}

export class UpdateGitIssues implements Action {
  readonly type = GitIssueActionTypes.UpdateGitIssues;

  constructor(public payload: { gitIssues: Update<GitIssue>[] }) {
  }
}

export class DeleteGitIssue implements Action {
  readonly type = GitIssueActionTypes.DeleteGitIssue;

  constructor(public payload: { id: number }) {
  }
}

export class DeleteGitIssues implements Action {
  readonly type = GitIssueActionTypes.DeleteGitIssues;

  constructor(public payload: { ids: number[] }) {
  }
}

export class ClearGitIssues implements Action {
  readonly type = GitIssueActionTypes.ClearGitIssues;
}

export type GitIssueActions
  = LoadGitIssues
  | AddOpenGitIssuesToBacklog
  | LoadState
  | UpsertGitIssue
  | AddGitIssue
  | AddGitIssues
  | UpdateGitIssue
  | UpdateGitIssues
  | DeleteGitIssue
  | DeleteGitIssues
  | ClearGitIssues
  ;

