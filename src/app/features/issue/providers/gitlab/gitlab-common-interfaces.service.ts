import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {Task} from 'src/app/features/tasks/task.model';
import {catchError, map, switchMap} from 'rxjs/operators';
import {IssueServiceInterface} from '../../issue-service-interface';
import {GitlabApiService} from './gitlab-api/gitlab-api.service';
import {ProjectService} from '../../../project/project.service';
import {SearchResultItem} from '../../issue.model';
import {GitlabCfg} from './gitlab';
import {SnackService} from '../../../../core/snack/snack.service';
import {GitlabIssue} from './gitlab-issue/gitlab-issue.model';
import {truncate} from '../../../../util/truncate';
import {T} from '../../../../t.const';
import {GITLAB_API_BASE_URL} from './gitlab.const';


@Injectable({
  providedIn: 'root',
})
export class GitlabCommonInterfacesService implements IssueServiceInterface {
  isGitlabSearchEnabled$: Observable<boolean> = this._projectService.currentGitlabCfg$.pipe(
    map(gitlabCfg => gitlabCfg && gitlabCfg.isSearchIssuesFromGitlab)
  );
  gitlabCfg: GitlabCfg;

  constructor(
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
  ) {
    this._projectService.currentGitlabCfg$.subscribe((gitlabCfg) => this.gitlabCfg = gitlabCfg);
  }

  issueLink(issueId: number): string {
    return `${GITLAB_API_BASE_URL}/issues/${issueId}`;
  }

  getById$(issueId: number) {
    return this._gitlabApiService.getById$(issueId);
  }

  searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    return this.isGitlabSearchEnabled$.pipe(
      switchMap((isSearchGitlab) => isSearchGitlab
        ? this._gitlabApiService.searchIssueInProject$(searchTerm).pipe(catchError(() => []))
        : of([])
      )
    );
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ): Promise<{ taskChanges: Partial<Task>, issue: GitlabIssue }> {
    const cfg = this.gitlabCfg;
    const issue = await this._gitlabApiService.getById$(+task.issueId).toPromise();

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
  }

  getAddTaskData(issue: GitlabIssue): { title: string; additionalFields: Partial<Task> } {
    return {
      title: this._formatIssueTitle(issue.number, issue.title),
      additionalFields: {
        // issueWasUpdated: false,
        // NOTE: we use Date.now() instead to because updated does not account for comments
        // issueLastUpdated: new Date(issue.updated_at).getTime()
      }
    };
  }

  private _formatIssueTitle(id: number, title: string): string {
    return `#${id} ${title}`;
  }

  private _formatIssueTitleForSnack(id: number, title: string): string {
    return `${truncate(this._formatIssueTitle(id, title))}`;
  }
}
