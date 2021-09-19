import { Injectable } from '@angular/core';
import {
  IssueData,
  IssueDataReduced,
  IssueProviderKey,
  SearchResultItem,
} from './issue.model';
import { TaskAttachment } from '../tasks/task-attachment/task-attachment.model';
import { from, merge, Observable, of, Subject, zip } from 'rxjs';
import {
  CALDAV_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  ISSUE_PROVIDER_HUMANIZED,
  issueProviderIconMap,
  JIRA_TYPE,
  OPEN_PROJECT_TYPE,
} from './issue.const';
import { TaskService } from '../tasks/task.service';
import { Task } from '../tasks/task.model';
import { IssueServiceInterface } from './issue-service-interface';
import { JiraCommonInterfacesService } from './providers/jira/jira-common-interfaces.service';
import { GithubCommonInterfacesService } from './providers/github/github-common-interfaces.service';
import { switchMap } from 'rxjs/operators';
import { GitlabCommonInterfacesService } from './providers/gitlab/gitlab-common-interfaces.service';
import { CaldavCommonInterfacesService } from './providers/caldav/caldav-common-interfaces.service';
import { OpenProjectCommonInterfacesService } from './providers/open-project/open-project-common-interfaces.service';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  ISSUE_SERVICE_MAP: { [key: string]: IssueServiceInterface } = {
    [GITLAB_TYPE]: this._gitlabCommonInterfacesService,
    [GITHUB_TYPE]: this._githubCommonInterfacesService,
    [JIRA_TYPE]: this._jiraCommonInterfacesService,
    [CALDAV_TYPE]: this._caldavCommonInterfaceService,
    [OPEN_PROJECT_TYPE]: this._openProjectInterfaceService,
  };

  // NOTE: in theory we might need to clean this up on project change, but it's unlikely to matter
  ISSUE_REFRESH_MAP: { [key: string]: { [key: string]: Subject<IssueData> } } = {
    [GITLAB_TYPE]: {},
    [GITHUB_TYPE]: {},
    [JIRA_TYPE]: {},
    [CALDAV_TYPE]: {},
    [OPEN_PROJECT_TYPE]: {},
  };

  constructor(
    private _taskService: TaskService,
    private _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private _githubCommonInterfacesService: GithubCommonInterfacesService,
    private _gitlabCommonInterfacesService: GitlabCommonInterfacesService,
    private _caldavCommonInterfaceService: CaldavCommonInterfacesService,
    private _openProjectInterfaceService: OpenProjectCommonInterfacesService,
    private _snackService: SnackService,
    private _translateService: TranslateService,
  ) {}

  getById$(
    issueType: IssueProviderKey,
    id: string | number,
    projectId: string,
  ): Observable<IssueData> {
    // account for issue refreshment
    if (!this.ISSUE_REFRESH_MAP[issueType][id]) {
      this.ISSUE_REFRESH_MAP[issueType][id] = new Subject<IssueData>();
    }
    return this.ISSUE_SERVICE_MAP[issueType]
      .getById$(id, projectId)
      .pipe(
        switchMap((issue) =>
          merge<IssueData>(of(issue), this.ISSUE_REFRESH_MAP[issueType][id]),
        ),
      );
  }

  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    const obs = Object.keys(this.ISSUE_SERVICE_MAP)
      .map((key) => this.ISSUE_SERVICE_MAP[key])
      .filter((provider) => typeof provider.searchIssues$ === 'function')
      .map((provider) => (provider.searchIssues$ as any)(searchTerm, projectId));
    obs.unshift(from([[]]));

    return zip(...obs, (...allResults: any[]) => [].concat(...allResults)) as Observable<
      SearchResultItem[]
    >;
  }

  issueLink$(
    issueType: IssueProviderKey,
    issueId: string | number,
    projectId: string,
  ): Observable<string> {
    return this.ISSUE_SERVICE_MAP[issueType].issueLink$(issueId, projectId);
  }

  getMappedAttachments(
    issueType: IssueProviderKey,
    issueDataIN: IssueData,
  ): TaskAttachment[] {
    if (!this.ISSUE_SERVICE_MAP[issueType].getMappedAttachments) {
      return [];
    }
    return (this.ISSUE_SERVICE_MAP[issueType].getMappedAttachments as any)(issueDataIN);
  }

  async checkAndImportNewIssuesToBacklogForProject(
    issuesType: IssueProviderKey,
    projectId: string,
  ): Promise<void> {
    if (!this.ISSUE_SERVICE_MAP[issuesType].getNewIssuesToAddToBacklog) {
      return;
    }
    const allExistingIssueIds: string[] | number[] =
      await this._taskService.getAllIssueIdsForProject(projectId, issuesType);

    const potentialIssuesToAdd = await (
      this.ISSUE_SERVICE_MAP[issuesType] as any
    ).getNewIssuesToAddToBacklog(projectId, allExistingIssueIds);

    const issuesToAdd: IssueDataReduced[] = potentialIssuesToAdd.filter(
      (issue: IssueData): boolean =>
        !(allExistingIssueIds as string[]).includes(issue.id as string),
    );

    issuesToAdd.forEach((issue: IssueDataReduced) => {
      this.addTaskWithIssue(issuesType, issue, projectId, true);
    });

    if (issuesToAdd.length === 1) {
      const issueTitle = this.ISSUE_SERVICE_MAP[issuesType].getAddTaskData(
        issuesToAdd[0],
      ).title;
      this._snackService.open({
        svgIco: issueProviderIconMap[issuesType as IssueProviderKey],
        // ico: 'cloud_download',
        msg: T.F.ISSUE.S.IMPORTED_SINGLE_ISSUE,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[issuesType as IssueProviderKey],
          // TODO add open project case
          issueStr: this._translateService.instant(T.F.ISSUE.DEFAULT.ISSUE_STR),
          issueTitle,
        },
      });
    } else if (issuesToAdd.length > 1) {
      this._snackService.open({
        svgIco: issueProviderIconMap[issuesType as IssueProviderKey],
        // ico: 'cloud_download',
        msg: T.F.ISSUE.S.IMPORTED_MULTIPLE_ISSUES,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[issuesType as IssueProviderKey],
          // TODO add open project case
          issuesStr: this._translateService.instant(T.F.ISSUE.DEFAULT.ISSUES_STR),
          nr: issuesToAdd.length,
        },
      });
    }
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<void> {
    const { issueId, issueType, projectId } = task;

    if (!issueId || !issueType || !projectId) {
      throw new Error('No issue task');
    }
    if (!this.ISSUE_SERVICE_MAP[issueType].getFreshDataForIssueTask) {
      throw new Error('Issue method not available');
    }

    const update = await (
      this.ISSUE_SERVICE_MAP[issueType].getFreshDataForIssueTask as any
    )(task, isNotifySuccess, isNotifyNoUpdateRequired);

    if (update) {
      if (this.ISSUE_REFRESH_MAP[issueType][issueId]) {
        this.ISSUE_REFRESH_MAP[issueType][issueId].next(update.issue);
      }
      this._taskService.update(task.id, update.taskChanges);

      if (isNotifySuccess) {
        this._snackService.open({
          svgIco: issueProviderIconMap[issueType],
          msg: T.F.ISSUE.S.ISSUE_UPDATE_SINGLE,
          translateParams: {
            issueProviderName: ISSUE_PROVIDER_HUMANIZED[issueType],
            // TODO add open project case
            issueStr: this._translateService.instant(T.F.ISSUE.DEFAULT.ISSUE_STR),
            issueTitle: update.issueTitle,
          },
        });
      }
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        svgIco: issueProviderIconMap[issueType],
        msg: T.F.ISSUE.S.ISSUE_NO_UPDATE_REQUIRED,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[issueType],
        },
      });
    }
  }

  async refreshIssues(tasks: Task[]): Promise<void> {
    // dynamic map that has a list of tasks for every entry where the entry is an issue type
    const tasksIssueIdsByIssueType: any = {};
    const tasksWithoutIssueId = [];

    for (const task of tasks) {
      if (!task.issueId || !task.issueType) {
        tasksWithoutIssueId.push(task);
      } else if (!tasksIssueIdsByIssueType[task.issueType]) {
        tasksIssueIdsByIssueType[task.issueType] = [];
        tasksIssueIdsByIssueType[task.issueType].push(task);
      } else {
        tasksIssueIdsByIssueType[task.issueType].push(task);
      }
    }

    for (const issuesType of Object.keys(tasksIssueIdsByIssueType)) {
      this._snackService.open({
        svgIco: issueProviderIconMap[issuesType as IssueProviderKey],
        msg: T.F.ISSUE.S.POLLING,
        isSpinner: true,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[issuesType as IssueProviderKey],
          // TODO add open project case Work Packages
          issuesStr: this._translateService.instant(T.F.ISSUE.DEFAULT.ISSUES_STR),
        },
      });

      const updates: {
        task: Task;
        taskChanges: Partial<Task>;
        issue: IssueData;
      }[] = await // TODO export fn to type instead
      (this.ISSUE_SERVICE_MAP[issuesType].getFreshDataForIssueTasks as any)(
        tasksIssueIdsByIssueType[issuesType],
      );

      if (updates.length > 0) {
        for (const update of updates) {
          if (this.ISSUE_REFRESH_MAP[issuesType][update.task.issueId as string]) {
            this.ISSUE_REFRESH_MAP[issuesType][update.task.issueId as string].next(
              update.issue,
            );
          }
          this._taskService.update(update.task.id, update.taskChanges);
        }

        if (updates.length === 1) {
          this._snackService.open({
            svgIco: issueProviderIconMap[issuesType as IssueProviderKey],
            msg: T.F.ISSUE.S.ISSUE_UPDATE_SINGLE,
            translateParams: {
              issueProviderName: ISSUE_PROVIDER_HUMANIZED[issuesType as IssueProviderKey],
              // TODO add open project case Work Packages
              issueStr: this._translateService.instant(T.F.ISSUE.DEFAULT.ISSUE_STR),
              issueTitle: updates[0].taskChanges.title || updates[0].task.title,
            },
          });
        } else if (updates.length > 1) {
          this._snackService.open({
            svgIco: issueProviderIconMap[issuesType as IssueProviderKey],
            msg: T.F.ISSUE.S.ISSUE_UPDATE_MULTIPLE,
            translateParams: {
              issueProviderName: ISSUE_PROVIDER_HUMANIZED[issuesType as IssueProviderKey],
              // TODO add open project case Work Packages
              issuesStr: this._translateService.instant(T.F.ISSUE.DEFAULT.ISSUES_STR),
              nr: updates.length,
            },
          });
        }
      }
    }

    for (const taskWithoutIssueId of tasksWithoutIssueId) {
      throw new Error('No issue task ' + taskWithoutIssueId.id);
    }
  }

  async addTaskWithIssue(
    issueType: IssueProviderKey,
    issueIdOrData: string | number | IssueDataReduced,
    projectId: string,
    isAddToBacklog: boolean = false,
  ): Promise<string> {
    if (!this.ISSUE_SERVICE_MAP[issueType].getAddTaskData) {
      throw new Error('Issue method not available');
    }
    const { issueId, issueData } =
      typeof issueIdOrData === 'number' || typeof issueIdOrData === 'string'
        ? {
            issueId: issueIdOrData,
            issueData: await this.ISSUE_SERVICE_MAP[issueType]
              .getById$(issueIdOrData, projectId)
              .toPromise(),
          }
        : {
            issueId: issueIdOrData.id,
            issueData: issueIdOrData,
          };

    const { title = null, ...additionalFields } =
      this.ISSUE_SERVICE_MAP[issueType].getAddTaskData(issueData);

    return this._taskService.add(title, isAddToBacklog, {
      issueType,
      issueId: issueId as string,
      issueWasUpdated: false,
      issueLastUpdated: Date.now(),
      ...additionalFields,
      // this is very important as chances are we are in another context already when adding!
      projectId,
    });
  }
}
