import { Injectable } from '@angular/core';
import { GithubCfg } from './github.model';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { GITHUB_API_BASE_URL } from './github.const';
import { Observable, ObservableInput, of, throwError } from 'rxjs';
import { GithubIssueSearchResult, GithubOriginalIssue } from './github-api-responses';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import {
  mapGithubIssue,
  mapGithubIssueToSearchResult,
} from './github-issue/github-issue-map.util';
import {
  GithubComment,
  GithubIssue,
  GithubIssueReduced,
} from './github-issue/github-issue.model';
import { SearchResultItem } from '../../issue.model';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { T } from '../../../../t.const';
import { throwHandledError } from '../../../../util/throw-handled-error';

const BASE = GITHUB_API_BASE_URL;

@Injectable({
  providedIn: 'root',
})
export class GithubApiService {
  constructor(private _snackService: SnackService, private _http: HttpClient) {}

  getById$(
    issueId: number,
    cfg: GithubCfg,
    isGetComments: boolean = true,
  ): Observable<GithubIssue> {
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

  getCommentListForIssue$(issueId: number, cfg: GithubCfg): Observable<GithubComment[]> {
    return this._sendRequest$(
      {
        url: `${BASE}repos/${cfg.repo}/issues/${issueId}/comments`,
      },
      cfg,
    ).pipe();
  }

  searchIssueForRepo$(
    searchText: string,
    cfg: GithubCfg,
    isSearchAllGithub: boolean = false,
  ): Observable<SearchResultItem[]> {
    const repoQuery = isSearchAllGithub ? '' : `+repo:${cfg.repo}`;

    return this._sendRequest$(
      {
        url: `${BASE}search/issues?q=${encodeURIComponent(searchText + repoQuery)}`,
      },
      cfg,
    ).pipe(
      map((res: GithubIssueSearchResult) => {
        return res && res.items
          ? res.items.map(mapGithubIssue).map(mapGithubIssueToSearchResult)
          : [];
      }),
    );
  }

  getLast100IssuesForRepo$(cfg: GithubCfg): Observable<GithubIssueReduced[]> {
    const repo = cfg.repo;
    // NOTE: alternate approach (but no caching :( )
    // return this._sendRequest$({
    //   url: `${BASE}search/issues?q=${encodeURI(`+repo:${cfg.repo}`)}`
    // }).pipe(
    //   tap(console.log),
    //   map((res: GithubIssueSearchResult) => res && res.items
    //     ? res && res.items.map(mapGithubIssue)
    //     : []),
    // );
    return this._sendRequest$(
      {
        url: `${BASE}repos/${repo}/issues?per_page=100&sort=updated`,
      },
      cfg,
    ).pipe(
      map((issues: GithubOriginalIssue[]) => (issues ? issues.map(mapGithubIssue) : [])),
    );
  }

  private _checkSettings(cfg: GithubCfg) {
    if (!this._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.GITHUB.S.ERR_NOT_CONFIGURED,
      });
      throwHandledError('Github: Not enough settings');
    }
  }

  private _isValidSettings(cfg: GithubCfg): boolean {
    return !!cfg && !!cfg.repo && cfg.repo.length > 0;
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: GithubCfg,
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
        msg: T.F.GITHUB.S.ERR_NETWORK,
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: 'Github: ' + error.error.message,
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
        msg: T.F.GITHUB.S.ERR_UNKNOWN,
      });
    }
    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'Github: ' + error.message });
    }

    return throwError({ [HANDLED_ERROR_PROP_STR]: 'Github: Api request failed.' });
  }
}
