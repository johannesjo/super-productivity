import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';
import { ProjectService } from 'src/app/features/project/project.service';
import { TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { REDMINE_INITIAL_POLL_DELAY, REDMINE_POLL_INTERVAL } from './redmine.const';
import { RedmineCfg } from './redmine.model';
import { isRedmineEnabled } from './is-redmine-enabled.util';
import { RedmineApiService } from '../redmine/redmine-api.service';
import { RedmineIssue } from './redmine-issue/redmine-issue.model';

@Injectable({
  providedIn: 'root',
})
export class RedmineCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _redmineApiService: RedmineApiService,
    private readonly _projectService: ProjectService,
  ) {}

  isEnabled(cfg: RedmineCfg): boolean {
    return isRedmineEnabled(cfg);
  }

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

  pollTimer$: Observable<number> = timer(
    REDMINE_INITIAL_POLL_DELAY,
    REDMINE_POLL_INTERVAL,
  );

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => `${cfg.host}/issues/${issueId}`),
    );
  }

  getById$(id: number, projectId: string): Observable<IssueData> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((cfg: RedmineCfg) => this._redmineApiService.getById$(id as number, cfg)),
    );
  }

  getAddTaskData(issue: RedmineIssue): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: `#${issue.id} ${issue.subject}`,
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updated_on).getTime(),
    };
  }

  searchIssues$(query: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((cfg) =>
        this.isEnabled(cfg) && cfg.isSearchIssuesFromRedmine
          ? this._redmineApiService
              .searchIssuesInProject$(query, cfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  getFreshDataForIssueTask(task: Readonly<TaskCopy>): Promise<{
    taskChanges: Partial<Readonly<TaskCopy>>;
    issue: IssueData;
    issueTitle: string;
  } | null> {
    throw new Error('Method not implemented.');
  }

  getFreshDataForIssueTasks(tasks: Readonly<TaskCopy>[]): Promise<
    {
      task: Readonly<TaskCopy>;
      taskChanges: Partial<Readonly<TaskCopy>>;
      issue: IssueData;
    }[]
  > {
    throw new Error('Method not implemented.');
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[],
  ): Promise<IssueDataReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();

    return await this._redmineApiService
      .getLast100IssuesForCurrentRedmineProject$(cfg)
      .toPromise();
  }

  private _getCfgOnce$(projectId: string): Observable<RedmineCfg> {
    return this._projectService.getRedmineCfgForProject$(projectId).pipe(first());
  }
}
