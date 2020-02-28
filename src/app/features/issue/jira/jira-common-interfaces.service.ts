import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {Task} from 'src/app/features/tasks/task.model';
import {catchError, map, switchMap} from 'rxjs/operators';
import {IssueServiceInterface} from '../issue-service-interface';
import {JiraCfg} from './jira.model';
import {JiraApiService} from './jira-api.service';
import {SnackService} from '../../../core/snack/snack.service';
import {TaskService} from '../../tasks/task.service';
import {ProjectService} from '../../project/project.service';
import {SearchResultItem} from '../issue.model';
import {JiraIssue} from './jira-issue/jira-issue.model';
import {JiraIssueService} from './jira-issue/jira-issue.service';
import {Attachment} from '../../attachment/attachment.model';
import {mapJiraAttachmentToAttachment} from './jira-issue/jira-issue-map.util';


@Injectable({
  providedIn: 'root',
})
export class JiraCommonInterfacesService implements IssueServiceInterface {
  isJiraSearchEnabled$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled)
  );
  jiraCfg: JiraCfg;

  constructor(
    private readonly _store: Store<any>,
    private readonly _jiraApiService: JiraApiService,
    private readonly _jiraIssueService: JiraIssueService,
    private readonly _snackService: SnackService,
    private readonly _taskService: TaskService,
    private readonly _projectService: ProjectService,
  ) {
    this._projectService.currentJiraCfg$.subscribe((jiraCfg) => this.jiraCfg = jiraCfg);
  }

  getById$(issueId: string | number) {
    return this._jiraApiService.getIssueById$(issueId);
  }

  searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    return this.isJiraSearchEnabled$.pipe(
      switchMap((isSearchJira) => this._jiraApiService.issuePicker$(searchTerm)
        .pipe(catchError(() => []))
      )
    );
  }

  refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ) {
    this._jiraIssueService.updateIssueFromApi(task, isNotifySuccess, isNotifyNoUpdateRequired);
  }

  async getAddTaskData(issueId: string | number)
    : Promise<{ title: string; additionalFields: Partial<Task> }> {
    const issue = await this._jiraApiService.getIssueById$(issueId).toPromise();

    return {
      title: issue.summary,
      additionalFields: {
        issuePoints: issue.storyPoints,
        issueAttachmentNr: issue.attachments ? issue.attachments.length : 0,
        issueWasUpdated: false,
        issueLastUpdated: new Date(issue.updated).getTime()
      }
    };
  }

  issueLink(issueId: string | number): string {
    return this.jiraCfg.host + '/browse/' + issueId;
  }

  getMappedAttachments(issueData: JiraIssue): Attachment[] {
    return issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment);
  }
}
