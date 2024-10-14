import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GithubApiService } from './github-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { GithubCfg } from './github.model';
import {
  GithubIssue,
  GithubIssueReduced,
  GithubLabel,
} from './github-issue/github-issue.model';
import { truncate } from '../../../../util/truncate';
import { getTimestamp } from '../../../../util/get-timestamp';
import { isGithubEnabled } from './is-github-enabled.util';
import { GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL } from './github.const';
import { TagService } from '../../../tag/tag.service';

@Injectable({
  providedIn: 'root',
})
export class GithubCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _githubApiService: GithubApiService,
    private readonly _projectService: ProjectService,
    private _tagService: TagService,
  ) {}

  pollTimer$: Observable<number> = timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL);

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

  isEnabled(cfg: GithubCfg): boolean {
    return isGithubEnabled(cfg);
  }

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => `https://github.com/${cfg.repo}/issues/${issueId}`),
    );
  }

  getById$(issueId: number, projectId: string): Observable<GithubIssue> {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((githubCfg) => this._githubApiService.getById$(issueId, githubCfg)),
    );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((githubCfg) =>
        this.isEnabled(githubCfg) && githubCfg.isSearchIssuesFromGithub
          ? this._githubApiService
              .searchIssueForRepo$(searchTerm, githubCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: GithubIssue;
    issueTitle: string;
  } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._githubApiService.getById$(+task.issueId, cfg).toPromise();

    // NOTE we are not able to filter out user updates to the issue itself by the user
    const filterUserName = cfg.filterUsername && cfg.filterUsername.toLowerCase();
    const commentsByOthers =
      filterUserName && filterUserName.length > 1
        ? issue.comments.filter(
            (comment) => comment.user.login.toLowerCase() !== cfg.filterUsername,
          )
        : issue.comments;

    const commentUpdates: number[] = commentsByOthers
      .map((comment) => getTimestamp(comment.created_at))
      .sort();
    const newestCommentUpdate = commentUpdates[commentUpdates.length - 1];

    const wasUpdated =
      newestCommentUpdate > (task.issueLastUpdated || 0) ||
      getTimestamp(issue.updated_at) > (task.issueLastUpdated || 0);

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: this._formatIssueTitleForSnack(issue.number, issue.title),
      };
    }
    return null;
  }

  async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: GithubIssue }[]> {
    return Promise.all(
      tasks.map((task) =>
        this.getFreshDataForIssueTask(task).then((refreshDataForTask) => ({
          task,
          refreshDataForTask,
        })),
      ),
    ).then((items) => {
      return items
        .filter(({ refreshDataForTask, task }) => !!refreshDataForTask)
        .map(({ refreshDataForTask, task }) => {
          if (!refreshDataForTask) {
            throw new Error('No refresh data for task js error');
          }
          return {
            task,
            taskChanges: refreshDataForTask.taskChanges,
            issue: refreshDataForTask.issue,
          };
        });
    });
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<GithubIssueReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    if (!cfg.token) {
      return await this._githubApiService.getLast100IssuesForRepo$(cfg).toPromise();
    }
    return await this._githubApiService
      .getImportToBacklogIssuesFromGraphQL(cfg)
      .toPromise();
  }

  getAddTaskData(issue: GithubIssueReduced): Partial<Task> & { title: string } {
    return {
      title: this._formatIssueTitle(issue.number, issue.title),
      issueWasUpdated: false,
      // NOTE: we use Date.now() instead to because updated does not account for comments
      issueLastUpdated: new Date(issue.updated_at).getTime(),
      isDone: this._isIssueDone(issue),
      tagIds: this._getGithubLabelsAsTags(issue.labels),
    };
  }

  private _formatIssueTitle(id: number, title: string): string {
    return `#${id} ${title}`;
  }

  private _formatIssueTitleForSnack(id: number, title: string): string {
    return `${truncate(this._formatIssueTitle(id, title))}`;
  }

  private _getCfgOnce$(projectId: string): Observable<GithubCfg> {
    return this._projectService.getGithubCfgForProject$(projectId).pipe(first());
  }

  private _isIssueDone(issue: GithubIssueReduced): boolean {
    return issue.state === 'closed';
  }

  private _getGithubLabelsAsTags(labels: GithubLabel[]): string[] {
    const getTagIds: string[] = [];
    labels.forEach((label: GithubLabel) => {
      getTagIds.push(this._tagService.addTag({ title: label.name, color: label.color }));
    }, this);
    return getTagIds;
  }
}
