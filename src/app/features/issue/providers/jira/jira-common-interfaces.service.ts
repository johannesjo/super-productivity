import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {Task} from 'src/app/features/tasks/task.model';
import {catchError, first, map, switchMap} from 'rxjs/operators';
import {IssueServiceInterface} from '../../issue-service-interface';
import {JiraCfg} from './jira.model';
import {JiraApiService} from './jira-api.service';
import {SnackService} from '../../../../core/snack/snack.service';
import {TaskService} from '../../../tasks/task.service';
import {ProjectService} from '../../../project/project.service';
import {SearchResultItem} from '../../issue.model';
import {JiraIssue, JiraIssueReduced} from './jira-issue/jira-issue.model';
import {TaskAttachment} from '../../../tasks/task-attachment/task-attachment.model';
import {mapJiraAttachmentToAttachment} from './jira-issue/jira-issue-map.util';
import {T} from '../../../../t.const';


@Injectable({
  providedIn: 'root',
})
export class JiraCommonInterfacesService implements IssueServiceInterface {
  isJiraSearchEnabled$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled)
  );
  /** @deprecated */
  jiraCfg: JiraCfg;

  constructor(
    private readonly _store: Store<any>,
    private readonly _jiraApiService: JiraApiService,
    private readonly _snackService: SnackService,
    private readonly _taskService: TaskService,
    private readonly _projectService: ProjectService,
  ) {
    this._projectService.currentJiraCfg$.subscribe((jiraCfg) => this.jiraCfg = jiraCfg);
  }

  getById$(issueId: string | number, projectId: string) {
    return this._jiraApiService.getIssueById$(issueId);
  }

  searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    return this.isJiraSearchEnabled$.pipe(
      switchMap((isSearchJira) => isSearchJira
        ? this._jiraApiService.issuePicker$(searchTerm).pipe(catchError(() => []))
        : of([])
      )
    );
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ): Promise<{ taskChanges: Partial<Task>, issue: JiraIssue }> {
    const issue = await this._jiraApiService.getIssueById$(task.issueId).toPromise() as JiraIssue;

    // @see https://developer.atlassian.com/cloud/jira/platform/jira-expressions-type-reference/#date
    const newUpdated = new Date(issue.updated).getTime();
    const wasUpdated = newUpdated > (task.issueLastUpdated || 0);

    // NOTIFICATIONS
    if (wasUpdated && isNotifySuccess) {
      this._snackService.open({
        msg: T.F.JIRA.S.ISSUE_UPDATE,
        translateParams: {
          issueText: `${issue.key}`
        },
        ico: 'cloud_download',
      });
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        msg: T.F.JIRA.S.ISSUE_NO_UPDATE_REQUIRED,
        translateParams: {
          issueText: `${issue.key}`
        },
        ico: 'cloud_download',
      });
    }

    if (wasUpdated) {
      return {
        taskChanges: {
          title: `${issue.key} ${issue.summary}`,
          issueLastUpdated: newUpdated,
          issueWasUpdated: wasUpdated,
          issueAttachmentNr: issue.attachments.length,
          issuePoints: issue.storyPoints
        },
        issue,
      };
    }
  }

  getAddTaskData(issue: JiraIssueReduced): { title: string; additionalFields: Partial<Task> } {
    return {
      title: `${issue.key} ${issue.summary}`,
      additionalFields: {
        issuePoints: issue.storyPoints,
        issueAttachmentNr: issue.attachments ? issue.attachments.length : 0,
        issueWasUpdated: false,
        issueLastUpdated: new Date(issue.updated).getTime()
      }
    };
  }

  issueLink$(issueId: string | number, projectId: string): Observable<string> {
    return this._projectService.getJiraCfgForProject$(projectId).pipe(
      first(),
      map((jiraCfg) => jiraCfg.host + '/browse/' + issueId)
    );
  }

  getMappedAttachments(issueData: JiraIssue): TaskAttachment[] {
    return issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment);
  }
}
