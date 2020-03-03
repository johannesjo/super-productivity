import {Injectable} from '@angular/core';
import {ProjectService} from '../../../project/project.service';
import {GithubCfg} from './github.model';
import {SnackService} from '../../../../core/snack/snack.service';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {GITHUB_API_BASE_URL} from './github.const';
import {Observable, ObservableInput, of, throwError} from 'rxjs';
import {GithubIssueSearchResult} from './github-api-responses';
import {catchError, map, switchMap} from 'rxjs/operators';
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
      this.setHeader(cfg.token);
    });
  }

  public setHeader(accessToken: string) {
    if (accessToken) {
      this._header = new HttpHeaders({
        Authorization: 'token ' + accessToken
      });
    } else {
      this._header = null;
    }
  }

  getById$(issueId: number, isGetComments = true): Observable<GithubIssue> {
    this._checkSettings();
    return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueId}`)
      .pipe(
        switchMap(issue => isGetComments
          ? this.getCommentListForIssue$(issueId).pipe(
            map(comments => ({...issue, comments}))
          )
          : of(issue),
        ),
        catchError(this._handleRequestError$.bind(this)),
      );
  }

  getCommentListForIssue$(issueId: number): Observable<GithubComment[]> {
    this._checkSettings();
    return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueId}/comments`)
      .pipe(
        catchError(this._handleRequestError$.bind(this)),
      );
  }


  searchIssueForRepo$(searchText: string, isSearchAllGithub = false): Observable<SearchResultItem[]> {
    this._checkSettings();
    const repoQuery = isSearchAllGithub
      ? '' :
      `+repo:${this._cfg.repo}`;

    return this._http.get(`${BASE}search/issues?q=${encodeURI(searchText + repoQuery)}`)
      .pipe(
        catchError(this._handleRequestError$.bind(this)),
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
}
