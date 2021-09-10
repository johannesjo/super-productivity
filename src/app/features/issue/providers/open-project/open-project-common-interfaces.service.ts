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

  async refreshIssue(
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
    //
    // const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    // const issue = await this._openProjectApiService
    //   .getById$(+task.issueId, cfg)
    //   .toPromise();
    //
    // // const issueUpdate: number = new Date(issue.updated_at).getTime();
    // const filterUserName = cfg.filterUsername && cfg.filterUsername.toLowerCase();
    // const commentsByOthers =
    //   filterUserName && filterUserName.length > 1
    //     ? issue.comments.filter(
    //         (comment) => comment.user.login.toLowerCase() !== cfg.filterUsername,
    //       )
    //     : issue.comments;
    //
    // // TODO: we also need to handle the case when the user himself updated the issue, to also update the issue...
    // const updates: number[] = [
    //   ...commentsByOthers.map((comment) => new Date(comment.created_at).getTime()),
    //   // todo check if this can be re-implemented
    //   // issueUpdate
    // ].sort();
    // const lastRemoteUpdate = updates[updates.length - 1];
    //
    // const wasUpdated = lastRemoteUpdate > (task.issueLastUpdated || 0);
    //
    // // console.log('---------openProject issue update debugging--------');
    // // console.log('wasUpdated', wasUpdated, ' lastRemoteUpdate', lastRemoteUpdate, 'task.issueLastUpdated', task.issueLastUpdated);
    // // console.log(commentsByOthers, updates);
    // // console.log('cfg', cfg);
    // // console.log('issue', issue);
    // // console.log('--------end-------');
    //
    // if (wasUpdated && isNotifySuccess) {
    //   this._snackService.open({
    //     ico: 'cloud_download',
    //     translateParams: {
    //       issueText: this._formatIssueTitleForSnack(issue.number, issue.title),
    //     },
    //     msg: T.F.OPEN_PROJECT.S.ISSUE_UPDATE,
    //   });
    // } else if (isNotifyNoUpdateRequired) {
    //   this._snackService.open({
    //     msg: T.F.OPEN_PROJECT.S.ISSUE_NO_UPDATE_REQUIRED,
    //     ico: 'cloud_download',
    //   });
    // }
    //
    // if (wasUpdated) {
    //   return {
    //     taskChanges: {
    //       issueWasUpdated: true,
    //       issueLastUpdated: lastRemoteUpdate,
    //       title: `#${issue.number} ${issue.title}`,
    //     },
    //     issue,
    //   };
    // }
    return null;
  }

  getAddTaskData(issue: OpenProjectWorkPackageReduced): {
    title: string;
    additionalFields: Partial<Task>;
  } {
    console.log(issue);

    return {
      title: this._formatIssueTitle(issue.id, issue.subject),
      additionalFields: {
        issuePoints: issue.storyPoints,
        issueWasUpdated: false,
        // NOTE: we use Date.now() instead to because updated does not account for comments
        issueLastUpdated: new Date(issue.updatedAt).getTime(),
      },
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
