import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { parseUrl, stringifyUrl } from 'query-string';
import { EMPTY, forkJoin, Observable, ObservableInput, of, throwError } from 'rxjs';
import { SnackService } from 'src/app/core/snack/snack.service';

import { GitlabCfg } from '../gitlab.model';
import { GitlabOriginalComment, GitlabOriginalIssue } from './gitlab-api-responses';
import { HANDLED_ERROR_PROP_STR } from 'src/app/app.constants';
import { GITLAB_API_BASE_URL } from '../gitlab.const';
import { T } from 'src/app/t.const';
import {
  catchError,
  expand,
  filter,
  map,
  mergeAll,
  mergeMap,
  reduce,
  take,
} from 'rxjs/operators';
import { GitlabIssue } from '../gitlab-issue/gitlab-issue.model';
import {
  mapGitlabIssue,
  mapGitlabIssueToSearchResult,
} from '../gitlab-issue/gitlab-issue-map.util';
import { SearchResultItem } from '../../../issue.model';
import { GITLAB_TYPE, ISSUE_PROVIDER_HUMANIZED } from '../../../issue.const';
import { assertTruthy } from '../../../../../util/assert-truthy';

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  constructor(
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {}

  getById$(id: string, cfg: GitlabCfg): Observable<GitlabIssue> {
    return this._sendIssuePaginatedRequest$(
      {
        url: this._issueApiLink(cfg, id),
      },
      cfg,
    ).pipe(
      mergeAll(),
      mergeMap((issue: GitlabIssue) => {
        return this.getIssueWithComments$(issue, cfg).pipe(
          map((issueWithComments) => ({
            ...issueWithComments,
            iid: issue.iid,
          })),
        );
      }),
    );
  }

  private getScopeParam(cfg: GitlabCfg): string {
    if (cfg.scope) {
      return `&scope=${cfg.scope}`;
    } else {
      return '';
    }
  }

  private getCustomFilterParam(cfg: GitlabCfg): string {
    if (cfg.filter) {
      return `&${cfg.filter}`;
    } else {
      return '';
    }
  }

  // getByIds$(ids: string[] | number[], cfg: GitlabCfg): Observable<GitlabIssue[]> {
  //   const queryParams = 'iids[]=' + ids.join('&iids[]=');
  //   // const PARAMS_COUNT = 59; // Can't send more than 59 issue id For some reason it returns 502 bad gateway
  //   return this._sendIssuePaginatedRequest$(
  //     {
  //       url: `${this._apiLink(cfg)}/issues?${queryParams}${this.getScopeParam(
  //         cfg,
  //       )}${this.getCustomFilterParam(cfg)}`,
  //     },
  //     cfg,
  //   ).pipe(
  //     mergeMap((issues: GitlabIssue[]) => {
  //       if (issues && issues.length) {
  //         return forkJoin([
  //           ...issues.map((issue) => this.getIssueWithComments$(issue, cfg)),
  //         ]);
  //       } else {
  //         return of([]);
  //       }
  //     }),
  //   );
  // }

  getIssueWithComments$(issue: GitlabIssue, cfg: GitlabCfg): Observable<GitlabIssue> {
    return this._getIssueComments$(issue, cfg).pipe(
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
    return this._sendIssuePaginatedRequest$(
      {
        url: `${this._apiLink(cfg)}/issues?search=${searchText}${this.getScopeParam(
          cfg,
        )}&order_by=updated_at${this.getCustomFilterParam(cfg)}`,
      },
      cfg,
    ).pipe(
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

  getProjectIssues$(cfg: GitlabCfg): Observable<GitlabIssue[]> {
    return this._sendIssuePaginatedRequest$(
      {
        url: `${this._apiLink(
          cfg,
        )}/issues?state=opened&order_by=updated_at&${this.getScopeParam(
          cfg,
        )}${this.getCustomFilterParam(cfg)}`,
      },
      cfg,
    ).pipe(take(1));
  }

  addTimeSpentToIssue$(
    issueId: string,
    // NOTE: duration format is without space, e.g.: 1h23m
    duration: string,
    cfg: GitlabCfg,
  ): Observable<unknown> {
    /* {
    human_time_estimate: null | string;
    human_total_time_spent: null | string;
    time_estimate: null | number;
    total_time_spent: null | number;
  }*/

    return this._sendRawRequest$(
      {
        url: `${this._apiLink(cfg)}/issues/${issueId}/add_spent_time`,
        method: 'POST',
        data: {
          duration: duration,
          summary: 'Submitted via Super Productivity on ' + new Date(),
        },
      },
      cfg,
    );
  }

  getTimeTrackingStats$(
    issueId: string,
    cfg: GitlabCfg,
  ): Observable<{
    human_time_estimate: null | string;
    human_total_time_spent: null | string;
    time_estimate: null | number;
    total_time_spent: null | number;
  }> {
    return this._sendRawRequest$(
      {
        url: `${this._apiLink(cfg)}/issues/${issueId}/time_stats`,
      },
      cfg,
    ).pipe(map((res) => (res as any).body));
  }

  private _getIssueComments$(
    issue: GitlabIssue,
    cfg: GitlabCfg,
  ): Observable<GitlabOriginalComment[]> {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this._sendPaginatedRequest$(
      {
        url: `${issue.links.self}/notes`,
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
      msg: T.F.ISSUE.S.ERR_NOT_CONFIGURED,
      translateParams: {
        issueProviderName: ISSUE_PROVIDER_HUMANIZED[GITLAB_TYPE],
      },
    });
    return false;
  }

  private _sendIssuePaginatedRequest$(
    params: HttpRequest<string> | any,
    cfg: GitlabCfg,
  ): Observable<GitlabIssue[]> {
    return this._sendPaginatedRequest$(params, cfg).pipe(
      map((issues: GitlabOriginalIssue[]) =>
        issues ? issues.map((issue) => mapGitlabIssue(issue, cfg)) : [],
      ),
    );
  }

  private _sendPaginatedRequest$(
    params: HttpRequest<string> | any,
    cfg: GitlabCfg,
  ): Observable<any> {
    return this._sendPaginatedRequestImpl$(params, cfg, 1).pipe(
      expand((res: any) => {
        if (res && res.body && res.headers) {
          const headers: HttpHeaders = res.headers;
          const next_page = headers.get('x-next-page');
          if (next_page) {
            return this._sendPaginatedRequestImpl$(params, cfg, Number(next_page));
          }
        }
        return EMPTY;
      }),
      reduce((acc, res) => acc.concat(res.body), []),
    );
  }

  private _sendPaginatedRequestImpl$(
    params: HttpRequest<string> | any,
    cfg: GitlabCfg,
    page: number,
  ): Observable<any> {
    const parsedUrl = parseUrl(params.url);
    params.url = stringifyUrl({
      url: parsedUrl.url,
      query: {
        ...parsedUrl.query,
        per_page: 100,
        page: page,
      },
    });
    return this._sendRawRequest$(params, cfg);
  }

  private _sendRawRequest$(
    params: HttpRequest<string> | any,
    cfg: GitlabCfg,
  ): Observable<HttpEvent<unknown>> {
    this._isValidSettings(cfg);

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...(cfg.token ? { 'PRIVATE-TOKEN': cfg.token } : {}),
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
    console.log(allArgs);

    const req = new HttpRequest(p.method, p.url, ...allArgs);
    return this._http.request(req).pipe(
      // TODO remove type: 0 @see https://brianflove.com/2018/09/03/angular-http-client-observe-response/
      filter((res) => !(res === Object(res) && res.type === 0)),
      catchError(this._handleRequestError$.bind(this)),
    );
  }

  private _handleRequestError$(
    error: HttpErrorResponse,
    caught: Observable<HttpEvent<unknown>>,
  ): ObservableInput<HttpEvent<unknown>> {
    console.error(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NETWORK,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[GITLAB_TYPE],
        },
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: ISSUE_PROVIDER_HUMANIZED[GITLAB_TYPE] + ': ' + error.error.message,
      });
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({
        type: 'ERROR',
        translateParams: {
          errorMsg:
            (error.error && (error.error.name || error.error.statusText)) ||
            error.toString(),
          statusCode: error.status,
        },
        msg: T.F.GITLAB.S.ERR_UNKNOWN,
      });
    }

    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'Gitlab: ' + error.message });
    }
    return throwError({ [HANDLED_ERROR_PROP_STR]: 'Gitlab: Api request failed.' });
  }

  private _issueApiLink(cfg: GitlabCfg, issue: string | number): string {
    return `${this._apiLink(cfg)}issues/${issue}`;
  }

  private _apiLink(cfg: GitlabCfg): string {
    let apiURL: string = '';

    if (cfg.gitlabBaseUrl) {
      const fixedUrl = cfg.gitlabBaseUrl.match(/.*\/$/)
        ? cfg.gitlabBaseUrl
        : `${cfg.gitlabBaseUrl}/`;
      apiURL = fixedUrl + 'api/v4/';
    } else {
      apiURL = GITLAB_API_BASE_URL + '/';
    }

    const projectURL = assertTruthy(cfg.project).toString().replace(/\//gi, '%2F');
    // TODO validate

    apiURL += 'projects/' + projectURL;
    return apiURL;
  }
}
