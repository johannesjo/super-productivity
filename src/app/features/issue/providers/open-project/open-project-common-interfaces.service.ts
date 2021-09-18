import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { catchError, concatMap, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { OpenProjectApiService } from './open-project-api.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { OpenProjectCfg } from './open-project.model';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './open-project-issue/open-project-issue.model';
import { truncate } from '../../../../util/truncate';
import { T } from '../../../../t.const';

@Injectable({
  providedIn: 'root',
})
export class OpenProjectCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _openProjectApiService: OpenProjectApiService,
    private readonly _projectService: ProjectService,
    private readonly _snackService: SnackService,
  ) {}

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

  async getFreshDataForIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<{ taskChanges: Partial<Task>; issue: OpenProjectWorkPackage } | null> {
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

    if (wasUpdated && isNotifySuccess) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: this._formatIssueTitleForSnack(issue.id, issue.subject),
        },
        msg: T.F.OPEN_PROJECT.S.ISSUE_UPDATE,
      });
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        msg: T.F.OPEN_PROJECT.S.ISSUE_NO_UPDATE_REQUIRED,
        ico: 'cloud_download',
      });
    }

    if (wasUpdated) {
      return {
        taskChanges: {
          ...this.getAddTaskData(issue),
          issueWasUpdated: true,
        },
        issue,
      };
    }
    return null;
  }

  getAddTaskData(
    issue: OpenProjectWorkPackageReduced,
  ): Partial<Task> & { title: string } {
    const parsedEstimate: number =
      typeof issue.estimatedTime === 'string'
        ? +issue.estimatedTime.replace('PT', '').replace('H', '') * 60 * 60 * 1000
        : 0;

    return {
      title: this._formatIssueTitle(issue.id, issue.subject),
      issuePoints: issue.storyPoints,
      issueWasUpdated: false,
      // NOTE: we use Date.now() instead to because updated does not account for comments
      issueLastUpdated: new Date(issue.updatedAt).getTime(),
      ...(parsedEstimate > 0 ? { timeEstimate: parsedEstimate } : {}),
    };
  }

  private _formatIssueTitle(id: number, subject: string): string {
    return `#${id} ${subject}`;
  }

  private _formatIssueTitleForSnack(id: number, title: string): string {
    return `${truncate(this._formatIssueTitle(id, title))}`;
  }

  private _getCfgOnce$(projectId: string): Observable<OpenProjectCfg> {
    return this._projectService.getOpenProjectCfgForProject$(projectId).pipe(first());
  }
}
