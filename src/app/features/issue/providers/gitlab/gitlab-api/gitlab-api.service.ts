import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { EMPTY, forkJoin, Observable, ObservableInput, of, throwError } from 'rxjs';
import { SnackService } from 'src/app/core/snack/snack.service';

import { GitlabCfg } from '../gitlab';
import { GitlabOriginalComment, GitlabOriginalIssue } from './gitlab-api-responses';
import { HANDLED_ERROR_PROP_STR } from 'src/app/app.constants';
import { GITLAB_API_BASE_URL, GITLAB_PROJECT_REGEX } from '../gitlab.const';
import { T } from 'src/app/t.const';
import { catchError, filter, map, mergeMap, take } from 'rxjs/operators';
import { GitlabIssue } from '../gitlab-issue/gitlab-issue.model';
import {
  mapGitlabIssue,
  mapGitlabIssueToSearchResult,
} from '../gitlab-issue/gitlab-issue-map.util';
import { SearchResultItem } from '../../../issue.model';

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  constructor(private _snackService: SnackService, private _http: HttpClient) {}

  getProjectData$(cfg: GitlabCfg): Observable<GitlabIssue[]> {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this._getProjectIssues$(1, cfg).pipe(
      mergeMap((issues: GitlabIssue[]) => {
        if (issues && issues.length) {
          return forkJoin([
            ...issues.map((issue) => this.getIssueWithComments$(issue, cfg)),
          ]);
        } else {
          return of([]);
        }
      }),
    );
  }

  getById$(id: number, cfg: GitlabCfg): Observable<GitlabIssue> {
    return this._sendRequest$(
      {
        url: `${this.apiLink(cfg)}/issues/${id}`,
      },
      cfg,
    ).pipe(
      mergeMap((issue: GitlabOriginalIssue) => {
        return this.getIssueWithComments$(mapGitlabIssue(issue), cfg);
      }),
    );
  }

  getByIds$(ids: string[], cfg: GitlabCfg): Observable<GitlabIssue[]> {
    let queryParams = 'iids[]=';
    for (let i = 0; i < ids.length; i++) {
      if (i === ids.length - 1) {
        queryParams += ids[i];
      } else {
        queryParams += `${ids[i]}&iids[]=`;
      }
    }
    return this._sendRequest$(
      {
        url: `${this.apiLink(cfg)}/issues?${queryParams}&per_page=100`,
      },
      cfg,
    ).pipe(
      map((issues: GitlabOriginalIssue[]) => {
        return issues ? issues.map(mapGitlabIssue) : [];
      }),
      mergeMap((issues: GitlabIssue[]) => {
        if (issues && issues.length) {
          return forkJoin([
            ...issues.map((issue) => this.getIssueWithComments$(issue, cfg)),
          ]);
        } else {
          return of([]);
        }
      }),
    );
  }

  getIssueWithComments$(issue: GitlabIssue, cfg: GitlabCfg): Observable<GitlabIssue> {
    return this._getIssueComments$(issue.id, 1, cfg).pipe(
      map((comments) => {
        return {
          ...issue,
          comments,
          commentsNr: comments.length,
        };
      }),
    );
  }

  searchIssueInProject$(
    searchText: string,
    cfg: GitlabCfg,
  ): Observable<SearchResultItem[]> {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this._sendRequest$(
      {
        url: `${this.apiLink(cfg)}/issues?search=${searchText}&order_by=updated_at`,
      },
      cfg,
    ).pipe(
      map((issues: GitlabOriginalIssue[]) => {
        return issues ? issues.map(mapGitlabIssue) : [];
      }),
      mergeMap((issues: GitlabIssue[]) => {
        if (issues && issues.length) {
          return forkJoin([
            ...issues.map((issue) => this.getIssueWithComments$(issue, cfg)),
          ]);
        } else {
          return of([]);
        }
      }),
      map((issues: GitlabIssue[]) => {
        return issues ? issues.map(mapGitlabIssueToSearchResult) : [];
      }),
    );
  }

  private _getProjectIssues$(
    pageNumber: number,
    cfg: GitlabCfg,
  ): Observable<GitlabIssue[]> {
    return this._sendRequest$(
      {
        url: `${this.apiLink(
          cfg,
        )}/issues?state=opened&order_by=updated_at&per_page=100&page=${pageNumber}`,
      },
      cfg,
    ).pipe(
      take(1),
      map((issues: GitlabOriginalIssue[]) => {
        return issues ? issues.map(mapGitlabIssue) : [];
      }),
    );
  }

  private _getIssueComments$(issueid: number, pageNumber: number, cfg: GitlabCfg) {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this._sendRequest$(
      {
        url: `${this.apiLink(
          cfg,
        )}/issues/${issueid}/notes?per_page=100&page=${pageNumber}`,
      },
      cfg,
    ).pipe(
      map((comments: GitlabOriginalComment[]) => {
        return comments ? comments : [];
      }),
    );
  }

  private _isValidSettings(cfg: GitlabCfg): boolean {
    if (cfg && cfg.project && cfg.project.length > 0) {
      return true;
    }
    this._snackService.open({
      type: 'ERROR',
      msg: T.F.GITLAB.S.ERR_NOT_CONFIGURED,
    });
    return false;
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: GitlabCfg,
  ): Observable<any> {
    this._isValidSettings(cfg);

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
      headers: {
        ...(cfg.token ? { Authorization: 'Bearer ' + cfg.token } : {}),
        ...(params.headers ? params.headers : {}),
      },
    };

    const bodyArg = params.data ? [params.data] : [];

    const allArgs = [
      ...bodyArg,
      {
        headers: new HttpHeaders(p.headers),
        params: new HttpParams({ fromObject: p.params }),
        reportProgress: false,
        observe: 'response',
        responseType: params.responseType,
      },
    ];
    const req = new HttpRequest(p.method, p.url, ...allArgs);
    return this._http.request(req).pipe(
      // TODO remove type: 0 @see https://brianflove.com/2018/09/03/angular-http-client-observe-response/
      filter((res) => !(res === Object(res) && res.type === 0)),
      map((res: any) => (res && res.body ? res.body : res)),
      catchError(this._handleRequestError$.bind(this)),
    );
  }

  private _handleRequestError$(
    error: HttpErrorResponse,
    caught: Observable<unknown>,
  ): ObservableInput<unknown> {
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

  private apiLink(projectConfig: GitlabCfg): string {
    let apiURL: string = '';
    let projectURL: string = projectConfig.project ? projectConfig.project : '';
    if (projectConfig.gitlabBaseUrl) {
      const fixedUrl = projectConfig.gitlabBaseUrl.match(/.*\/$/)
        ? projectConfig.gitlabBaseUrl
        : `${projectConfig.gitlabBaseUrl}/`;
      apiURL = fixedUrl + 'api/v4/projects/';
    } else {
      apiURL = GITLAB_API_BASE_URL + '/';
    }
    const projectPath = projectURL.match(GITLAB_PROJECT_REGEX);
    if (projectPath) {
      projectURL = projectURL.replace(/\//gi, '%2F');
    } else {
      // Should never enter here
      throwError('Gitlab Project URL');
    }
    apiURL += projectURL;
    return apiURL;
  }
}
