import { Injectable } from '@angular/core';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { RedmineCfg } from './redmine.model';
import { catchError, filter, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { throwHandledError } from '../../../../util/throw-handled-error';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { T } from '../../../../t.const';
import { ISSUE_PROVIDER_HUMANIZED, REDMINE_TYPE } from '../../issue.const';
import {
  RedmineSearchResult,
  RedmineIssue,
  RedmineIssueResult,
  RedmineSearchResultItem,
} from './redmine-issue/redmine-issue.model';
import { mapRedmineSearchResultItemToSearchResult } from './redmine-issue/redmine-issue-map.util';
import { SearchResultItem } from '../../issue.model';
import { ScopeOptions } from './redmine.const';

@Injectable({
  providedIn: 'root',
})
export class RedmineApiService {
  constructor(private _snackService: SnackService, private _http: HttpClient) {}

  searchIssuesInProject$(query: string, cfg: RedmineCfg): Observable<SearchResultItem[]> {
    return this._sendRequest$(
      {
        url: `${cfg.host}/projects/${cfg.projectId}/search.json`,
        params: ParamsBuilder.create()
          .withLimit(100)
          .withQuery(query)
          .onlyIssues(true)
          .openIssues(true)
          .build(),
      },
      cfg,
    ).pipe(
      map((res: RedmineSearchResult) => {
        return res
          ? res.results.map((item: RedmineSearchResultItem) =>
              mapRedmineSearchResultItemToSearchResult(item),
            )
          : [];
      }),
    );
  }

  getLast100IssuesForCurrentRedmineProject$(cfg: RedmineCfg): Observable<RedmineIssue[]> {
    return this._sendRequest$(
      {
        url: `${cfg.host}/projects/${cfg.projectId}/issues.json`,
        params: ParamsBuilder.create().withLimit(100).withScopeFrom(cfg).build(),
      },
      cfg,
    ).pipe(map((res: RedmineIssueResult) => (res && res.issues ? res.issues : [])));
  }

  getById$(issueId: number, cfg: RedmineCfg): Observable<RedmineIssue> {
    return this._sendRequest$(
      {
        url: `${cfg.host}/issues/${issueId}.json`,
      },
      cfg,
    ).pipe(
      map(({ issue }) => Object.assign({ url: `${cfg.host}/issues/${issueId}` }, issue)),
    );
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: RedmineCfg,
  ): Observable<any> {
    this._checkSettings(cfg);
    params.headers = {
      ...params.headers,
      'X-Redmine-API-Key': cfg.api_key,
    };

    // params.params = { ...params.params, key: cfg.api_key };

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
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

  private _checkSettings(cfg: RedmineCfg): void {
    if (!this._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NOT_CONFIGURED,
        translateParams: {
          ISSUE_PROVIDER_HUMANIZED: ISSUE_PROVIDER_HUMANIZED[REDMINE_TYPE],
        },
      });
      throwHandledError('Redmine: Not enough settings');
    }
  }

  private _isValidSettings(cfg: RedmineCfg): boolean {
    return (
      !!cfg &&
      !!cfg.host &&
      cfg.host.length > 0 &&
      !!cfg.projectId &&
      cfg.projectId.length > 0
    );
  }

  private _handleRequestError$(
    error: HttpErrorResponse,
    caught: Observable<unknown>,
  ): Observable<unknown> {
    console.log(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NETWORK,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[REDMINE_TYPE],
        },
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: ISSUE_PROVIDER_HUMANIZED[REDMINE_TYPE] + ': ' + error.error.message,
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
        msg: T.F.REDMINE.S.ERR_UNKNOWN,
      });
    }
    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: `Redmine: ${error.message}` });
    }

    return throwError({ [HANDLED_ERROR_PROP_STR]: 'Redmine: Api request failed.' });
  }
}

class ParamsBuilder {
  params: any = {};

  static create(): ParamsBuilder {
    return new ParamsBuilder();
  }

  withLimit(limit: number): ParamsBuilder {
    this.params['limit'] = limit;
    return this;
  }

  withState(state: string): ParamsBuilder {
    this.params['status_id'] = state;
    return this;
  }

  withScopeFrom(cfg: RedmineCfg): ParamsBuilder {
    if (!cfg.scope) return this;

    switch (cfg.scope) {
      case ScopeOptions.createdByMe:
        this.params['author_id'] = 'me';
        break;
      case ScopeOptions.assignedToMe:
        this.params['assigned_to_id'] = 'me';
        break;
    }

    return this;
  }

  withQuery(query: string): ParamsBuilder {
    this.params['q'] = query;
    return this;
  }

  onlyIssues(isOnlyIssues: boolean): ParamsBuilder {
    this.params['issues'] = isOnlyIssues ? '1' : '0';
    return this;
  }

  openIssues(isOpen: boolean): ParamsBuilder {
    this.params['open_issues'] = isOpen ? '1' : '0';
    return this;
  }

  build(): any {
    return this.params;
  }
}
