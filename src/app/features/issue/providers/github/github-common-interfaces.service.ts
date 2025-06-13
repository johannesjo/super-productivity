import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GithubApiService } from './github-api.service';
import { IssueProviderGithub, SearchResultItem } from '../../issue.model';
import { GithubCfg } from './github.model';
import { GithubIssue, GithubIssueReduced } from './github-issue.model';
import { truncate } from '../../../../util/truncate';
import { getTimestamp } from '../../../../util/get-timestamp';
import { isGithubEnabled } from './is-github-enabled.util';
import { GITHUB_POLL_INTERVAL } from './github.const';
import { IssueProviderService } from '../../issue-provider.service';

@Injectable({
  providedIn: 'root',
})
export class GithubCommonInterfacesService implements IssueServiceInterface {
  private readonly _githubApiService = inject(GithubApiService);
  private readonly _issueProviderService = inject(IssueProviderService);

  pollInterval: number = GITHUB_POLL_INTERVAL;

  isEnabled(cfg: GithubCfg): boolean {
    return isGithubEnabled(cfg);
  }

  testConnection(cfg: GithubCfg): Promise<boolean> {
    return this._githubApiService
      .searchIssueForRepo$('', cfg)
      .pipe(
        map((res) => Array.isArray(res)),
        first(),
      )
      .toPromise()
      .then((result) => result ?? false);
  }

  issueLink(issueId: number, issueProviderId: string): Promise<string> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(map((cfg) => `https://github.com/${cfg.repo}/issues/${issueId}`))
      .toPromise()
      .then((result) => result ?? '');
  }

  getById(issueId: number, issueProviderId: string): Promise<GithubIssue> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(concatMap((githubCfg) => this._githubApiService.getById$(issueId, githubCfg)))
      .toPromise()
      .then((result) => {
        if (!result) {
          throw new Error('Failed to get GitHub issue');
        }
        return result;
      });
  }

  searchIssues(searchTerm: string, issueProviderId: string): Promise<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((githubCfg) =>
          this.isEnabled(githubCfg)
            ? this._githubApiService.searchIssueForRepo$(searchTerm, githubCfg)
            : of([]),
        ),
      )
      .toPromise()
      .then((result) => result ?? []);
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: GithubIssue;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId) {
      throw new Error('No issueProviderId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.issueProviderId).toPromise();
    const issue = await this._githubApiService.getById$(+task.issueId, cfg).toPromise();

    // NOTE we are not able to filter out user updates to the issue itself by the user
    const filterUserName =
      cfg.filterUsernameForIssueUpdates &&
      cfg.filterUsernameForIssueUpdates.toLowerCase();
    const commentsByOthers =
      filterUserName && filterUserName.length > 1
        ? issue.comments.filter(
            (comment) =>
              comment.user.login.toLowerCase() !== cfg.filterUsernameForIssueUpdates,
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
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<GithubIssueReduced[]> {
    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    return await this._githubApiService
      .searchIssueForRepoNoMap$(cfg.backlogQuery || 'sort:updated state:open', cfg)
      .pipe(first())
      .toPromise();

    // .map((issue) => issue.issueData as GithubIssueReduced)

    // .filter((issue) => allExistingIssueIds.includes(issue.issueData.id as string));
  }

  getAddTaskData(issue: GithubIssueReduced): Partial<Task> & { title: string } {
    return {
      title: this._formatIssueTitle(issue.number, issue.title),
      issueWasUpdated: false,
      // NOTE: we use Date.now() instead to because updated does not account for comments
      issueLastUpdated: new Date(issue.updated_at).getTime(),
      isDone: this._isIssueDone(issue),
    };
  }

  private _formatIssueTitle(id: number, title: string): string {
    return `#${id} ${title}`;
  }

  private _formatIssueTitleForSnack(id: number, title: string): string {
    return `${truncate(this._formatIssueTitle(id, title))}`;
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderGithub> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'GITHUB');
  }

  private _isIssueDone(issue: GithubIssueReduced): boolean {
    return issue.state === 'closed';
  }
}
