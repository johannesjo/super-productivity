import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { OpenProjectApiService } from './open-project-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { OpenProjectCfg } from './open-project.model';
import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './open-project-issue/open-project-issue.model';
import { isOpenProjectEnabled } from './is-open-project-enabled.util';
import {
  OPEN_PROJECT_INITIAL_POLL_DELAY,
  OPEN_PROJECT_POLL_INTERVAL,
} from './open-project.const';
import { parseOpenProjectDuration } from './open-project-view-components/parse-open-project-duration.util';
import {
  formatOpenProjectWorkPackageSubject,
  formatOpenProjectWorkPackageSubjectForSnack,
} from './format-open-project-work-package-subject.util';

@Injectable({
  providedIn: 'root',
})
export class OpenProjectCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _openProjectApiService: OpenProjectApiService,
    private readonly _projectService: ProjectService,
  ) {}

  pollTimer$: Observable<number> = timer(
    OPEN_PROJECT_INITIAL_POLL_DELAY,
    OPEN_PROJECT_POLL_INTERVAL,
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

  isEnabled(cfg: OpenProjectCfg): boolean {
    return isOpenProjectEnabled(cfg);
  }

  issueLink$(issueId: number, projectId: string): Observable<string> {
    return this._getCfgOnce$(projectId).pipe(
      map((cfg) => `${cfg.host}/projects/${cfg.projectId}/work_packages/${issueId}`),
    );
  }

  getById$(issueId: number, projectId: string): Observable<OpenProjectWorkPackage> {
    return this._getCfgOnce$(projectId).pipe(
      concatMap((openProjectCfg) =>
        this._openProjectApiService.getById$(issueId, openProjectCfg),
      ),
    );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((openProjectCfg) =>
        openProjectCfg && openProjectCfg.isSearchIssuesFromOpenProject
          ? this._openProjectApiService
              .searchIssueForRepo$(searchTerm, openProjectCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async getFreshDataForIssueTask(task: Task): Promise<{
    taskChanges: Partial<Task>;
    issue: OpenProjectWorkPackage;
    issueTitle: string;
  } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }
    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._openProjectApiService
      .getById$(+task.issueId, cfg)
      .toPromise();

    const lastRemoteUpdate = new Date(issue.updatedAt).getTime();
    const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
        issueTitle: formatOpenProjectWorkPackageSubjectForSnack(issue),
      };
    }
    return null;
  }

  async getFreshDataForIssueTasks(
    tasks: Task[],
  ): Promise<
    { task: Task; taskChanges: Partial<Task>; issue: OpenProjectWorkPackage }[]
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

  getAddTaskData(
    issue: OpenProjectWorkPackageReduced,
  ): Partial<Task> & { title: string } {
    const parsedEstimate: number = parseOpenProjectDuration(
      issue.estimatedTime as string | number | null,
    );

    return {
      title: formatOpenProjectWorkPackageSubject(issue),
      issuePoints: issue.storyPoints,
      issueWasUpdated: false,
      // NOTE: we use Date.now() instead to because updated does not account for comments
      issueLastUpdated: new Date(issue.updatedAt).getTime(),
      ...(parsedEstimate > 0 ? { timeEstimate: parsedEstimate } : {}),
    };
  }

  async getNewIssuesToAddToBacklog(
    projectId: string,
    allExistingIssueIds: number[] | string[],
  ): Promise<OpenProjectWorkPackageReduced[]> {
    const cfg = await this._getCfgOnce$(projectId).toPromise();
    console.log(
      await this._openProjectApiService
        .getLast100WorkPackagesForCurrentOpenProjectProject$(cfg)
        .toPromise(),
    );

    return await this._openProjectApiService
      .getLast100WorkPackagesForCurrentOpenProjectProject$(cfg)
      .toPromise();
  }

  private _getCfgOnce$(projectId: string): Observable<OpenProjectCfg> {
    return this._projectService.getOpenProjectCfgForProject$(projectId).pipe(first());
  }
}
