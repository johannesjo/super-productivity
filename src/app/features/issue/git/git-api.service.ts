import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../../core/snack/snack.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { GIT_API_BASE_URL, GIT_MAX_CACHE_AGE } from './git.const';
import { combineLatest, from, Observable, ObservableInput, Subject, throwError } from 'rxjs';
import { GitOriginalComment, GitOriginalIssue } from './git-api-responses';
import { catchError, map, share, switchMap, take, tap } from 'rxjs/operators';
import { mapGitIssue, mapGitIssueToSearchResult } from './git-issue/git-issue-map.util';
import { GitComment, GitIssue } from './git-issue/git-issue.model';
import { SearchResultItem } from '../issue';
import { loadFromLs, saveToLs } from '../../../core/persistence/local-storage';
import { LS_GIT_ISSUE_CACHE_PREFIX } from '../../../core/persistence/ls-keys.const';
import { HANDLED_ERROR } from '../../../app.constants';

const BASE = GIT_API_BASE_URL;

@Injectable({
  providedIn: 'root',
})
export class GitApiService {
  public onCacheRefresh$ = new Subject<boolean>();

  private _cfg: GitCfg;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGitCfg$.subscribe((cfg: GitCfg) => {
      this._cfg = cfg;
    });
  }

  getById(id: number): Observable<GitIssue> {
    this._checkSettings();

    return this.getCompleteIssueDataForRepo()
      .pipe(switchMap(issues => issues.filter(issue => issue.id === id)));
  }

  getCompleteIssueDataForRepo(repo = this._cfg.repo, isSkipCheck = false, isForceRefresh = false): Observable<GitIssue[]> {
    if (!isSkipCheck) {
      this._checkSettings();
    }

    const cached = loadFromLs(LS_GIT_ISSUE_CACHE_PREFIX + this._projectService.currentId);
    const cachedIssues: GitIssue[] = cached && cached.issues;
    const lastUpdate: number = cached && cached.lastUpdate;

    console.log('getCompleteIssueDataForRepo isUseCached',
      cachedIssues && Array.isArray(cachedIssues) && (lastUpdate + GIT_MAX_CACHE_AGE > Date.now()));

    if (
      !isForceRefresh &&
      cachedIssues && Array.isArray(cachedIssues) && (lastUpdate + GIT_MAX_CACHE_AGE > Date.now())
    ) {
      return from([cachedIssues]);
    } else {
      return combineLatest(
        this._getAllIssuesForRepo(repo, isSkipCheck),
        this._getAllCommentsForRepo(repo, isSkipCheck),
      ).pipe(
        take(1),
        map(([issues, comments]) => this._mergeIssuesAndComments(issues, comments)),
        tap(issues => {
          if (Array.isArray(issues)) {
            this._updateIssueCache(issues);
          }
        }),
      );
    }
  }


  searchIssueForRepo(searchText: string, repo = this._cfg.repo): Observable<SearchResultItem[]> {
    const filterFn = issue =>
      issue.title.toLowerCase().match(searchText.toLowerCase())
      || issue.body.toLowerCase().match(searchText.toLowerCase());

    this._checkSettings();

    return this.getCompleteIssueDataForRepo(repo)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        // a single request should suffice
        share(),
        map((issues: GitIssue[]) =>
          issues.filter(filterFn)
            .map(mapGitIssueToSearchResult)
        ),
      );
  }

  refreshIssuesCacheIfOld(): void {
    this.getCompleteIssueDataForRepo().subscribe();
  }

  getIssueWithCommentsByIssueNumber(issueNumber: number): Observable<GitIssue> {
    this._checkSettings();
    return combineLatest(
      this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueNumber}`),
      this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueNumber}/comments`),
    ).pipe(
      catchError(this._handleRequestError.bind(this)),
      map(([issue, comments]: [GitOriginalIssue, GitOriginalComment[]]) => {
        return {
          ...mapGitIssue(issue),
          comments: comments,
        };
      }),
    );
  }

  private _updateIssueCache(issues: GitIssue[]) {
    saveToLs(LS_GIT_ISSUE_CACHE_PREFIX + this._projectService.currentId, {
      issues,
      lastUpdate: Date.now(),
    });
    this.onCacheRefresh$.next(true);
  }

  private _getAllIssuesForRepo(repo = this._cfg.repo, isSkipCheck = false): Observable<GitIssue[]> {
    if (!isSkipCheck) {
      this._checkSettings();
    }
    return this._http.get(`${BASE}repos/${repo}/issues?per_page=100`)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        map((issues: GitOriginalIssue[]) => issues ? issues.map(mapGitIssue) : []),
      );
  }

  private _getAllCommentsForRepo(repo = this._cfg.repo, isSkipCheck = false): Observable<GitComment[]> {
    if (!isSkipCheck) {
      this._checkSettings();
    }
    return combineLatest(
      // the last 500 should hopefully be enough
      this._getCommentsPageForRepo(1, repo, isSkipCheck),
      this._getCommentsPageForRepo(2, repo, isSkipCheck),
      this._getCommentsPageForRepo(3, repo, isSkipCheck),
      this._getCommentsPageForRepo(4, repo, isSkipCheck),
      this._getCommentsPageForRepo(5, repo, isSkipCheck),
    )
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        map(([p1, p2, p3, p4, p5]) => [].concat(p1, p2, p3, p4, p5))
      );
  }

  private _getCommentsPageForRepo(page = 1, repo = this._cfg.repo, isSkipCheck = false): Observable<GitComment[]> {
    if (!isSkipCheck) {
      this._checkSettings();
    }
    return this._http.get(`${BASE}repos/${repo}/issues/comments?sort=created&direction=desc&per_page=100&page=${page}`)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        map(res => res as GitComment[])
      );
  }

  private _checkSettings() {
    if (!this._isValidSettings()) {
      this._snackService.open({type: 'ERROR', message: 'Git is not properly configured'});
      throw new Error(`${HANDLED_ERROR} Not enough settings`);
    }
  }

  private _handleRequestError(error: HttpErrorResponse, caught: Observable<Object>): ObservableInput<{}> {
    console.error(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        message: 'GitHub: Request failed because of a client side network error'
      });
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({
        type: 'ERROR',
        message: `GitHub: API returned ${error.status}. ${error.error && error.error.message}`
      });
    }
    if (error && error.message) {
      return throwError({handledError: 'GitHub: ' + error.message});
    }

    return throwError({handledError: 'GitHub: Api request failed.'});
  }

  private _mergeIssuesAndComments(issues: GitIssue[], comments: GitComment[]): GitIssue[] {
    return issues.map(issue => {
      return {
        ...issue,
        comments: comments.filter(comment => {
          return (comment.issue_url === issue.apiUrl);
        }),
      };
    });
  }

  private _isValidSettings(): boolean {
    const cfg = this._cfg;
    return cfg && cfg.repo && cfg.repo.length > 0;
  }
}

//
// searchIssue(searchText: string): Observable<SearchResultItem[]> {
//   this._checkSettings();
// return this._http.get(`${BASE}search/issues?q=${encodeURI(searchText)}`)
//   .pipe(
//     catchError(this._handleRequestError.bind(this)),
//     map((res: GitIssueSearchResult) => {
//       if (res && res.items) {
//         return res.items.map(mapGitIssue).map(mapGitIssueToSearchResult);
//       } else {
//         return [];
//       }
//     }),
//   );
// }
//
//

//
// getCommentsForIssue(issueId: number): Observable<any> {
//   this._checkSettings();
// return this._http.get(BASE + `${BASE}repos/${this._cfg.repo}/issues/${issueId}/comments`)
//   .pipe(
//     catchError(this._handleRequestError.bind(this)),
//   );
// }
