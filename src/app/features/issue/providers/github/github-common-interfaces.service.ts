import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { GithubApiService } from './github-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { GithubCfg } from './github.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { GithubIssue, GithubIssueReduced } from './github-issue/github-issue.model';
import { truncate } from '../../../../util/truncate';
import { getTimestamp } from '../../../../util/get-timestamp';

@Injectable({
  providedIn: 'root',
})
export class GithubCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _githubApiService: GithubApiService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
  ) {}

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
        githubCfg && githubCfg.isSearchIssuesFromGithub
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

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<GithubIssueReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    return await this._githubApiService.getLast100IssuesForRepo$(cfg).toPromise();
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

  private _getCfgOnce$(projectId: string): Observable<GithubCfg> {
    return this._projectService.getGithubCfgForProject$(projectId).pipe(first());
  }

  private _isIssueDone(issue: GithubIssueReduced): boolean {
    return issue.state === 'closed';
  }
}
