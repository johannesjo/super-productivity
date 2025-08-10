import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IssueTask, Task } from 'src/app/features/tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueProviderCaldav, SearchResultItem } from '../../issue.model';
import { CaldavIssue, CaldavIssueReduced } from './caldav-issue.model';
import { CaldavClientService } from './caldav-client.service';
import { CaldavCfg } from './caldav.model';
import { concatMap, first, map, switchMap } from 'rxjs/operators';
import { truncate } from '../../../../util/truncate';
import { isCaldavEnabled } from './is-caldav-enabled.util';
import { CALDAV_POLL_INTERVAL } from './caldav.const';
import { IssueProviderService } from '../../issue-provider.service';

@Injectable({
  providedIn: 'root',
})
export class CaldavCommonInterfacesService implements IssueServiceInterface {
  private readonly _issueProviderService = inject(IssueProviderService);
  private readonly _caldavClientService = inject(CaldavClientService);

  private static _formatIssueTitleForSnack(title: string): string {
    return truncate(title);
  }

  pollInterval: number = CALDAV_POLL_INTERVAL;

  isEnabled(cfg: CaldavCfg): boolean {
    return isCaldavEnabled(cfg);
  }

  testConnection(cfg: CaldavCfg): Promise<boolean> {
    return this._caldavClientService
      .searchOpenTasks$('', cfg)
      .pipe(
        map((res) => Array.isArray(res)),
        first(),
      )
      .toPromise()
      .then((result) => result ?? false);
  }

  getAddTaskData(issueData: CaldavIssue): IssueTask {
    return {
      title: issueData.summary,
      issueLastUpdated: issueData.etag_hash,
      notes: issueData.note,
      dueWithTime: issueData.start,
      related_to: issueData.related_to,
    };
  }

  getById(id: string | number, issueProviderId: string): Promise<CaldavIssue> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(concatMap((caldavCfg) => this._caldavClientService.getById$(id, caldavCfg)))
      .toPromise()
      .then((result) => {
        if (!result) {
          throw new Error('Failed to get CalDAV issue');
        }
        return result;
      });
  }

  issueLink(issueId: string | number, issueProviderId: string): Promise<string> {
    return Promise.resolve('');
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: CaldavIssue;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId) {
      throw new Error('No issueProviderId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.issueProviderId).toPromise();
    const issue = await this._caldavClientService.getById$(task.issueId, cfg).toPromise();

    const wasUpdated = issue.etag_hash !== task.issueLastUpdated;

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: CaldavCommonInterfacesService._formatIssueTitleForSnack(
          issue.summary,
        ),
      };
    }
    return null;
  }

  async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: CaldavIssue }[]> {
    // First sort the tasks by the issueId
    // because the API returns it in a desc order by issue iid(issueId)
    // so it makes the update check easier and faster
    const issueProviderId =
      tasks && tasks[0].issueProviderId ? tasks[0].issueProviderId : 0;
    if (!issueProviderId) {
      throw new Error('No issueProviderId');
    }

    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    const issues: CaldavIssue[] = await this._caldavClientService
      .getByIds$(
        tasks.map((t) => t.id),
        cfg,
      )
      .toPromise();
    const issueMap = new Map(issues.map((item) => [item.id, item]));

    return tasks
      .filter(
        (task) =>
          issueMap.has(task.id) &&
          issueMap.get(task.id)?.etag_hash !== task.issueLastUpdated,
      )
      .map((task) => {
        const issue = issueMap.get(task.id) as CaldavIssue;
        return {
          task,
          taskChanges: {
            ...this.getAddTaskData(issue),
            issueWasUpdated: true,
          },
          issue,
        };
      });
  }

  searchIssues(searchTerm: string, issueProviderId: string): Promise<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((caldavCfg) =>
          this.isEnabled(caldavCfg)
            ? this._caldavClientService.searchOpenTasks$(searchTerm, caldavCfg)
            : of([]),
        ),
      )
      .toPromise()
      .then((result) => result ?? []);
  }

  async getNewIssuesToAddToBacklog(
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<CaldavIssueReduced[]> {
    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    return await this._caldavClientService.getOpenTasks$(cfg).toPromise();
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderCaldav> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'CALDAV');
  }
}
