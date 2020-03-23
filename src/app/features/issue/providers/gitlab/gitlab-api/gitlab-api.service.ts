import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {EMPTY, forkJoin, Observable, ObservableInput, throwError} from 'rxjs';

import {ProjectService} from 'src/app/features/project/project.service';
import {SnackService} from 'src/app/core/snack/snack.service';

import {GitlabCfg} from '../gitlab';
import {GitlabOriginalComment, GitlabOriginalIssue} from './gitlab-api-responses';
import {HANDLED_ERROR_PROP_STR} from 'src/app/app.constants';
import {GITLAB_API_BASE_URL} from '../gitlab.const';
import {T} from 'src/app/t.const';
import {catchError, flatMap, map, share, switchMap, take} from 'rxjs/operators';
import {GitlabIssue} from '../gitlab-issue/gitlab-issue.model';
import {mapGitlabIssue, mapGitlabIssueToSearchResult} from '../gitlab-issue/gitlab-issue-map.util';
import {SearchResultItem} from '../../../issue.model';

const BASE = GITLAB_API_BASE_URL;

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  /** @deprecated */
  private _cfg: GitlabCfg;
  /** @deprecated */
  private _header: HttpHeaders;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGitlabCfg$.subscribe((cfg: GitlabCfg) => {
      this._cfg = cfg;
      if (cfg) {
        this.setHeader(cfg.token);
      }
    });
  }

  getProjectData$(cfg: GitlabCfg): Observable<GitlabIssue[]> {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this._getProjectIssues$(1).pipe(
      flatMap(
        issues => forkJoin(
          [
            ...issues.map(issue => this.getIssueWithComments$(issue))
          ]
        )
      ),
    );
  }

  getById$(id: number, cfg: GitlabCfg): Observable<GitlabIssue> {
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this.getProjectData$(cfg)
      .pipe(switchMap(issues => {
        return issues.filter(issue => issue.id === id);
      }));
  }

  getIssueWithComments$(issue: GitlabIssue): Observable<GitlabIssue> {
    return this._getIssueComments$(issue.id, 1).pipe(
      map((comments) => {
          return {
            ...issue,
            comments,
            commentsNr: comments.length,
          };
        }
      ));
  }

  searchIssueInProject$(searchText: string, cfg: GitlabCfg): Observable<SearchResultItem[]> {
    const filterFn = issue => {
      try {
        return issue.title.toLowerCase().match(searchText.toLowerCase())
          || issue.body.toLowerCase().match(searchText.toLowerCase());
      } catch (e) {
        console.warn('RegEx Error', e);
        return false;
      }
    };
    if (!this._isValidSettings(cfg)) {
      return EMPTY;
    }
    return this.getProjectData$(cfg)
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

  private setHeader(accessToken: string) {
    if (accessToken) {
      this._header = new HttpHeaders({
        Authorization: 'Bearer ' + accessToken
      });
    } else {
      this._header = null;
    }
  }

  private _getProjectIssues$(pageNumber: number): Observable<GitlabIssue[]> {
    return this._http.get(
      `${BASE}/${this._cfg.project}/issues?order_by=updated_at&per_page=100&page=${pageNumber}`,
      {headers: this._header ? this._header : {}}
    ).pipe(
      catchError(this._handleRequestError$.bind(this)),
      take(1),
      map((issues: GitlabOriginalIssue[]) => {
        return issues ? issues.map(mapGitlabIssue) : [];
      }),
    );
  }

  private _getIssueComments$(issueid: number, pageNumber: number) {
    if (!this._isValidSettings()) {
      return EMPTY;
    }
    return this._http.get(
      `${BASE}/${this._cfg.project}/issues/${issueid}/notes?per_page=100&page=${pageNumber}`,
      {headers: this._header ? this._header : {}}
    ).pipe(
      catchError(this._handleRequestError$.bind(this)),
      map((comments: GitlabOriginalComment[]) => {
        return comments ? comments : [];
      }),
    );
  }

  // TODO fix
  private _isValidSettings(cfgIn?: GitlabCfg): boolean {
    const cfg = cfgIn || this._cfg;
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
      return throwError({[HANDLED_ERROR_PROP_STR]: 'Gitlab: ' + error.message});
    }
    return throwError({[HANDLED_ERROR_PROP_STR]: 'Gitlab: Api request failed.'});
  }
}
