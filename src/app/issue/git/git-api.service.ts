import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { GIT_API_BASE_URL } from './git.const';
import { combineLatest, from, Observable, ObservableInput, throwError } from 'rxjs';
import { GitOriginalIssue } from './git-api-responses';
import { catchError, map, share, take } from 'rxjs/operators';
import { mapGitIssue, mapGitIssueToSearchResult } from './git-issue/git-issue-map.util';
import { GitComment, GitIssue } from './git-issue/git-issue.model';
import { SearchResultItem } from '../issue';

const BASE = GIT_API_BASE_URL;
const MAX_CACHE_AGE = 60 * 5 * 1000;

@Injectable({
  providedIn: 'root'
})
export class GitApiService {
  private _cfg: GitCfg;
  private _cachedIssues: GitIssue[];
  private _lastCacheUpdate: number;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGitCfg$.subscribe((cfg: GitCfg) => {
      this._cfg = cfg;
    });
  }

  getCompleteIssueDataForRepo(repo = this._cfg.repo, isSkipCheck = false): Observable<GitIssue[]> {
    if (!isSkipCheck) {
      this._checkSettings();
    }
    return combineLatest(
      this._getAllIssuesForRepo(repo, isSkipCheck),
      this._getAllCommentsForRepo(repo, isSkipCheck),
    ).pipe(
      take(1),
      map(([issues, comments]) => this._mergeIssuesAndComments(issues, comments)),
    );
  }


  searchIssueForRepo(searchText: string, repo = this._cfg.repo): Observable<SearchResultItem[]> {
    this._checkSettings();
    if (this._cachedIssues && this._cachedIssues.length && (this._lastCacheUpdate + MAX_CACHE_AGE > Date.now())) {
      return from([this._cachedIssues.map(mapGitIssueToSearchResult)]);
    } else {
      const completeIssues$ = this.getCompleteIssueDataForRepo(repo)
        .pipe(
          catchError(this._handleRequestError.bind(this)),
          // a single request should suffice
          share(),
          // tap(issues => console.log(issues)),
        );

      // update cache
      completeIssues$.pipe(take(1)).subscribe(issues => this._updateIssueCache(issues));

      return completeIssues$.pipe(map((issues: GitIssue[]) =>
          issues.filter(issue =>
            issue.title.toLowerCase().match(searchText.toLowerCase())
            || issue.body.toLowerCase().match(searchText.toLowerCase())
          )
            .map(mapGitIssueToSearchResult)
        ),
      );
    }
  }

  refreshIssuesCache() {
    if (this._isValidSettings()) {
      this.getCompleteIssueDataForRepo().subscribe(issues => {
        this._updateIssueCache(issues);
      });
    }
  }

  private _updateIssueCache(issues: GitIssue[]) {
    this._cachedIssues = issues;
    this._lastCacheUpdate = Date.now();
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
      throw throwError('Not enough settings');
    }
  }

  private _handleRequestError(error: HttpErrorResponse, caught: Observable<Object>): ObservableInput<{}> {
    console.error(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({type: 'ERROR', message: 'GitHub: Request failed because of a client side network error'});
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({type: 'ERROR', message: `GitHub: API returned ${error.status}. ${error.error && error.error.message}`});
    }
    return throwError('GitHub: Api request failed.');
  }

  private _mergeIssuesAndComments(issues: GitIssue[], comments: GitComment[]): GitIssue[] {
    console.log(issues, comments);

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
// getIssueById(issueId: number): Observable<any> {
//   this._checkSettings();
// return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueId}`)
//   .pipe(
//     catchError(this._handleRequestError.bind(this)),
//     map((res: any) => {
//       console.log('GITHBU GET ISSUE BY ID RES', res);
//       return res;
//     }),
//   );
// }
//
// getCommentsForIssue(issueId: number): Observable<any> {
//   this._checkSettings();
// return this._http.get(BASE + `${BASE}repos/${this._cfg.repo}/issues/${issueId}/comments`)
//   .pipe(
//     catchError(this._handleRequestError.bind(this)),
//   );
// }
