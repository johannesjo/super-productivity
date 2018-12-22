import { Injectable } from '@angular/core';
import { GitIssue } from './git-issue.model';
import { Store } from '@ngrx/store';
import { GitIssueActionTypes } from './store/git-issue.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { GitIssueState } from './store/git-issue.reducer';
import { take } from 'rxjs/operators';
import { GitApiService } from '../git-api.service';
import { SnackService } from '../../../core/snack/snack.service';
import { GitCfg } from '../git';


@Injectable()
export class GitIssueService {
  // gitIssues$: Observable<GitIssue[]> = this._store.pipe(select(selectAllGitIssues));
  // gitIssuesEntities$: Observable<Dictionary<GitIssue>> = this._store.pipe(select(selectGitIssueEntities));

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _gitApiService: GitApiService,
    private readonly _snackService: SnackService,
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

  updateIssuesFromApi(oldIssues: GitIssue[], cfg?: GitCfg, isNotify = true) {
    console.log('UPDATE ISSUE FROM API');
    this._gitApiService.getCompleteIssueDataForRepo(cfg.repo)
      .pipe(
        take(1)
      ).subscribe(newIssues => {
      oldIssues.forEach((oldIssue: GitIssue) => {
        const matchingNewIssue: GitIssue = newIssues.find(newIssue => newIssue.id === oldIssue.id);
        if (matchingNewIssue) {
          const isNewComment = matchingNewIssue.comments.length !== (oldIssue.comments && oldIssue.comments.length);
          const isIssueChanged = (matchingNewIssue.updated_at !== oldIssue.updated_at);
          const wasUpdated = isNewComment || isIssueChanged;
          if (isNewComment && isNotify) {
            this._snackService.open({
              icon: 'cloud_download',
              message: `Git: New comment for ${matchingNewIssue.number} "${matchingNewIssue.title}"`
            });
          } else if (isIssueChanged && isNotify) {
            this._snackService.open({
              icon: 'cloud_download',
              message: `Git: Update for ${matchingNewIssue.number} "${matchingNewIssue.title}"`
            });
          }

          if (wasUpdated) {
            this.update(oldIssue.id, {...matchingNewIssue, wasUpdated: true});
          }
        }

        if (!matchingNewIssue && isNotify) {
          this._snackService.open({
            type: 'ERROR',
            message: `Git: Issue ${oldIssue.number} "${oldIssue.title}" seems to be deleted on git`
          });
        }
      });
    });
  }
}
