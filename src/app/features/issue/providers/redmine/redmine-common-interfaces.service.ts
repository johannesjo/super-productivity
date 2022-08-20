import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';
import { ProjectService } from 'src/app/features/project/project.service';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { REDMINE_INITIAL_POLL_DELAY, REDMINE_POLL_INTERVAL } from './redmine.const';
import {
  formatRedmineIssueSubject,
  formatRedmineIssueSubjectForSnack,
} from './format-redmine-issue-subject.utils';
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
      title: formatRedmineIssueSubject(issue),
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

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: RedmineIssue;
    issueTitle: string;
  } | null> {
    if (!task.projectId) throw new Error('No projectId');
    if (!task.issueId) throw new Error('No issueId');

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._redmineApiService.getById$(+task.issueId, cfg).toPromise();
    const lastUpdateOn = new Date(issue.updated_on).getTime();
    const wasUpdated = lastUpdateOn > (task.issueLastUpdated || 0);

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: formatRedmineIssueSubjectForSnack(issue),
      };
    }

    return null;
  }

  async getFreshDataForIssueTasks(tasks: Task[]): Promise<
    {
      task: Readonly<Task>;
      taskChanges: Partial<Readonly<Task>>;
      issue: RedmineIssue;
    }[]
  > {
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
          if (!refreshDataForTask) throw new Error('No refresh data for task js error');

          return {
            task,
            taskChanges: refreshDataForTask.taskChanges,
            issue: refreshDataForTask.issue,
          };
        });
    });
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
