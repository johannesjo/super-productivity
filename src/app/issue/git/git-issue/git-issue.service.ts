import { Injectable } from '@angular/core';
import { GitIssue } from './git-issue.model';
import { Store } from '@ngrx/store';
import { GitIssueActionTypes } from './store/git-issue.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { GitIssueState } from './store/git-issue.reducer';


@Injectable()
export class GitIssueService {
  // gitIssues$: Observable<GitIssue[]> = this._store.pipe(select(selectAllGitIssues));
  // gitIssuesEntities$: Observable<Dictionary<GitIssue>> = this._store.pipe(select(selectGitIssueEntities));

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
  ) {
  }

  // META
  // ----
  async loadStateForProject(projectId: string) {
    const lsGitIssueState = await this._persistenceService.loadIssuesForProject(projectId, 'GIT') as GitIssueState;
    if (lsGitIssueState) {
      this.loadState(lsGitIssueState);
    }
  }

  loadState(state: GitIssueState) {
    this._store.dispatch({
      type: GitIssueActionTypes.LoadState,
      payload: {
        state: state,
      }
    });
  }

  // CRUD
  // ----
  add(gitIssue: GitIssue) {
    this._store.dispatch({
      type: GitIssueActionTypes.AddGitIssue,
      payload: {
        gitIssue: gitIssue
      }
    });
  }

  upsert(gitIssue: GitIssue) {
    this._store.dispatch({
      type: GitIssueActionTypes.UpsertGitIssue,
      payload: {
        gitIssue: gitIssue
      }
    });
  }

  remove(gitIssueId: number) {
    this._store.dispatch({
      type: GitIssueActionTypes.DeleteGitIssue,
      payload: {id: gitIssueId}
    });
  }


  update(gitIssueId: number, changedFields: Partial<GitIssue>) {
    this._store.dispatch({
      type: GitIssueActionTypes.UpdateGitIssue,
      payload: {
        gitIssue: {
          id: gitIssueId,
          changes: changedFields
        }
      }
    });
  }

  addOpenIssuesToBacklog() {
    this._store.dispatch({
      type: GitIssueActionTypes.AddOpenGitIssuesToBacklog,
    });
  }
}
