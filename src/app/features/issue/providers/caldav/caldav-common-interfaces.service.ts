import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from 'src/app/features/tasks/task.model';
import { IssueServiceInterface } from '../../issue-service-interface';
import { SearchResultItem } from '../../issue.model';
import { CaldavIssue, CaldavIssueReduced } from './caldav-issue/caldav-issue.model';
import { CaldavClientService } from './caldav-client.service';
import { CaldavCfg } from './caldav.model';
import { catchError, concatMap, first, switchMap } from 'rxjs/operators';
import { ProjectService } from '../../../project/project.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { truncate } from '../../../../util/truncate';
import { T } from '../../../../t.const';

@Injectable({
  providedIn: 'root',
})
export class CaldavCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _projectService: ProjectService,
    private readonly _caldavClientService: CaldavClientService,
    private readonly _snackService: SnackService,
  ) {}

  private static _formatIssueTitleForSnack(title: string): string {
    return truncate(title);
  }

  getAddTaskData(issueData: CaldavIssueReduced): {
    title: string;
    additionalFields: Partial<Task>;
  } {
    return {
      additionalFields: { issueLastUpdated: issueData.etag_hash },
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

  async refreshIssue(
    task: Task,
    isNotifySuccess: boolean,
    isNotifyNoUpdateRequired: boolean,
  ): Promise<{ taskChanges: Partial<Task>; issue: CaldavIssue } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = await this._caldavClientService.getById$(task.issueId, cfg).toPromise();

    const wasUpdated = issue.etag_hash !== task.issueLastUpdated;

    if (wasUpdated && isNotifySuccess) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: CaldavCommonInterfacesService._formatIssueTitleForSnack(
            issue.summary,
          ),
        },
        msg: T.F.CALDAV.S.ISSUE_UPDATE,
      });
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        msg: T.F.CALDAV.S.ISSUE_NO_UPDATE_REQUIRED,
        ico: 'cloud_download',
      });
    }

    if (wasUpdated) {
      return {
        taskChanges: {
          issueWasUpdated: true,
          issueLastUpdated: issue.etag_hash,
          title: issue.summary,
        },
        issue,
      };
    }
    return null;
  }

  async refreshIssues(
    tasks: Task[],
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
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

    if (isNotifyNoUpdateRequired) {
      tasks
        .filter(
          (task) =>
            issueMap.has(task.id) &&
            issueMap.get(task.id)?.etag_hash === task.issueLastUpdated,
        )
        .forEach((_) =>
          this._snackService.open({
            msg: T.F.CALDAV.S.ISSUE_NO_UPDATE_REQUIRED,
            ico: 'cloud_download',
          }),
        );
    }

    return tasks
      .filter(
        (task) =>
          issueMap.has(task.id) &&
          issueMap.get(task.id)?.etag_hash !== task.issueLastUpdated,
      )
      .map((task) => {
        const issue = issueMap.get(task.id) as CaldavIssue;
        if (isNotifySuccess) {
          this._snackService.open({
            ico: 'cloud_download',
            translateParams: {
              issueText: CaldavCommonInterfacesService._formatIssueTitleForSnack(
                issue.summary,
              ),
            },
            msg: T.F.CALDAV.S.ISSUE_UPDATE,
          });
        }
        return {
          task,
          taskChanges: {
            issueWasUpdated: true,
            issueLastUpdated: issue.etag_hash,
            title: issue.summary,
          },
          issue,
        };
      });
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((caldavCfg) =>
        caldavCfg && caldavCfg.isSearchIssuesFromCaldav
          ? this._caldavClientService
              .searchOpenTasks$(searchTerm, caldavCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  private _getCfgOnce$(projectId: string): Observable<CaldavCfg> {
    return this._projectService.getCaldavCfgForProject$(projectId).pipe(first());
  }
}
