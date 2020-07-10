import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IssueFieldsForTask, Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, switchMap, map } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GitlabApiService } from './gitlab-api/gitlab-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { GitlabCfg } from './gitlab';
import { SnackService } from '../../../../core/snack/snack.service';
import { GitlabIssue } from './gitlab-issue/gitlab-issue.model';
import { truncate } from '../../../../util/truncate';
import { T } from '../../../../t.const';
import { GITLAB_URL_REGEX } from './gitlab.const';

@Injectable({
  providedIn: 'root',
})
export class GitlabCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
  ) {
  }

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => {
        if (cfg.project && cfg.project?.search(GITLAB_URL_REGEX) >= 0) {
          return `${cfg.project}/issues/${issueId}`;
        } else {
          return `https://gitlab.com/${cfg.project?.replace(/%2F/g, '/')}/issues/${issueId}`;
        }
      })
    );
  }

  getById$(issueId: number, projectId: string) {
    return this._getCfgOnce$(projectId).pipe(
      concatMap(gitlabCfg => this._gitlabApiService.getById$(issueId, gitlabCfg)),
    );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((gitlabCfg) => (gitlabCfg && gitlabCfg.isSearchIssuesFromGitlab)
        ? this._gitlabApiService.searchIssueInProject$(searchTerm, gitlabCfg).pipe(catchError(() => []))
        : of([])
      )
    );
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false
  ): Promise<{ taskChanges: Partial<Task>, issue: GitlabIssue } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._gitlabApiService.getById$(+task.issueId, cfg).toPromise();

    const issueUpdate: number = new Date(issue.updated_at).getTime();
    const commentsByOthers = (cfg.filterUsername && cfg.filterUsername.length > 1)
      ? issue.comments.filter(comment => comment.author.username !== cfg.filterUsername)
      : issue.comments;

    // TODO: we also need to handle the case when the user himself updated the issue, to also update the issue...
    const updates: number[] = [
      ...(commentsByOthers.map(comment => new Date(comment.created_at).getTime())),
      issueUpdate
    ].sort();
    const lastRemoteUpdate = updates[updates.length - 1];

    const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);

    if (wasUpdated && isNotifySuccess) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: this._formatIssueTitleForSnack(issue.number, issue.title)
        },
        msg: T.F.GITLAB.S.ISSUE_UPDATE,
      });
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        msg: T.F.GITLAB.S.ISSUE_NO_UPDATE_REQUIRED,
        ico: 'cloud_download',
      });
    }

    if (wasUpdated) {
      return {
        taskChanges: {
          issueWasUpdated: true,
          issueLastUpdated: lastRemoteUpdate,
          title: `#${issue.number} ${issue.title}`,
        },
        issue,
      };
    }
    return null;
  }

  getAddTaskData(issue: GitlabIssue): { title: string; additionalFields: Partial<IssueFieldsForTask> } {
    return {
      title: this._formatIssueTitle(issue.number, issue.title),
      additionalFields: {
        issuePoints: issue.weight
      }
    };
  }

  private _formatIssueTitle(id: number, title: string): string {
    return `#${id} ${title}`;
  }

  private _formatIssueTitleForSnack(id: number, title: string): string {
    return `${truncate(this._formatIssueTitle(id, title))}`;
  }

  private _getCfgOnce$(projectId: string): Observable<GitlabCfg> {
    return this._projectService.getGitlabCfgForProject$(projectId).pipe(first());
  }
}
