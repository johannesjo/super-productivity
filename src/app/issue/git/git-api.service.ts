import { Injectable } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { GitCfg } from './git';
import { SnackService } from '../../core/snack/snack.service';

const BLOCK_ACCESS_KEY = 'SUP_BLOCK_GIT_ACCESS';

@Injectable({
  providedIn: 'root'
})
export class GitApiService {
  private _cfg: GitCfg;

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
  ) {
    this._projectService.currentGitCfg$.subscribe((cfg: GitCfg) => {
      this._cfg = cfg;
    });
  }
}
