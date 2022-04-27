import { Injectable } from '@angular/core';
import { EMPTY, Observable, timer } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';
import { ProjectService } from 'src/app/features/project/project.service';
import { TaskAttachmentCopy } from '../../../tasks/task-attachment/task-attachment.model';
import { TaskCopy } from '../../../tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { IssueData, IssueDataReduced, SearchResultItem } from '../../issue.model';
import { GITEA_INITIAL_POLL_DELAY, GITEA_POLL_INTERVAL } from './gitea.const';
import { GiteaCfg } from './gitea.model';
import { isGiteaEnabled } from './is-gitea-enabled.util';
import { GiteaApiService } from '../gitea/gitea-api.service';
import { GiteaIssue } from './gitea-issue/gitea-issue.model';

@Injectable({
  providedIn: 'root',
})
export class GiteaCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _giteaApiService: GiteaApiService,
    private readonly _projectService: ProjectService,
  ) {}

  isEnabled(cfg: GiteaCfg): boolean {
    return isGiteaEnabled(cfg);
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

  pollTimer$: Observable<number> = timer(GITEA_INITIAL_POLL_DELAY, GITEA_POLL_INTERVAL);

  issueLink$(issueId: string | number, projectId: string): Observable<string> {
    //TODO fix url
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => `${cfg.host}/hugaleno/${cfg.projectId}/issues/${issueId}`),
    );
  }
  getById$(id: string | number, projectId: string): Observable<IssueData> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((giteaCfg: GiteaCfg) =>
        this._giteaApiService.getById$(id as number, giteaCfg),
      ),
    );
  }
  getAddTaskData(issue: GiteaIssue): Partial<Readonly<TaskCopy>> & { title: string } {
    return {
      title: `#${issue.id} ${issue.title}`,
      issueWasUpdated: false,
      issueLastUpdated: new Date(issue.updated_at).getTime(),
    };
  }
  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    throw new Error('Method not implemented.');
    // return this._getCfgOnce$(projectId).pipe(
    //   switchMap((giteaCfg) =>
    //     this.isEnabled(giteaCfg) && giteaCfg.isSearchIssuesFromOpenGitea
    //       ? this._giteaApiService
    //           .searchIssueForRepo$(searchTerm, giteaCfg)
    //           .pipe(catchError(() => []))
    //       : of([]),
    //   ),
    // );
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

  async getNewIssuesToAddToBacklog?(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<IssueDataReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    return await this._giteaApiService
      .getLast100IssuesForCurrentGiteaProject$(cfg)
      .toPromise();
  }

  private _getCfgOnce$(projectId: string): Observable<GiteaCfg> {
    return this._projectService.getGiteaCfgForProject$(projectId).pipe(first());
  }
}
