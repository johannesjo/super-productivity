import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { SearchResultItem } from '../../issue.model';
import { CaldavIssue, CaldavIssueReduced } from './caldav-issue/caldav-issue.model';
import { CaldavClientService } from './caldav-client.service';
import { CaldavCfg } from './caldav.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { ProjectService } from '../../../project/project.service';
import { truncate } from '../../../../util/truncate';
import { isCaldavEnabled } from './is-caldav-enabled.util';
import { CALDAV_INITIAL_POLL_DELAY, CALDAV_POLL_INTERVAL } from './caldav.const';

@Injectable({
  providedIn: 'root',
})
export class CaldavCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _projectService: ProjectService,
    private readonly _caldavClientService: CaldavClientService,
  ) {}

  private static _formatIssueTitleForSnack(title: string): string {
    return truncate(title);
  }

  pollTimer$: Observable<number> = timer(CALDAV_INITIAL_POLL_DELAY, CALDAV_POLL_INTERVAL);

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

  isEnabled(cfg: CaldavCfg): boolean {
    return isCaldavEnabled(cfg);
  }

  getAddTaskData(issueData: CaldavIssueReduced): Partial<Task> & { title: string } {
    return {
      issueLastUpdated: issueData.etag_hash,
      title: issueData.summary,
    };
  }

  getById$(id: string | number, projectId: string): Observable<CaldavIssue> {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((caldavCfg) => this._caldavClientService.getById$(id, caldavCfg)),
    );
  }

  issueLink$(issueId: string | number, projectId: string): Observable<string> {
    return of('');
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: CaldavIssue;
    issueTitle: string;
  } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
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
    const projectId = tasks && tasks[0].projectId ? tasks[0].projectId : 0;
    if (!projectId) {
      throw new Error('No projectId');
    }

    const cfg = await this._getCfgOnce$(projectId).toPromise();
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

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((caldavCfg) =>
        this.isEnabled(caldavCfg) && caldavCfg.isSearchIssuesFromCaldav
          ? this._caldavClientService
              .searchOpenTasks$(searchTerm, caldavCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<CaldavIssueReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    return await this._caldavClientService.getOpenTasks$(cfg).toPromise();
  }

  private _getCfgOnce$(projectId: string): Observable<CaldavCfg> {
    return this._projectService.getCaldavCfgForProject$(projectId).pipe(first());
  }
}
