import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { parseUrl, stringifyUrl } from 'query-string';
import { EMPTY, Observable } from 'rxjs';
import { SnackService } from 'src/app/core/snack/snack.service';

import { GitlabCfg } from '../gitlab.model';
import { GitlabOriginalComment, GitlabOriginalIssue } from './gitlab-api-responses';
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
import { GitlabIssue } from '../gitlab-issue.model';
import {
  getPartsFromGitlabIssueId,
  mapGitlabIssue,
  mapGitlabIssueToSearchResult,
} from '../gitlab-issue-map.util';
import { SearchResultItem } from '../../../issue.model';
import { GITLAB_TYPE, ISSUE_PROVIDER_HUMANIZED } from '../../../issue.const';
import { assertTruthy } from '../../../../../util/assert-truthy';
import { handleIssueProviderHttpError$ } from '../../../handle-issue-provider-http-error';
import { IssueLog } from '../../../../../core/log';

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  private _snackService = inject(SnackService);
  private _http = inject(HttpClient);

  getById$(id: string, cfg: GitlabCfg): Observable<GitlabIssue> {
    IssueLog.log(this._issueApiLink(cfg, id));

    return this._sendIssuePaginatedRequest$(
      {
        url: this._issueApiLink(cfg, id),
      },
      cfg,
    ).pipe(
      mergeAll(),
      mergeMap((issue: GitlabIssue) => {
        return this.getIssueWithComments$(issue, cfg);
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

  // TODO more efficient to do it like this
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

  private _extractGitlabApiParams(searchText: string): {
    params: string;
    remainingSearch: string;
  } {
    // GitLab API parameters that should be passed as query params, not inside the search param.
    // Based on: https://docs.gitlab.com/api/issues/#list-project-issues
    // Includes: state, label(s), milestone, assignee_id/username, author_id/username,
    // created_after/before, due_date, epic_id, health_status, iids[], in, issue_type,
    // iteration_id/title, my_reaction_emoji, non_archived, not[...], order_by, scope,
    // sort, updated_after/before, weight, with_labels_details, per_page, page, confidential
    const apiParamPattern =
      /\b(?:assignee_id|assignee_username|author_id|author_username|confidential|created_after|created_before|due_date|epic_id|health_status|iids\[\]|in|issue_type|iteration_id|iteration_title|label|labels|labels\[\]|milestone_id|milestone|my_reaction_emoji|non_archived|not[\w_\[\]]+|order_by|scope|search|sort|state|updated_after|updated_before|weight|with_labels_details|per_page|page)=[^\s&]+/g;
    const matches: string[] = [];
    let remainingText = searchText;

    // Find all API parameter matches
    let match;
    while ((match = apiParamPattern.exec(searchText)) !== null) {
      matches.push(match[0]);
    }

    // Remove the matched parameters from the search text
    if (matches.length > 0) {
      const escapedMatches = matches.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = new RegExp(escapedMatches.join('|'), 'g');
      remainingText = searchText.replace(pattern, '').replace(/\s+/g, ' ').trim();
    }

    return {
      params: matches.length > 0 ? '&' + matches.join('&') : '',
      remainingSearch: remainingText,
    };
  }

  searchIssueInProject$(
    searchText: string,
    cfg: GitlabCfg,
  ): Observable<SearchResultItem[]> {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    // NOTE: only the first page is fetched and issue comments are intentionally NOT
    // loaded here. The search dropdown only needs id + title (the comment count already
    // rides along via user_notes_count, and full notes are re-fetched in the detail view
    // via getById$). A broad or empty search term can match thousands of issues, so
    // paginating through all of them and then firing a /notes request per issue produced a
    // burst of thousands of requests that GitLab rate-limited with a 429 — see #9034.
    const { params: apiParams, remainingSearch } =
      this._extractGitlabApiParams(searchText);
    return this._sendIssueRequestFirstPage$(
      {
        url: `${this._apiLink(cfg)}/issues?${remainingSearch ? 'search=' + remainingSearch : ''}${this.getScopeParam(
          cfg,
        )}&order_by=updated_at${apiParams}${this.getCustomFilterParam(cfg)}`,
      },
      cfg,
    ).pipe(map((issues) => issues.map(mapGitlabIssueToSearchResult)));
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
        url: `${this._issueApiLink(cfg, issueId)}/add_spent_time`,
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
        url: `${this._issueApiLink(cfg, issueId)}/time_stats`,
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

  // Fetches only the first page of issues (no x-next-page follow-up) and maps the raw
  // response body straight to GitlabIssue[]. Used for search, where fetching every page is
  // both unnecessary and a rate-limit risk on large projects (see searchIssueInProject$).
  private _sendIssueRequestFirstPage$(
    params: HttpRequest<string> | any,
    cfg: GitlabCfg,
  ): Observable<GitlabIssue[]> {
    return this._sendPaginatedRequestImpl$(params, cfg, 1).pipe(
      map((res: any) => {
        const issues: GitlabOriginalIssue[] = res && res.body ? res.body : [];
        return issues.map((issue) => mapGitlabIssue(issue, cfg));
      }),
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
    // NOTE: DO NOT LOG allArgs - contains PRIVATE-TOKEN in headers
    // IssueLog.log(allArgs);

    const req = new HttpRequest(p.method, p.url, ...allArgs);

    return this._http.request(req).pipe(
      // Filter out HttpEventType.Sent (type: 0) events to only process actual responses
      filter((res) => !(res === Object(res) && res.type === 0)),
      catchError((err) =>
        handleIssueProviderHttpError$<HttpEvent<unknown>>(
          GITLAB_TYPE,
          this._snackService,
          err,
        ),
      ),
    );
  }

  private _issueApiLink(cfg: GitlabCfg, issueId: string): string {
    IssueLog.log(issueId);
    const { project, projectIssueId } = getPartsFromGitlabIssueId(issueId);
    return `${this._projectApiLink(cfg, project)}/issues/${projectIssueId}`;
  }

  private _projectApiLink(cfg: GitlabCfg, project: string): string {
    let apiURL: string = '';

    if (cfg.gitlabBaseUrl) {
      const fixedUrl = cfg.gitlabBaseUrl.match(/.*\/$/)
        ? cfg.gitlabBaseUrl
        : `${cfg.gitlabBaseUrl}/`;
      apiURL = fixedUrl + 'api/v4/';
    } else {
      apiURL = GITLAB_API_BASE_URL + '/';
    }

    const projectURL = assertTruthy(project).toString().replace(/\//gi, '%2F');
    apiURL += 'projects/' + projectURL;
    return apiURL;
  }

  private _apiLink(cfg: GitlabCfg): string {
    return this._projectApiLink(cfg, assertTruthy(cfg.project));
  }
}
