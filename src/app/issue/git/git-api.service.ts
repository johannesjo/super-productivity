import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';
import { HttpClient } from '@angular/common/http';
import { GIT_API_BASE_URL } from './git.const';

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

  getIssueById(issueNumber: number) {
    return this._http.get(`${BASE}repos/${this._cfg.repo}/issues/${issueNumber}`);
  }

  getCommentListForIssue(issueNumber: number) {
    return this._http.get(BASE + `${BASE}repos/${this._cfg.repo}/issues/${issueNumber}/comments`);
  }

  private _isValidSettings(): boolean {
    return true;
  }
}
