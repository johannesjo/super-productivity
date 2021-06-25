import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IssueFieldsForTask, Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GitlabApiService } from './gitlab-api/gitlab-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { GitlabCfg } from './gitlab';
import { SnackService } from '../../../../core/snack/snack.service';
import { GitlabIssue } from './gitlab-issue/gitlab-issue.model';
import { truncate } from '../../../../util/truncate';
import { T } from '../../../../t.const';
import { GITLAB_BASE_URL } from './gitlab.const';

@Injectable({
  providedIn: 'root',
})
export class GitlabCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
  ) {}

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => {
        if (cfg.gitlabBaseUrl) {
          const fixedUrl = cfg.gitlabBaseUrl.match(/.*\/$/)
            ? cfg.gitlabBaseUrl
            : `${cfg.gitlabBaseUrl}/`;
          return `${fixedUrl}${cfg.project}issues/${issueId}`;
        } else {
          return `${GITLAB_BASE_URL}${cfg.project?.replace(
            /%2F/g,
            '/',
          )}/issues/${issueId}`;
        }
      }),
    );
  }

  getById$(issueId: number, projectId: string) {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((gitlabCfg) => this._gitlabApiService.getById$(issueId, gitlabCfg)),
    );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((gitlabCfg) =>
        gitlabCfg && gitlabCfg.isSearchIssuesFromGitlab
          ? this._gitlabApiService
              .searchIssueInProject$(searchTerm, gitlabCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<{ taskChanges: Partial<Task>; issue: GitlabIssue } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._gitlabApiService.getById$(+task.issueId, cfg).toPromise();

    const issueUpdate: number = new Date(issue.updated_at).getTime();
    const commentsByOthers =
      cfg.filterUsername && cfg.filterUsername.length > 1
        ? issue.comments.filter(
            (comment) => comment.author.username !== cfg.filterUsername,
          )
        : issue.comments;

    // TODO: we also need to handle the case when the user himself updated the issue, to also update the issue...
    const updates: number[] = [
      ...commentsByOthers.map((comment) => new Date(comment.created_at).getTime()),
      issueUpdate,
    ].sort();
    const lastRemoteUpdate = updates[updates.length - 1];

    const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);

    if (wasUpdated && isNotifySuccess) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: this._formatIssueTitleForSnack(issue.number, issue.title),
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
          title: this._formatIssueTitle(issue.number, issue.title),
        },
        issue,
      };
    }
    return null;
  }

  async refreshIssues(
    tasks: Task[],
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: GitlabIssue }[]> {
    // First sort the tasks by the issueId
    // because the API returns it in a desc order by issue iid(issueId)
    // so it makes the update check easier and faster
    tasks.sort((a, b) => +(b.issueId as string) - +(a.issueId as string));
    const projectId = tasks && tasks[0].projectId ? tasks[0].projectId : 0;
    if (!projectId) {
      throw new Error('No projectId');
    }

    const cfg = await this._getCfgOnce$(projectId).toPromise();
    const issues: GitlabIssue[] = [];
    const paramsCount = 59; // Can't send more than 59 issue id For some reason it returns 502 bad gateway
    let ids;
    let i = 0;
    while (i < tasks.length) {
      ids = [];
      for (let j = 0; j < paramsCount && i < tasks.length; j++, i++) {
        ids.push(tasks[i].issueId);
      }
      issues.push(
        ...(await this._gitlabApiService.getByIds$(ids as string[], cfg).toPromise()),
      );
    }

    const updatedIssues: {
      task: Task;
      taskChanges: Partial<Task>;
      issue: GitlabIssue;
    }[] = [];

    for (i = 0; i < tasks.length; i++) {
      const issueUpdate: number = new Date(issues[i].updated_at).getTime();
      const commentsByOthers =
        cfg.filterUsername && cfg.filterUsername.length > 1
          ? issues[i].comments.filter(
              (comment) => comment.author.username !== cfg.filterUsername,
            )
          : issues[i].comments;

      const updates: number[] = [
        ...commentsByOthers.map((comment) => new Date(comment.created_at).getTime()),
        issueUpdate,
      ].sort();
      const lastRemoteUpdate = updates[updates.length - 1];
      const wasUpdated = lastRemoteUpdate > (tasks[i].issueLastUpdated || 0);

      if (wasUpdated) {
        updatedIssues.push({
          task: tasks[i],
          taskChanges: {
            issueWasUpdated: true,
            issueLastUpdated: lastRemoteUpdate,
            title: this._formatIssueTitle(issues[i].number, issues[i].title),
          },
          issue: issues[i],
        });
      }

      if (wasUpdated && isNotifySuccess) {
        this._snackService.open({
          ico: 'cloud_download',
          translateParams: {
            issueText: this._formatIssueTitleForSnack(issues[i].number, issues[i].title),
          },
          msg: T.F.GITLAB.S.ISSUE_UPDATE,
        });
      } else if (isNotifyNoUpdateRequired) {
        this._snackService.open({
          msg: T.F.GITLAB.S.ISSUE_NO_UPDATE_REQUIRED,
          ico: 'cloud_download',
        });
      }
    }
    return updatedIssues;
  }

  getAddTaskData(issue: GitlabIssue): {
    title: string;
    additionalFields: Partial<IssueFieldsForTask>;
  } {
    return {
      title: this._formatIssueTitle(issue.number, issue.title),
      additionalFields: {
        issuePoints: issue.weight,
      },
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
