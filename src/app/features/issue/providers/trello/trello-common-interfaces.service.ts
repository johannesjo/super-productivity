/**
 * Service for trello
 */

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { first, map, switchMap, tap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { TrelloApiService } from './trello-api.service';
import { IssueProviderTrello, SearchResultItem } from '../../issue.model';
import { TrelloIssue, TrelloIssueReduced } from './trello-issue.model';
import { TaskAttachment } from '../../../tasks/task-attachment/task-attachment.model';
// import { mapJiraAttachmentToAttachment } from './jira-issue-map.util';
import { TrelloCfg } from './trello.model';
import { isTrelloEnabled } from './is-trello-enabled.util';
import { IssueProviderService } from '../../issue-provider.service';
import { assertTruthy } from '../../../../util/assert-truthy';
import { IssueLog } from '../../../../core/log';
import { TRELLO_POLL_INTERVAL } from './trello.const';

@Injectable({
  providedIn: 'root',
})
export class TrelloCommonInterfacesService implements IssueServiceInterface {
  // trello service interval
  private readonly _trelloApiService = inject(TrelloApiService);
  private readonly _issueProviderService = inject(IssueProviderService);

  pollInterval: number = TRELLO_POLL_INTERVAL;

  isEnabled(cfg: TrelloCfg): boolean {
    return isTrelloEnabled(cfg);
  }

  testConnection(cfg: JiraCfg): Promise<boolean> {
    return this._trelloApiService
      .issuePicker$('', cfg)
      .pipe(
        map((res) => Array.isArray(res)),
        first(),
      )
      .toPromise()
      .then((result) => result ?? false);
  }

  // NOTE: we're using the issueKey instead of the real issueId
  getById(issueId: string | number, issueProviderId: string): Promise<TrelloIssue> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((jiraCfg) =>
          this._trelloApiService.getIssueById$(assertTruthy(issueId).toString(), jiraCfg),
        ),
      )
      .toPromise()
      .then((result) => {
        if (!result) {
          throw new Error('Failed to get Jira issue');
        }
        return result;
      });
  }

  // NOTE: this gives back issueKey instead of issueId
  searchIssues(searchTerm: string, issueProviderId: string): Promise<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((jiraCfg) =>
          this.isEnabled(jiraCfg)
            ? this._trelloApiService
                .issuePicker$(searchTerm, jiraCfg)
                .pipe(tap((v) => IssueLog.log('jira.issuePicker$', v)))
            : of([]),
        ),
      )
      .toPromise()
      .then((result) => result ?? []);
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: TrelloIssue;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId) {
      throw new Error('No issueProviderId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.issueProviderId).toPromise();
    const issue = (await this._trelloApiService
      .getIssueById$(task.issueId, cfg)
      .toPromise()) as TrelloIssue;

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
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: TrelloIssue }[]> {
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

  getAddTaskData(issue: TrelloIssueReduced): Partial<Task> & { title: string } {
    return {
      title: `${issue.key} ${issue.summary}`,
      issuePoints: issue.storyPoints,
      // circumvent errors for old jira versions #652
      issueAttachmentNr: issue.attachments ? issue.attachments.length : 0,
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updated).getTime(),
    };
  }

  issueLink(issueId: string | number, issueProviderId: string): Promise<string> {
    if (!issueId || !issueProviderId) {
      throw new Error('No issueId or no issueProviderId');
    }
    // const isIssueKey = isNaN(Number(issueId));
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        first(),
        map((jiraCfg) => jiraCfg.host + '/browse/' + issueId),
      )
      .toPromise()
      .then((result) => result ?? '');
  }

  async getNewIssuesToAddToBacklog(
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<TrelloIssueReduced[]> {
    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    return await this._trelloApiService.findAutoImportIssues$(cfg).toPromise();
  }

  getMappedAttachments(issueData: TrelloIssue): TaskAttachment[] {
    return issueData?.attachments?.length
      ? issueData.attachments.map(mapJiraAttachmentToAttachment)
      : [];
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderTrello> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'JIRA');
  }
}
