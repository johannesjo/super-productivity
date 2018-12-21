import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { GIT_API_BASE_URL } from './git.const';
import { combineLatest, Observable, ObservableInput, throwError } from 'rxjs';
import { GitOriginalIssue } from './git-api-responses';
import { catchError, map, take } from 'rxjs/operators';
import { mapGitIssue, mapGitIssueToSearchResult } from './git-issue/git-issue-map.util';
import { GitComment, GitIssue } from './git-issue/git-issue.model';
import { SearchResultItem } from '../issue';

const BASE = GIT_API_BASE_URL;

@Injectable({
  providedIn: 'root'
})
export class GitApiService {
  private _cfg: GitCfg;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGitCfg$.subscribe((cfg: GitCfg) => {
      this._cfg = cfg;
      if (this._cfg) {
        // this.getCompleteIssueDataForRepo().subscribe(res => console.log(res));
        // this.getAllIssuesForRepo();
      }
    });
  }

  getCompleteIssueDataForRepo(repo = this._cfg.repo): Observable<GitIssue[]> {
    this._checkSettings();
    return combineLatest(
      this._getAllIssuesForRepo(repo),
      this._getAllCommentsForRepo(repo),
    ).pipe(
      take(1),
      map(([issues, comments]) => this._mergeIssuesAndComments(issues, comments)),
    );
  }


  // TODO move to jira-issue-service
  searchIssueForRepo(searchText: string, repo = this._cfg.repo): Observable<SearchResultItem[]> {
    this._checkSettings();
    return this.getCompleteIssueDataForRepo(repo)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        map((issues: GitIssue[]) =>
          issues.filter(issue => issue.title.match(searchText))
            .map(mapGitIssueToSearchResult)
        ),
        // tap(issues => console.log(issues)),
      );
  }

  private _getAllIssuesForRepo(repo = this._cfg.repo): Observable<GitIssue[]> {
    this._checkSettings();
    return this._http.get(`${BASE}repos/${repo}/issues?per_page=240`)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        map((issues: GitOriginalIssue[]) => issues ? issues.map(mapGitIssue) : []),
      );
  }

  private _getAllCommentsForRepo(repo = this._cfg.repo): Observable<GitComment[]> {
    this._checkSettings();
    return this._http.get(`${BASE}repos/${repo}/issues/comments?sort=created&direction=desc&per_page=240`)
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
          console.log(comment.issue_url === issue.apiUrl, comment.issue_url, issue.apiUrl);


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
