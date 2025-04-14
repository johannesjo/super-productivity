import { Injectable, inject } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GitlabApiService } from './gitlab-api/gitlab-api.service';
import { IssueData, IssueProviderGitlab, SearchResultItem } from '../../issue.model';
import { GitlabCfg } from './gitlab.model';
import { GitlabIssue } from './gitlab-issue/gitlab-issue.model';
import { truncate } from '../../../../util/truncate';
import {
  GITLAB_BASE_URL,
  GITLAB_INITIAL_POLL_DELAY,
  GITLAB_POLL_INTERVAL,
} from './gitlab.const';
import { isGitlabEnabled } from './is-gitlab-enabled';
import { IssueProviderService } from '../../issue-provider.service';

@Injectable({
  providedIn: 'root',
})
export class GitlabCommonInterfacesService implements IssueServiceInterface {
  private readonly _gitlabApiService = inject(GitlabApiService);
  private readonly _issueProviderService = inject(IssueProviderService);

  pollTimer$: Observable<number> = timer(GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL);

  isEnabled(cfg: GitlabCfg): boolean {
    return isGitlabEnabled(cfg);
  }

  testConnection$(cfg: GitlabCfg): Observable<boolean> {
    return this._gitlabApiService.searchIssueInProject$('', cfg).pipe(
      map((res) => Array.isArray(res)),
      first(),
    );
  }

  issueLink$(issueId: string, issueProviderId: string): Observable<string> {
    return this._getCfgOnce$(issueProviderId).pipe(
      map((cfg) => {
        const project: string = cfg.project;
        if (cfg.gitlabBaseUrl) {
          const fixedUrl = cfg.gitlabBaseUrl.match(/.*\/$/)
            ? cfg.gitlabBaseUrl
            : `${cfg.gitlabBaseUrl}/`;
          return `${fixedUrl}${project}/issues/${issueId}`;
        } else {
          return `${GITLAB_BASE_URL}${project}/issues/${issueId}`;
        }
      }),
    );
  }

  getById$(issueId: string, issueProviderId: string): Observable<GitlabIssue> {
    return this._getCfgOnce$(issueProviderId).pipe(
      concatMap((gitlabCfg) => this._gitlabApiService.getById$(issueId, gitlabCfg)),
    );
  }

  searchIssues$(
    searchTerm: string,
    issueProviderId: string,
  ): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId).pipe(
      switchMap((gitlabCfg) =>
        this.isEnabled(gitlabCfg)
          ? this._gitlabApiService.searchIssueInProject$(searchTerm, gitlabCfg)
          : of([]),
      ),
    );
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: GitlabIssue;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId) {
      throw new Error('No issueProviderId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.issueProviderId).toPromise();
    const issue = await this._gitlabApiService.getById$(task.issueId, cfg).toPromise();

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

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: this._formatIssueTitleForSnack(issue),
      };
    }
    return null;
  }

  async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: GitlabIssue }[]> {
    const issueProviderId =
      tasks && tasks[0].issueProviderId ? tasks[0].issueProviderId : 0;
    if (!issueProviderId) {
      throw new Error('No issueProviderId');
    }

    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();

    const updatedIssues: {
      task: Task;
      taskChanges: Partial<Task>;
      issue: GitlabIssue;
    }[] = [];

    for (const task of tasks) {
      if (!task.issueId) {
        continue;
      }
      const issue = await this._gitlabApiService.getById$(task.issueId, cfg).toPromise();
      if (issue) {
        const issueUpdate: number = new Date(issue.updated_at).getTime();
        const commentsByOthers =
          cfg.filterUsername && cfg.filterUsername.length > 1
            ? issue.comments.filter(
                (comment) => comment.author.username !== cfg.filterUsername,
              )
            : issue.comments;

        const updates: number[] = [
          ...commentsByOthers.map((comment) => new Date(comment.created_at).getTime()),
          issueUpdate,
        ].sort();
        const lastRemoteUpdate = updates[updates.length - 1];
        const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);
        if (wasUpdated) {
          updatedIssues.push({
            task,
            taskChanges: {
              ...this.getAddTaskData(issue),
              issueWasUpdated: true,
            },
            issue,
          });
        }
      }
    }
    return updatedIssues;
  }

  getAddTaskData(issue: GitlabIssue): Partial<Task> & { title: string } {
    return {
      title: this._formatIssueTitle(issue),
      issuePoints: issue.weight,
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updated_at).getTime(),
      issueId: issue.id,
      isDone: this._isIssueDone(issue),
    };
  }

  async getNewIssuesToAddToBacklog(
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueData[]> {
    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    return await this._gitlabApiService.getProjectIssues$(cfg).toPromise();
  }

  private _formatIssueTitle(issue: GitlabIssue): string {
    return `#${issue.number} ${issue.title}`;
  }

  private _formatIssueTitleForSnack(issue: GitlabIssue): string {
    return `${truncate(this._formatIssueTitle(issue))}`;
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderGitlab> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'GITLAB');
  }

  private _isIssueDone(issue: GitlabIssue): boolean {
    return issue.state === 'closed';
  }
}
