import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { ProjectService } from 'src/app/features/project/project.service';
import { TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { REDMINE_INITIAL_POLL_DELAY, REDMINE_POLL_INTERVAL } from './redmine.const';
import { RedmineCfg } from './redmine.model';
import { isRedmineEnabled } from './is-redmine-enabled.util';

@Injectable({
  providedIn: 'root',
})
export class RedmineCommonInterfacesService implements IssueServiceInterface {
  constructor(private readonly _projectService: ProjectService) {}

  isEnabled(cfg: RedmineCfg): boolean {
    return isRedmineEnabled(cfg);
  }

  isBacklogPollingEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => this.isEnabled(cfg) && cfg.isAutoAddToBacklog),
    );
  }

  isIssueRefreshEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    throw new Error('Method not implemented.');
  }

  pollTimer$: Observable<number> = timer(
    REDMINE_INITIAL_POLL_DELAY,
    REDMINE_POLL_INTERVAL,
  );

  issueLink$(issueId: number, projectId: string): Observable<string> {
    throw new Error('Method not implemented.');
  }

  getById$(id: number, projectId: string): Observable<IssueData> {
    throw new Error('Method not implemented.');
  }

  getAddTaskData(
    issueData: IssueDataReduced,
  ): Partial<Readonly<TaskCopy>> & { title: string } {
    throw new Error('Method not implemented.');
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    throw new Error('Method not implemented.');
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
    throw new Error('Method not implemented.');
  }

  private _getCfgOnce$(projectId: string): Observable<RedmineCfg> {
    return this._projectService.getRedmineCfgForProject$(projectId).pipe(first());
  }
}
