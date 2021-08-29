import { Injectable } from '@angular/core';
import { OpenProjectCfg } from './open-project.model';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { OPEN_PROJECT_API_BASE_URL } from './open-project.const';
import { Observable, ObservableInput, of, throwError } from 'rxjs';
import {
  OpenProjectIssueSearchResult,
  OpenProjectOriginalIssue,
} from './open-project-api-responses';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import {
  mapOpenProjectIssue,
  mapOpenProjectIssueToSearchResult,
} from './open-project-issue/open-project-issue-map.util';
import {
  OpenProjectComment,
  OpenProjectIssue,
  OpenProjectIssueReduced,
} from './open-project-issue/open-project-issue.model';
import { SearchResultItem } from '../../issue.model';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { T } from '../../../../t.const';
import { throwHandledError } from '../../../../util/throw-handled-error';

const BASE = OPEN_PROJECT_API_BASE_URL;

@Injectable({
  providedIn: 'root',
})
export class OpenProjectApiService {
  constructor(private _snackService: SnackService, private _http: HttpClient) {}

  getById$(
    issueId: number,
    cfg: OpenProjectCfg,
    isGetComments: boolean = true,
  ): Observable<OpenProjectIssue> {
    return this._sendRequest$(
      {
        url: `${BASE}repos/${cfg.repo}/issues/${issueId}`,
      },
      cfg,
    ).pipe(
      switchMap((issue) =>
        isGetComments
          ? this.getCommentListForIssue$(issueId, cfg).pipe(
              map((comments) => ({ ...issue, comments })),
            )
          : of(issue),
      ),
    );
  }

  getCommentListForIssue$(
    issueId: number,
    cfg: OpenProjectCfg,
  ): Observable<OpenProjectComment[]> {
    return this._sendRequest$(
      {
        url: `${BASE}repos/${cfg.repo}/issues/${issueId}/comments`,
      },
      cfg,
    ).pipe();
  }

  searchIssueForRepo$(
    searchText: string,
    cfg: OpenProjectCfg,
    isSearchAllOpenProject: boolean = false,
  ): Observable<SearchResultItem[]> {
    const repoQuery = isSearchAllOpenProject ? '' : `+repo:${cfg.repo}`;

    return this._sendRequest$(
      {
        url: `${BASE}search/issues?q=${encodeURIComponent(searchText + repoQuery)}`,
      },
      cfg,
    ).pipe(
      map((res: OpenProjectIssueSearchResult) => {
        return res && res.items
          ? res.items.map(mapOpenProjectIssue).map(mapOpenProjectIssueToSearchResult)
          : [];
      }),
    );
  }

  getLast100IssuesForRepo$(cfg: OpenProjectCfg): Observable<OpenProjectIssueReduced[]> {
    const repo = cfg.repo;
    // NOTE: alternate approach (but no caching :( )
    // return this._sendRequest$({
    //   url: `${BASE}search/issues?q=${encodeURI(`+repo:${cfg.repo}`)}`
    // }).pipe(
    //   tap(console.log),
    //   map((res: OpenProjectIssueSearchResult) => res && res.items
    //     ? res && res.items.map(mapOpenProjectIssue)
    //     : []),
    // );
    return this._sendRequest$(
      {
        url: `${BASE}repos/${repo}/issues?per_page=100&sort=updated`,
      },
      cfg,
    ).pipe(
      map((issues: OpenProjectOriginalIssue[]) =>
        issues ? issues.map(mapOpenProjectIssue) : [],
      ),
    );
  }

  private _checkSettings(cfg: OpenProjectCfg): void {
    if (!this._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.OPEN_PROJECT.S.ERR_NOT_CONFIGURED,
      });
      throwHandledError('OpenProject: Not enough settings');
    }
  }

  private _isValidSettings(cfg: OpenProjectCfg): boolean {
    return !!cfg && !!cfg.repo && cfg.repo.length > 0;
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: OpenProjectCfg,
  ): Observable<any> {
    this._checkSettings(cfg);

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
      headers: {
        ...(cfg.token ? { Authorization: 'token ' + cfg.token } : {}),
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
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.OPEN_PROJECT.S.ERR_NETWORK,
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: 'OpenProject: ' + error.error.message,
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
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'OpenProject: ' + error.message });
    }

    return throwError({ [HANDLED_ERROR_PROP_STR]: 'OpenProject: Api request failed.' });
  }
}
