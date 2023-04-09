import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GitlabApiService } from './gitlab-api/gitlab-api.service';
import { ProjectService } from '../../../project/project.service';
import { IssueData, SearchResultItem } from '../../issue.model';
import { GitlabCfg } from './gitlab';
import { GitlabIssue } from './gitlab-issue/gitlab-issue.model';
import { truncate } from '../../../../util/truncate';
import { GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL } from './gitlab.const';
import { isGitlabEnabled } from './is-gitlab-enabled';

@Injectable({
  providedIn: 'root',
})
export class GitlabCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _projectService: ProjectService,
  ) {}

  pollTimer$: Observable<number> = timer(GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL);

  isBacklogPollingEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => this.isEnabled(cfg) && cfg.isAutoAddToBacklog),
    );
  }

  isIssueRefreshEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => this.isEnabled(cfg) && cfg.isAutoPoll),
    );
  }

  isEnabled(cfg: GitlabCfg): boolean {
    return isGitlabEnabled(cfg);
  }

  issueLink$(issueId: string, projectId: string): Observable<string> {
    return this.getById$(issueId, projectId).pipe(
      map((issue: GitlabIssue) => {
        return issue.url;
      }),
    );
  }

  getById$(issueId: string, projectId: string): Observable<GitlabIssue> {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((gitlabCfg) => this._gitlabApiService.getById$(issueId, gitlabCfg)),
    );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((gitlabCfg) =>
        this.isEnabled(gitlabCfg) && gitlabCfg.isSearchIssuesFromGitlab
          ? this._gitlabApiService.searchIssueInProject$(searchTerm, gitlabCfg).pipe(
              catchError((err) => {
                console.error('Error searching issue', err);
                return [];
              }),
            )
          : of([]),
      ),
    );
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: GitlabIssue;
    issueTitle: string;
  } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const fullIssueRef = this._gitlabApiService.getFullIssueRef$(task.issueId, cfg);
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
    const projectId = tasks && tasks[0].projectId ? tasks[0].projectId : 0;
    if (!projectId) {
      throw new Error('No projectId');
    }

    const cfg = await this._getCfgOnce$(projectId).toPromise();
    const issues = new Map<string, GitlabIssue>();
    const paramsCount = 59; // Can't send more than 59 issue id For some reason it returns 502 bad gateway
    const iidsByProject = new Map<string, string[]>();
    let i = 0;

    for (const task of tasks) {
      if (!task.issueId) {
        continue;
      }
      const project = this._gitlabApiService.getProject$(cfg, task.issueId);
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
      const fullIssueRef = this._gitlabApiService.getFullIssueRef$(task.issueId, cfg);
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
      issueId: issue.id as string,
    };
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueData[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    return await this._gitlabApiService.getProjectIssues$(cfg).toPromise();
  }

  private _formatIssueTitle(issue: GitlabIssue): string {
    return `#${issue.number} ${issue.title} #${issue.project}`;
  }

  private _formatIssueTitleForSnack(issue: GitlabIssue): string {
    return `${truncate(this._formatIssueTitle(issue))}`;
  }

  private _getCfgOnce$(projectId: string): Observable<GitlabCfg> {
    return this._projectService.getGitlabCfgForProject$(projectId).pipe(first());
  }
}
