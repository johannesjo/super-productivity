import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, ObservableInput, throwError, Subject, EMPTY, from, combineLatest, forkJoin } from 'rxjs';

import { ProjectService } from 'src/app/features/project/project.service';
import { SnackService } from 'src/app/core/snack/snack.service';

import { GitlabCfg } from '../gitlab';
import { GitlabOriginalIssue, GitlabOriginalComment } from './gitlab-api-responses';
import { HANDLED_ERROR_PROP_STR } from 'src/app/app.constants';
import { GITLAB_API_BASE_URL, GITLAB_MAX_CACHE_AGE } from '../gitlab.const';
import { T } from 'src/app/t.const';
import { catchError, map, tap, share, switchMap, take, flatMap } from 'rxjs/operators';
import { GitlabIssue, GitlabComment } from '../gitlab-issue/gitlab-issue.model';
import { loadFromLs, saveToLs } from 'src/app/core/persistence/local-storage';
import { mapGitlabIssue, mapGitlabIssueToSearchResult } from '../gitlab-issue/gitlab-issue-map.util';
import { SearchResultItem } from '../../../issue.model';

const BASE = GITLAB_API_BASE_URL;

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  private _cfg: GitlabCfg;
  private _header: HttpHeaders;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGitlabCfg$.subscribe((cfg: GitlabCfg) => {
      this._cfg = cfg;
      this.setHeader(cfg.token);
    });
  }

  private setHeader(accessToken: string) {
    if (accessToken) {
      this._header = new HttpHeaders({
        Authorization: 'Bearer ' + accessToken
      });
    } else {
      this._header = null;
    }
  }

  private getHeader(): HttpHeaders {
    return this._header;
  }

  public refreshIssuesCacheIfOld(): void {
    this.getProjectData$().subscribe();
  }

  public getProjectData$(): Observable<GitlabIssue[]> {
    if (!this._isValidSettings()) {
      console.log('SS');
      return EMPTY;
    }
    console.log('lol');
    return this._getProjectIssues$(1).pipe(
      flatMap(
        issues => forkJoin(
          [
            ...issues.map(issue => this.getIssueWithComments$(issue))
          ]
        )
      ),
      tap(issues => {
        console.log('Issues');
        console.log(issues);
      }),
    );
  }

  getById$(id: number): Observable<GitlabIssue> {
    if (!this._isValidSettings()) {
      return EMPTY;
    }
    return this.getProjectData$()
      .pipe(switchMap(issues => {
        console.log('WAAAAAAT');
        console.log(issues);
        return issues.filter(issue => issue.id === id);
      }));
  }

  getIssueWithComments$(issue: GitlabIssue): Observable<GitlabIssue> {
    return this._getIssueComments$(issue.id, 1).pipe(
      map( (comments) => {
        return {
          ...issue,
          comments,
          commentsNr: comments.length,
        };
      }
    ));
  }

  getIssueWithCommentsByIssueNumber$(issueNumber: number): Observable<GitlabIssue> {
    console.log('getIssueWithComments');
    if (!this._isValidSettings()) {
      return EMPTY;
    }
    return combineLatest([
      this._getProjectIssue$(issueNumber),
      this._getIssueComments$(issueNumber, 1),
    ]).pipe(
      take(1),
      map(([issue, comments]: [GitlabIssue, GitlabComment[]]) => {
        console.log('s', issue);
        console.log('a', comments);
        return {
          ...issue,
          comments,
        };
      })
    );
  }

  private _getProjectIssues$(pageNumber: number): Observable<GitlabIssue[]> {
    console.log('getProjectIssues');

    return this._http.get(
      `${BASE}/${this._cfg.project}/issues?order_by=updated_at&per_page=100&page=${pageNumber}`,
      { headers: this._header ? this._header : {} }
    ).pipe(
      catchError(this._handleRequestError$.bind(this)),
      take(1),
      map((issues: GitlabOriginalIssue[]) => {
        return issues ? issues.map(mapGitlabIssue) : [];
      }),
    );
  }

  private _getProjectIssue$(issueId: number): Observable<GitlabIssue> {
    console.log('getProjectIssue');
    return this._http.get(
      `${BASE}/${this._cfg.project}/issues/${issueId}`,
      { headers: this._header ? this._header : {} }
    ).pipe(
      catchError(this._handleRequestError$.bind(this)),
      map((issue: GitlabOriginalIssue) => {
        return issue ? mapGitlabIssue(issue) : null;
      }),
    );
  }

  searchIssueInProject$(searchText: string): Observable<SearchResultItem[]> {
    const filterFn = issue => {
      try {
        return issue.title.toLowerCase().match(searchText.toLowerCase())
          || issue.body.toLowerCase().match(searchText.toLowerCase());
      } catch (e) {
        console.warn('RegEx Error', e);
        return false;
      }
    };
    if (!this._isValidSettings()) {
      return EMPTY;
    }
    return this.getProjectData$()
      .pipe(
        catchError(this._handleRequestError$.bind(this)),
        // a single request should suffice
        share(),
        map((issues: GitlabIssue[]) =>
          issues.filter(filterFn)
            .map(mapGitlabIssueToSearchResult)
        ),
      );
  }

  private _getIssueComments$(issueid: number, pageNumber: number) {
    if (!this._isValidSettings()) {
      return EMPTY;
    }
    return this._http.get(
      `${BASE}/${this._cfg.project}/issues/${issueid}/notes?per_page=100&page=${pageNumber}`,
      { headers: this._header ? this._header : {} }
    ).pipe(
      catchError(this._handleRequestError$.bind(this)),
      map((comments: GitlabOriginalComment[]) => {
        return comments ? comments : [];
      }),
    );
  }

  private _isValidSettings(): boolean {
    const cfg = this._cfg;
    if (cfg && cfg.project && cfg.project.length > 0) {
      return true;
    }
    this._snackService.open({
      type: 'ERROR',
      msg: T.F.GITLAB.S.ERR_NOT_CONFIGURED
    });
    return false;
  }

  private _handleRequestError$(error: HttpErrorResponse, caught: Observable<object>): ObservableInput<{}> {
    console.error(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.GITLAB.S.ERR_NETWORK,
      });
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({
        type: 'ERROR',
        translateParams: {
          statusCode: error.status,
          errorMsg: error.error && error.error.message,
        },
        msg: T.F.GITLAB.S.ERR_NOT_CONFIGURED,
      });
    }
    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'Gitlab: ' + error.message });
    }
    return throwError({ [HANDLED_ERROR_PROP_STR]: 'Gitlab: Api request failed.' });
  }
}
