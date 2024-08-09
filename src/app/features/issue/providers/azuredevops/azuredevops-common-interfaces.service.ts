import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { AzuredevopsApiService } from './azuredevops-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { AzuredevopsCfg } from './azuredevops.model';
import {
  AzuredevopsIssue,
  AzuredevopsIssueReduced,
} from './azuredevops-issue/azuredevops-issue.model';
import { truncate } from '../../../../util/truncate';
import { getTimestamp } from '../../../../util/get-timestamp';
import { isAzuredevopsEnabled } from './is-azuredevops-enabled.util';
import {
  AZUREDEVOPS_INITIAL_POLL_DELAY,
  AZUREDEVOPS_POLL_INTERVAL,
} from './azuredevops.const';

@Injectable({
  providedIn: 'root',
})
export class AzuredevopsCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _azuredevopsApiService: AzuredevopsApiService,
    private readonly _projectService: ProjectService,
  ) {}

  pollTimer$: Observable<number> = timer(
    AZUREDEVOPS_INITIAL_POLL_DELAY,
    AZUREDEVOPS_POLL_INTERVAL,
  );

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

  isEnabled(cfg: AzuredevopsCfg): boolean {
    return isAzuredevopsEnabled(cfg);
  }

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => `https://azuredevops.com/${cfg.organization}/issues/${issueId}`),
    );
  }

  getById$(issueId: number, projectId: string): Observable<AzuredevopsIssue> {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((azuredevopsCfg) =>
        this._azuredevopsApiService.getById$(issueId, azuredevopsCfg),
      ),
    );
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: AzuredevopsIssue;
    issueTitle: string;
  } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._azuredevopsApiService
      .getById$(+task.issueId, cfg)
      .toPromise();

    const wasUpdated = getTimestamp(issue.updated_at) > (task.issueLastUpdated || 0);

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

  async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<{ task: Task; taskChanges: Partial<Task>; issue: AzuredevopsIssue }[]> {
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

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return of([]);
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<AzuredevopsIssueReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    return await this._azuredevopsApiService
      .getImportToBacklogIssuesFromWIQL(cfg)
      .toPromise();
  }

  getAddTaskData(issue: AzuredevopsIssueReduced): Partial<Task> & { title: string } {
    return {
      title: this._formatIssueTitle(issue.id, issue.title),
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

  private _getCfgOnce$(projectId: string): Observable<AzuredevopsCfg> {
    return this._projectService.getAzuredevopsCfgForProject$(projectId).pipe(first());
  }

  private _isIssueDone(issue: AzuredevopsIssueReduced): boolean {
    return issue.state === 'closed';
  }
}
