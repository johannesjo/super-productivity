import {Injectable} from '@angular/core';
import {ProjectService} from '../../../project/project.service';
import {GithubCfg} from './github.model';
import {SnackService} from '../../../../core/snack/snack.service';
import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpRequest} from '@angular/common/http';
import {GITHUB_API_BASE_URL} from './github.const';
import {Observable, ObservableInput, of, throwError} from 'rxjs';
import {GithubIssueSearchResult} from './github-api-responses';
import {catchError, filter, map, switchMap} from 'rxjs/operators';
import {mapGithubIssue, mapGithubIssueToSearchResult} from './github-issue/github-issue-map.util';
import {GithubComment, GithubIssue} from './github-issue/github-issue.model';
import {SearchResultItem} from '../../issue.model';
import {HANDLED_ERROR_PROP_STR} from '../../../../app.constants';
import {T} from '../../../../t.const';

const BASE = GITHUB_API_BASE_URL;

@Injectable({
  providedIn: 'root',
})
export class GithubApiService {

  private _cfg: GithubCfg;
  private _header: HttpHeaders;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGithubCfg$.subscribe((cfg: GithubCfg) => {
      this._cfg = cfg;
    });
  }


  getById$(issueId: number, isGetComments = true): Observable<GithubIssue> {
    return this._sendRequest$({
      url: `${BASE}repos/${this._cfg.repo}/issues/${issueId}`
    })
      .pipe(
        switchMap(issue => isGetComments
          ? this.getCommentListForIssue$(issueId).pipe(
            map(comments => ({...issue, comments}))
          )
          : of(issue),
        ),
      );
  }

  getCommentListForIssue$(issueId: number): Observable<GithubComment[]> {
    return this._sendRequest$({
      url: `${BASE}repos/${this._cfg.repo}/issues/${issueId}/comments`
    })
      .pipe(
      );
  }


  searchIssueForRepo$(searchText: string, isSearchAllGithub = false): Observable<SearchResultItem[]> {
    const repoQuery = isSearchAllGithub
      ? '' :
      `+repo:${this._cfg.repo}`;

    return this._sendRequest$({
      url: `${BASE}search/issues?q=${encodeURI(searchText + repoQuery)}`
    })
      .pipe(
        map((res: GithubIssueSearchResult) => {
          if (res && res.items) {
            return res.items.map(mapGithubIssue).map(mapGithubIssueToSearchResult);
          } else {
            return [];
          }
        }),
      );
  }


  private _checkSettings() {
    if (!this._isValidSettings()) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.GITHUB.S.ERR_NOT_CONFIGURED
      });
      const e = new Error(`Not enough settings`);
      e[HANDLED_ERROR_PROP_STR] = 'Not enough settings';
      throw e;
    }
  }

  private _handleRequestError$(error: HttpErrorResponse, caught: Observable<object>): ObservableInput<{}> {
    console.error(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.GITHUB.S.ERR_NETWORK,
      });
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({
        type: 'ERROR',
        translateParams: {
          statusCode: error.status,
          errorMsg: error.error && error.error.message,
        },
        msg: T.F.GITHUB.S.ERR_NOT_CONFIGURED,
      });
    }
    if (error && error.message) {
      return throwError({[HANDLED_ERROR_PROP_STR]: 'Github: ' + error.message});
    }

    return throwError({[HANDLED_ERROR_PROP_STR]: 'Github: Api request failed.'});
  }

  private _isValidSettings(): boolean {
    const cfg = this._cfg;
    return cfg && cfg.repo && cfg.repo.length > 0;
  }


  private _sendRequest$(params: HttpRequest<string> | any): Observable<any> {
    this._checkSettings();

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
      headers: {
        ...(this._cfg.token ? {Authorization: 'token ' + this._cfg.token} : {}),
        ...(params.headers ? params.headers : {}),
      }
    };

    const bodyArg = params.data
      ? [params.data]
      : [];

    const allArgs = [...bodyArg, {
      headers: new HttpHeaders(p.headers),
      params: new HttpParams({fromObject: p.params}),
      reportProgress: false,
      observe: 'response',
      responseType: params.responseType,
    }];
    const req = new HttpRequest(p.method, p.url, ...allArgs);
    return this._http.request(req).pipe(
      // TODO remove type: 0 @see https://brianflove.com/2018/09/03/angular-http-client-observe-response/
      filter(res => !(res === Object(res) && res.type === 0)),
      map((res: any) => (res && res.body)
        ? res.body
        : res),
      catchError(this._handleRequestError$.bind(this)),
    );
  }
}
