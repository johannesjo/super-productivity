import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { ProjectService } from 'src/app/features/project/project.service';
import { TaskAttachmentCopy } from '../../../tasks/task-attachment/task-attachment.model';
import { TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { GITEA_INITIAL_POLL_DELAY, GITEA_POLL_INTERVAL } from './gitea.const';
import { GiteaCfg } from './gitea.model';
import { isGiteaEnabled } from './is-gitea-enabled.util';

@Injectable({
  providedIn: 'root',
})
export class GiteaCommonInterfacesService implements IssueServiceInterface {
  constructor(private readonly _projectService: ProjectService) {}

  isEnabled(cfg: GiteaCfg): boolean {
    return isGiteaEnabled(cfg);
  }
  isBacklogPollingEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => this.isEnabled(cfg) && cfg.isAutoAddToBacklog),
    );
  }
  isIssueRefreshEnabledForProjectOnce$(projectId: string): Observable<boolean> {
    throw new Error('Method not implemented.');
  }
  pollTimer$: Observable<number> = timer(GITEA_INITIAL_POLL_DELAY, GITEA_POLL_INTERVAL);

  issueLink$(issueId: string | number, projectId: string): Observable<string> {
    throw new Error('Method not implemented.');
  }
  getById$(id: string | number, projectId: string): Observable<IssueData> {
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
  }> {
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
  getMappedAttachments?(issueData: IssueData): Readonly<TaskAttachmentCopy>[] {
    throw new Error('Method not implemented.');
  }
  getNewIssuesToAddToBacklog?(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueDataReduced[]> {
    throw new Error('Method not implemented.');
  }

  private _getCfgOnce$(projectId: string): Observable<GiteaCfg> {
    return this._projectService.getGiteaCfgForProject$(projectId).pipe(first());
  }
}
