import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';
import { HttpClient } from '@angular/common/http';
import { GIT_API_BASE_URL } from './git.const';
import { Observable } from 'rxjs';
import { GitIssueSearchResult, GitOriginalIssue } from './git-api-responses';
import { map } from 'rxjs/operators';
import { IssueProviderKey, SearchResultItem } from '../issue';
import { mapGitIssue } from './git-issue/git-issue-map.util';

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
    return this._http.get(`${BASE}search/issues?q=${encodeURI(searchText)}`)
      .pipe(
        map((res: GitIssueSearchResult) => {
          if (res && res.items) {
            return this._mapIssuesToSearchResults(res.items);
          } else {
            return [];
          }
        }),
      );
  }

  getIssueById(issueNumber: number) {
    return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueNumber}`);
  }

  getCommentListForIssue(issueNumber: number) {
    return this._http.get(BASE + `${BASE}repos/${this._cfg.repo}/issues/${issueNumber}/comments`);
  }

  private _isValidSettings(): boolean {
    return true;
  }

  // TODO move to map util
  private _mapIssuesToSearchResults(issues: GitOriginalIssue[]): SearchResultItem[] {
    return issues.map(issue => {
      return {
        title: '#' + issue.number + ' ' + issue.title,
        issueType: 'GIT' as IssueProviderKey,
        issueData: mapGitIssue(issue),
      };
    });
  }
}
