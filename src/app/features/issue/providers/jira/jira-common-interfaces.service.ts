import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, first, map, switchMap, tap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { JiraApiService } from './jira-api.service';
import { IssueProviderJira, SearchResultItem } from '../../issue.model';
import { JiraIssue, JiraIssueReduced } from './jira-issue/jira-issue.model';
import { TaskAttachment } from '../../../tasks/task-attachment/task-attachment.model';
import { mapJiraAttachmentToAttachment } from './jira-issue/jira-issue-map.util';
import { JiraCfg } from './jira.model';
import { isJiraEnabled } from './is-jira-enabled.util';
import { JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL } from './jira.const';
import { IssueProviderService } from '../../issue-provider.service';

@Injectable({
  providedIn: 'root',
})
export class JiraCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _jiraApiService: JiraApiService,
    private readonly _issueProviderService: IssueProviderService,
  ) {}

  pollTimer$: Observable<number> = timer(JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL);

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
      map((cfg) => this.isEnabled(cfg) && cfg.isAutoPollTickets),
    );
  }

  isEnabled(cfg: JiraCfg): boolean {
    return isJiraEnabled(cfg);
  }

  // NOTE: we're using the issueKey instead of the real issueId
  getById$(issueId: string | number, issueProviderId: string): Observable<JiraIssue> {
    return this._getCfgOnce$(issueProviderId).pipe(
      switchMap((jiraCfg) =>
        this._jiraApiService.getIssueById$(issueId as string, jiraCfg),
      ),
    );
  }

  // NOTE: this gives back issueKey instead of issueId
  searchIssues$(
    searchTerm: string,
    issueProviderId: string,
  ): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId).pipe(
      tap((v) => console.log('settings', v)),
      switchMap((jiraCfg) =>
        this.isEnabled(jiraCfg) && jiraCfg.isEnabled
          ? this._jiraApiService
              .issuePicker$(searchTerm, jiraCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: JiraIssue;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId) {
      throw new Error('No issueProviderId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.issueProviderId).toPromise();
    const issue = (await this._jiraApiService
      .getIssueById$(task.issueId, cfg)
      .toPromise()) as JiraIssue;

    // @see https://developer.atlassian.com/cloud/jira/platform/jira-expressions-type-reference/#date
    const newUpdated = new Date(issue.updated).getTime();
    const wasUpdated = newUpdated > (task.issueLastUpdated || 0);

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: issue.key,
      };
    }
    return null;
  }

  async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: JiraIssue }[]> {
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

  getAddTaskData(issue: JiraIssueReduced): Partial<Task> & { title: string } {
    return {
      title: `${issue.key} ${issue.summary}`,
      issuePoints: issue.storyPoints,
      // circumvent errors for old jira versions #652
      issueAttachmentNr: issue.attachments ? issue.attachments.length : 0,
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updated).getTime(),
    };
  }

  issueLink$(issueId: string | number, issueProviderId: string): Observable<string> {
    if (!issueId || !issueProviderId) {
      throw new Error('No issueId or no issueProviderId');
    }
    // const isIssueKey = isNaN(Number(issueId));
    return this._getCfgOnce$(issueProviderId).pipe(
      first(),
      map((jiraCfg) => jiraCfg.host + '/browse/' + issueId),
    );
  }

  async getNewIssuesToAddToBacklog(
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<JiraIssueReduced[]> {
    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    return await this._jiraApiService.findAutoImportIssues$(cfg).toPromise();
  }

  getMappedAttachments(issueData: JiraIssue): TaskAttachment[] {
    return issueData?.attachments?.length
      ? issueData.attachments.map(mapJiraAttachmentToAttachment)
      : [];
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderJira> {
    console.log('getCfgOnce$', issueProviderId);
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'JIRA');
  }
}
