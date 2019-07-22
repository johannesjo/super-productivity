import {Injectable} from '@angular/core';
import {GithubIssue} from './github-issue.model';
import {select, Store} from '@ngrx/store';
import {GithubIssueActionTypes} from './store/github-issue.actions';
import {PersistenceService} from '../../../../core/persistence/persistence.service';
import {GithubIssueState, selectGithubIssueById} from './store/github-issue.reducer';
import {take} from 'rxjs/operators';
import {GithubApiService} from '../github-api.service';
import {SnackService} from '../../../../core/snack/snack.service';
import {GithubCfg} from '../github';
import {Observable} from 'rxjs';
import {GITHUB_TYPE} from '../../issue.const';
import {truncate} from '../../../../util/truncate';
import {T} from '../../../../t.const';


@Injectable({
  providedIn: 'root',
})
export class GithubIssueService {
  // githubIssues$: Observable<GithubIssue[]> = this._store.pipe(select(selectAllGithubIssues));
  // githubIssuesEntities$: Observable<Dictionary<GithubIssue>> = this._store.pipe(select(selectGithubIssueEntities));

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _githubApiService: GithubApiService,
    private readonly _snackService: SnackService,
  ) {
  }

  private _fineWithDeletionIssueIds = [];

  // META
  // ----
  async loadStateForProject(projectId: string) {
    const lsGithubIssueState = await this._persistenceService.loadIssuesForProject(projectId, GITHUB_TYPE) as GithubIssueState;
    if (lsGithubIssueState) {
      this.loadState(lsGithubIssueState);
    }
  }

  loadState(state: GithubIssueState) {
    this._store.dispatch({
      type: GithubIssueActionTypes.LoadState,
      payload: {
        state: state,
      }
    });
  }

  // CRUD
  // ----
  add(githubIssue: GithubIssue) {
    this._store.dispatch({
      type: GithubIssueActionTypes.AddGithubIssue,
      payload: {
        githubIssue: githubIssue
      }
    });
  }

  upsert(githubIssue: GithubIssue) {
    this._store.dispatch({
      type: GithubIssueActionTypes.UpsertGithubIssue,
      payload: {
        githubIssue: githubIssue
      }
    });
  }

  remove(githubIssueId: number) {
    this._store.dispatch({
      type: GithubIssueActionTypes.DeleteGithubIssue,
      payload: {id: githubIssueId}
    });
  }


  update(githubIssueId: number, changedFields: Partial<GithubIssue>) {
    this._store.dispatch({
      type: GithubIssueActionTypes.UpdateGithubIssue,
      payload: {
        githubIssue: {
          id: githubIssueId,
          changes: changedFields
        }
      }
    });
  }

  addOpenIssuesToBacklog() {
    this._store.dispatch({
      type: GithubIssueActionTypes.AddOpenGithubIssuesToBacklog,
    });
  }


  // NON ACTION CALLS
  // ----------------
  getById$(id: number): Observable<GithubIssue> {
    return this._store.pipe(select(selectGithubIssueById, {id}), take(1));
  }

  loadMissingIssueData(issueId) {
    return this._githubApiService.getById$(issueId)
      .pipe(take(1))
      .subscribe(issueData => {
        this.add(issueData);
      });

  }


  updateIssueFromApi(issueId_: number | string) {
    const issueNumber = issueId_ as number;
    this._githubApiService.getIssueWithCommentsByIssueNumber$(issueNumber).pipe(
      take(1)
    ).subscribe((issue) => {
      this.upsert(issue);
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: this._formatIssueTitle(issue.number, issue.title)
        },
        msg: T.F.GITHUB.S.MANUAL_UPDATE_ISSUE_SUCCESS,
      });
    });
  }

  updateIssuesFromApi(oldIssues: GithubIssue[], cfg: GithubCfg, isNotify = true) {
    this._githubApiService.getCompleteIssueDataForRepo$(cfg.repo)
      .pipe(
        take(1)
      ).subscribe(newIssues => {
      oldIssues.forEach((oldIssue: GithubIssue) => {
        const matchingNewIssue: GithubIssue = newIssues.find(newIssue => newIssue.id === oldIssue.id);
        if (matchingNewIssue) {
          const isNewComment = matchingNewIssue.comments.length !== (oldIssue.comments && oldIssue.comments.length);
          const isIssueChanged = (matchingNewIssue.updated_at !== oldIssue.updated_at);

          // NOTE: comments are reversed
          const lastComment = matchingNewIssue.comments && matchingNewIssue.comments[0];

          const wasUpdated = (cfg.filterUsername && cfg.filterUsername.length > 1)
            ? ((isNewComment && (lastComment.user.login !== cfg.filterUsername))
              || (isIssueChanged && matchingNewIssue.user.login !== cfg.filterUsername))
            : isNewComment || isIssueChanged;

          if (isNewComment && isNotify) {
            this._snackService.open({
              ico: 'cloud_download',
              translateParams: {
                issueText: this._formatIssueTitle(matchingNewIssue.number, matchingNewIssue.title)
              },
              msg: T.F.GITHUB.S.ISSUE_UPDATE,
            });
          } else if (isIssueChanged && isNotify) {
            this._snackService.open({
              ico: 'cloud_download',
              translateParams: {
                issueText: this._formatIssueTitle(matchingNewIssue.number, matchingNewIssue.title)
              },
              msg: T.F.GITHUB.S.IMPORTED_SINGLE_ISSUE,
            });
          }

          if (wasUpdated) {
            this.update(oldIssue.id, {...matchingNewIssue, wasUpdated: true});
          }
        }

        if (!matchingNewIssue && isNotify && !this._fineWithDeletionIssueIds.includes(oldIssue.id)) {
          this._snackService.open({
            type: 'CUSTOM',
            svgIco: 'github',
            translateParams: {
              issueText: this._formatIssueTitle(oldIssue.number, oldIssue.title)
            },
            msg: T.F.GITHUB.S.ISSUE_DELETED_OR_CLOSED,
            actionStr: T.F.GITHUB.S.SHOW_ISSUE_BTN,
            actionFn: () => {
              this._fineWithDeletionIssueIds.push(oldIssue.id);
              window.open(oldIssue.url, '_blank');
            }
          });
        }
      });
    });
  }

  private _formatIssueTitle(id: number, title: string): string {
    return `#${id} ${truncate(title)}`;
  }
}
