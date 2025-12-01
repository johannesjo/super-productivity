import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';
import { Task, TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import {
  IssueData,
  IssueDataReduced,
  IssueProviderGitea,
  SearchResultItem,
} from '../../issue.model';
import { GITEA_POLL_INTERVAL } from './gitea.const';
import {
  formatGiteaIssueTitle,
  formatGiteaIssueTitleForSnack,
} from './format-gitea-issue-title.util';
import { GiteaCfg } from './gitea.model';
import { isGiteaEnabled } from './is-gitea-enabled.util';
import { GiteaApiService } from '../gitea/gitea-api.service';
import { GiteaIssue } from './gitea-issue.model';
import { IssueProviderService } from '../../issue-provider.service';

@Injectable({
  providedIn: 'root',
})
export class GiteaCommonInterfacesService implements IssueServiceInterface {
  private readonly _giteaApiService = inject(GiteaApiService);
  private readonly _issueProviderService = inject(IssueProviderService);

  pollInterval: number = GITEA_POLL_INTERVAL;

  isEnabled(cfg: GiteaCfg): boolean {
    return isGiteaEnabled(cfg);
  }

  testConnection(cfg: GiteaCfg): Promise<boolean> {
    return this._giteaApiService
      .searchIssueForRepo$('', cfg)
      .pipe(
        map((res) => Array.isArray(res)),
        first(),
      )
      .toPromise()
      .then((result) => result ?? false);
  }

  issueLink(issueNumber: string | number, issueProviderId: string): Promise<string> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(map((cfg) => `${cfg.host}/${cfg.repoFullname}/issues/${issueNumber}`))
      .toPromise()
      .then((result) => result ?? '');
  }

  getById(id: string | number, issueProviderId: string): Promise<IssueData> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((giteaCfg: GiteaCfg) =>
          this._giteaApiService.getById$(id as number, giteaCfg),
        ),
      )
      .toPromise()
      .then((result) => {
        if (!result) {
          throw new Error('Failed to get Gitea issue');
        }
        return result;
      });
  }

  getAddTaskData(issue: GiteaIssue): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: formatGiteaIssueTitle(issue),
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updated_at).getTime(),
    };
  }

  searchIssues(searchTerm: string, issueProviderId: string): Promise<SearchResultItem[]> {
    return this._getCfgOnce$(issueProviderId)
      .pipe(
        switchMap((giteaCfg) =>
          this.isEnabled(giteaCfg)
            ? this._giteaApiService.searchIssueForRepo$(searchTerm, giteaCfg)
            : of([]),
        ),
      )
      .toPromise()
      .then((result) => result ?? []);
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: GiteaIssue;
    issueTitle: string;
  } | null> {
    if (!task.issueProviderId) {
      throw new Error('No issueProviderId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }
    const cfg = await this._getCfgOnce$(task.issueProviderId).toPromise();
    const issue = await this._giteaApiService.getById$(+task.issueId, cfg).toPromise();

    const lastRemoteUpdate = new Date(issue.updated_at).getTime();
    const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: formatGiteaIssueTitleForSnack(issue),
      };
    }
    return null;
  }

  async getFreshDataForIssueTasks(tasks: Task[]): Promise<
    {
      task: Task;
      taskChanges: Partial<Task>;
      issue: GiteaIssue;
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

  async getNewIssuesToAddToBacklog?(
    issueProviderId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueDataReduced[]> {
    const cfg = await this._getCfgOnce$(issueProviderId).toPromise();
    return await this._giteaApiService.getLast100IssuesFor$(cfg).toPromise();
  }

  private _getCfgOnce$(issueProviderId: string): Observable<IssueProviderGitea> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'GITEA');
  }
}
