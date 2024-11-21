import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { concatMap, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GitlabApiService } from './gitlab-api/gitlab-api.service';
import { IssueData, IssueProviderGitlab, SearchResultItem } from '../../issue.model';
import { GitlabCfg } from './gitlab';
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
  constructor(
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _issueProviderService: IssueProviderService,
  ) {}

  pollTimer$: Observable<number> = timer(GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL);

  isBacklogPollingEnabledForDefaultProjectOnce$(
    issueProviderId: string,
  ): Observable<boolean> {
    return this._getCfgOnce$(issueProviderId).pipe(
      map(
        (cfg) => this.isEnabled(cfg) && cfg.isAutoAddToBacklog && !!cfg.defaultProjectId,
      ),
    );
  }

  isAutoUpdateIssuesEnabledOnce$(issueProviderId: string): Observable<boolean> {
    return this._getCfgOnce$(issueProviderId).pipe(
      map((cfg) => this.isEnabled(cfg) && cfg.isAutoPoll),
    );
  }

  isEnabled(cfg: GitlabCfg): boolean {
    return isGitlabEnabled(cfg);
  }

  issueLink$(issueId: string, issueProviderId: string): Observable<string> {
    return this._getCfgOnce$(issueProviderId).pipe(
      map((cfg) => {
        const project: string = this._gitlabApiService.getProject(cfg, issueId);
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
        this.isEnabled(gitlabCfg) && gitlabCfg.isSearchIssuesFromGitlab
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
    const fullIssueRef = this._gitlabApiService.getFullIssueRef(task.issueId, cfg);
    const idFormatChanged = task.issueId !== fullIssueRef;
    const issue = await this._gitlabApiService.getById$(fullIssueRef, cfg).toPromise();

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

    if (wasUpdated || idFormatChanged) {
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
    const issues = new Map<string, GitlabIssue>();
    const paramsCount = 59; // Can't send more than 59 issue id For some reason it returns 502 bad gateway
    const iidsByProject = new Map<string, string[]>();
    let i = 0;

    for (const task of tasks) {
      if (!task.issueId) {
        continue;
      }
      const project = this._gitlabApiService.getProject(cfg, task.issueId);
      if (!iidsByProject.has(project)) {
        iidsByProject.set(project, []);
      }
      iidsByProject.get(project)?.push(task.issueId as string);
    }

    iidsByProject.forEach(async (allIds, project) => {
      for (i = 0; i < allIds.length; i += paramsCount) {
        (
          await this._gitlabApiService
            .getByIds$(project, allIds.slice(i, i + paramsCount), cfg)
            .toPromise()
        ).forEach((found) => {
          issues.set(found.id as string, found);
        });
      }
    });

    const updatedIssues: {
      task: Task;
      taskChanges: Partial<Task>;
      issue: GitlabIssue;
    }[] = [];

    for (const task of tasks) {
      if (!task.issueId) {
        continue;
      }
      let idFormatChanged = false;
      const fullIssueRef = this._gitlabApiService.getFullIssueRef(task.issueId, cfg);
      idFormatChanged = task.issueId !== fullIssueRef;
      const issue = issues.get(fullIssueRef);
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
        const wasUpdated = lastRemoteUpdate > (tasks[i].issueLastUpdated || 0);
        const project_tag_missing = task.tagIds.indexOf(issue.project) === -1;
        if (wasUpdated || idFormatChanged || project_tag_missing) {
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
      issueId: issue.number.toString(),
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
    return `#${issue.number} ${issue.title} #${issue.project}`;
  }

  private _formatIssueTitleForSnack(issue: GitlabIssue): string {
    return `${truncate(this._formatIssueTitle(issue))}`;
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderGitlab> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'GITLAB');
  }
}
