import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';
import { HttpClient } from '@angular/common/http';
import { GIT_API_BASE_URL } from './git.const';
import { Observable, throwError } from 'rxjs';
import { GitIssueSearchResult } from './git-api-responses';
import { map } from 'rxjs/operators';
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
        map((res: GitIssueSearchResult) => {
          if (res && res.items) {
            return res.items.map(mapGitIssue).map(mapGitIssueToSearchResult);
          } else {
            return [];
          }
        }),
      );
  }

  getIssueById(issueNumber: number) {
    this._checkSettings();
    return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueNumber}`);
  }

  getCommentListForIssue(issueNumber: number) {
    this._checkSettings();
    return this._http.get(BASE + `${BASE}repos/${this._cfg.repo}/issues/${issueNumber}/comments`);
  }

  private _checkSettings() {
    if (!this._isValidSettings()) {
      this._snackService.open({type: 'ERROR', message: 'Git is not properly configured'});
      throw throwError('Not enough settings');
    }
  }

  private _isValidSettings(): boolean {
    const cfg = this._cfg;
    return cfg && cfg.repo && cfg.repo.length > 0;
  }
}
