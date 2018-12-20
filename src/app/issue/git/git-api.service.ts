import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { GIT_API_BASE_URL } from './git.const';
import { Observable, ObservableInput, throwError } from 'rxjs';
import { GitIssueSearchResult } from './git-api-responses';
import { catchError, map } from 'rxjs/operators';
import { SearchResultItem } from '../issue';
import { mapGitIssue, mapGitIssueToSearchResult } from './git-issue/git-issue-map.util';

const BASE = GIT_API_BASE_URL;

@Injectable({
  providedIn: 'root'
})
export class GitApiService {
  private _cfg: GitCfg;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {
    this._projectService.currentGitCfg$.subscribe((cfg: GitCfg) => {
      this._cfg = cfg;
    });
  }

  searchIssue(searchText: string): Observable<SearchResultItem[]> {
    this._checkSettings();
    return this._http.get(`${BASE}search/issues?q=${encodeURI(searchText)}`)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
        map((res: GitIssueSearchResult) => {
          if (res && res.items) {
            return res.items.map(mapGitIssue).map(mapGitIssueToSearchResult);
          } else {
            return [];
          }
        }),
      );
  }

  getIssueById(issueId: number) {
    this._checkSettings();
    return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueId}`)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
      );
  }

  getCommentListForIssue(issueId: number) {
    this._checkSettings();
    return this._http.get(BASE + `${BASE}repos/${this._cfg.repo}/issues/${issueId}/comments`)
      .pipe(
        catchError(this._handleRequestError.bind(this)),
      );
  }

  private _checkSettings() {
    if (!this._isValidSettings()) {
      this._snackService.open({type: 'ERROR', message: 'Git is not properly configured'});
      throw throwError('Not enough settings');
    }
  }

  private _handleRequestError(error: HttpErrorResponse, caught: Observable<Object>): ObservableInput<{}> {
    console.error(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({type: 'ERROR', message: 'GitHub: Request failed because of a client side network error'});
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({type: 'ERROR', message: `GitHub: API returned ${error.status}. ${error.error && error.error.message}`});
    }
    return throwError('GitHub: Api request failed.');
  }

  private _isValidSettings(): boolean {
    const cfg = this._cfg;
    return cfg && cfg.repo && cfg.repo.length > 0;
  }
}
