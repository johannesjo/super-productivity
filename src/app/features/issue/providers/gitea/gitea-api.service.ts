import { Injectable } from '@angular/core';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { GiteaCfg } from './gitea.model';
import { catchError, filter, map } from 'rxjs/operators';
import { Observable, ObservableInput, throwError } from 'rxjs';
import { throwHandledError } from '../../../../util/throw-handled-error';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { T } from '../../../../t.const';
import { ISSUE_PROVIDER_HUMANIZED, GITEA_TYPE } from '../../issue.const';
import { GiteaIssue, GiteaIssueStateOptions } from './gitea-issue/gitea-issue.model';
import {
  mapGiteaIssueToSearchResult,
  isIssueFromProject,
} from './gitea-issue/gitea-issue-map.util';
import {
  GITEA_API_SUBPATH_REPO,
  GITEA_API_SUFFIX,
  GITEA_API_VERSION,
  ScopeOptions,
} from './gitea.const';
import { SearchResultItem } from '../../issue.model';

@Injectable({
  providedIn: 'root',
})
export class GiteaApiService {
  constructor(private _snackService: SnackService, private _http: HttpClient) {}

  searchIssueForRepo$(searchText: string, cfg: GiteaCfg): Observable<SearchResultItem[]> {
    return this._sendRequest$(
      {
        url: this._getIssueSearchUrlFor(cfg),
        params: ParamsBuilder.create()
          .withLimit(100)
          .withState(GiteaIssueStateOptions.open)
          .withScopeForSearchFrom(cfg)
          .withSearchTerm(searchText)
          .build(),
      },
      cfg,
    ).pipe(
      map((res: GiteaIssue[]) => {
        return res
          ? res
              .filter((issue: GiteaIssue) => isIssueFromProject(issue, cfg))
              .map((issue: GiteaIssue) => mapGiteaIssueToSearchResult(issue))
          : [];
      }),
    );
  }

  private _getIssueSearchUrlFor(cfg: GiteaCfg): string {
    //TODO ajustar para usar o parametro passado na configuracao
    // see https://try.gitea.io/api/swagger#/issue
    return `${this._getBaseUrlFor(cfg)}/${GITEA_API_SUBPATH_REPO}/issues/search`;
  }

  getLast100IssuesForCurrentGiteaProject$(cfg: GiteaCfg): Observable<GiteaIssue[]> {
    return this._sendRequest$(
      {
        url: this._getIssueUrlFor(cfg),
        params: ParamsBuilder.create()
          .withLimit(100)
          .withState(GiteaIssueStateOptions.open)
          .withScopeFrom(cfg)
          .build(),
      },
      cfg,
    ).pipe(
      map((issues: GiteaIssue[]) => {
        console.log(issues);
        return issues ? issues : [];
      }),
    );
  }

  private _getIssueUrlFor(cfg: GiteaCfg): string {
    //TODO ajustar para usar o parametro passado na configuracao
    // see https://try.gitea.io/api/swagger#/issue
    return `${this._getBaseUrlFor(
      cfg,
    )}/${GITEA_API_SUBPATH_REPO}/hugaleno/first_project/issues`;
  }

  private _getBaseUrlFor(cfg: GiteaCfg): string {
    return `${cfg.host}/${GITEA_API_SUFFIX}/${GITEA_API_VERSION}`;
  }

  getById$(issueId: number, cfg: GiteaCfg): Observable<GiteaIssue> {
    return this._sendRequest$(
      {
        url: `${this._getIssueUrlFor}/${issueId}`,
      },
      cfg,
    ).pipe(map((issue) => issue));
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: GiteaCfg,
  ): Observable<any> {
    this._checkSettings(cfg);
    params.params = { ...params.params, access_token: cfg.token };
    const p: HttpRequest<any> | any = {
      //...{ params, access_token: cfg.token },
      ...params,
      method: params.method || 'GET',
      headers: {
        ...(params.headers ? params.headers : { accept: 'application/json' }),
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

  private _checkSettings(cfg: GiteaCfg): void {
    if (!this._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NOT_CONFIGURED,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[GITEA_TYPE],
        },
      });
      throwHandledError('Gitea: Not enough settings');
    }
  }

  private _isValidSettings(cfg: GiteaCfg): boolean {
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
  ): ObservableInput<unknown> {
    console.log(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NETWORK,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[GITEA_TYPE],
        },
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: ISSUE_PROVIDER_HUMANIZED[GITEA_TYPE] + ': ' + error.error.message,
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
        msg: T.F.OPEN_PROJECT.S.ERR_UNKNOWN,
      });
    }
    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'Gitea: ' + error.message });
    }

    return throwError({ [HANDLED_ERROR_PROP_STR]: 'Gitea: Api request failed.' });
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
    this.params['state'] = state;
    return this;
  }

  withScopeFrom(cfg: GiteaCfg): ParamsBuilder {
    if (!cfg.scope) {
      return this;
    }

    if (cfg.scope === ScopeOptions.createdByMe) {
      // TODO fix this later
      this.params['created_by'] = 'hugaleno';
    } else if (cfg.scope === ScopeOptions.assignedToMe) {
      this.params['assigned_by'] = 'hugaleno';
    }

    return this;
  }

  withScopeForSearchFrom(cfg: GiteaCfg): ParamsBuilder {
    if (!cfg.scope) {
      return this;
    }

    if (cfg.scope === ScopeOptions.createdByMe) {
      this.params['created'] = true;
    } else if (cfg.scope === ScopeOptions.assignedToMe) {
      this.params['assigned'] = true;
    }

    return this;
  }

  withSearchTerm(search: string): ParamsBuilder {
    this.params['q'] = search;
    return this;
  }

  build(): any {
    return this.params;
  }
}
