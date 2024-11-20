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
  CALENDAR_TYPE,
  GITEA_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  ISSUE_PROVIDER_HUMANIZED,
  ISSUE_PROVIDER_ICON_MAP,
  ISSUE_STR_MAP,
  JIRA_TYPE,
  OPEN_PROJECT_TYPE,
  REDMINE_TYPE,
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
import { GiteaCommonInterfacesService } from './providers/gitea/gitea-common-interfaces.service';
import { RedmineCommonInterfacesService } from './providers/redmine/redmine-common-interfaces.service';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { CalendarCommonInterfacesService } from './providers/calendar/calendar-common-interfaces.service';

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
    [GITEA_TYPE]: this._giteaInterfaceService,
    [REDMINE_TYPE]: this._redmineInterfaceService,
    [CALENDAR_TYPE]: this._calendarCommonInterfaceService,
  };

  // NOTE: in theory we might need to clean this up on project change, but it's unlikely to matter
  ISSUE_REFRESH_MAP: { [key: string]: { [key: string]: Subject<IssueData> } } = {
    [GITLAB_TYPE]: {},
    [GITHUB_TYPE]: {},
    [REDMINE_TYPE]: {},
    [JIRA_TYPE]: {},
    [CALDAV_TYPE]: {},
    [OPEN_PROJECT_TYPE]: {},
    [GITEA_TYPE]: {},
    [REDMINE_TYPE]: {},
    [CALENDAR_TYPE]: {},
  };

  constructor(
    private _taskService: TaskService,
    private _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private _githubCommonInterfacesService: GithubCommonInterfacesService,
    private _gitlabCommonInterfacesService: GitlabCommonInterfacesService,
    private _caldavCommonInterfaceService: CaldavCommonInterfacesService,
    private _openProjectInterfaceService: OpenProjectCommonInterfacesService,
    private _giteaInterfaceService: GiteaCommonInterfacesService,
    private _redmineInterfaceService: RedmineCommonInterfacesService,
    private _calendarCommonInterfaceService: CalendarCommonInterfacesService,
    private _snackService: SnackService,
    private _translateService: TranslateService,
  ) {}

  getById$(
    issueType: IssueProviderKey,
    id: string | number,
    issueProviderId: string,
  ): Observable<IssueData> {
    // account for issue refreshment
    if (!this.ISSUE_REFRESH_MAP[issueType][id]) {
      this.ISSUE_REFRESH_MAP[issueType][id] = new Subject<IssueData>();
    }
    return this.ISSUE_SERVICE_MAP[issueType]
      .getById$(id, issueProviderId)
      .pipe(
        switchMap((issue) =>
          merge<IssueData>(of(issue), this.ISSUE_REFRESH_MAP[issueType][id]),
        ),
      );
  }

  searchIssues$(
    searchTerm: string,
    issueProviderId: string,
  ): Observable<SearchResultItem[]> {
    const obs = Object.keys(this.ISSUE_SERVICE_MAP)
      .map((key) => this.ISSUE_SERVICE_MAP[key])
      .filter((provider) => typeof provider.searchIssues$ === 'function')
      .map((provider) => (provider.searchIssues$ as any)(searchTerm, issueProviderId));
    obs.unshift(from([[]]));

    return zip(...obs, (...allResults: any[]) => [].concat(...allResults)) as Observable<
      SearchResultItem[]
    >;
  }

  issueLink$(
    issueType: IssueProviderKey,
    issueId: string | number,
    issueProviderId: string,
  ): Observable<string> {
    return this.ISSUE_SERVICE_MAP[issueType].issueLink$(issueId, issueProviderId);
  }

  isBacklogPollEnabledForProjectOnce$(
    providerKey: IssueProviderKey,
    issueProviderId: string,
  ): Observable<boolean> {
    return this.ISSUE_SERVICE_MAP[providerKey].isBacklogPollingEnabledForProjectOnce$(
      issueProviderId,
    );
  }

  isPollIssueChangesEnabledForProjectOnce$(
    providerKey: IssueProviderKey,
    issueProviderId: string,
  ): Observable<boolean> {
    return this.ISSUE_SERVICE_MAP[providerKey].isIssueRefreshEnabledForProjectOnce$(
      issueProviderId,
    );
  }

  getPollTimer$(providerKey: IssueProviderKey): Observable<number> {
    return this.ISSUE_SERVICE_MAP[providerKey].pollTimer$;
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
    providerKey: IssueProviderKey,
    issueProviderId: string,
  ): Promise<void> {
    if (!this.ISSUE_SERVICE_MAP[providerKey].getNewIssuesToAddToBacklog) {
      return;
    }
    this._snackService.open({
      svgIco: ISSUE_PROVIDER_ICON_MAP[providerKey],
      msg: T.F.ISSUE.S.POLLING_BACKLOG,
      isSpinner: true,
      translateParams: {
        issueProviderName: ISSUE_PROVIDER_HUMANIZED[providerKey],
        issuesStr: this._translateService.instant(ISSUE_STR_MAP[providerKey].ISSUES_STR),
      },
    });

    const allExistingIssueIds: string[] | number[] =
      await this._taskService.getAllIssueIdsForProject(issueProviderId, providerKey);

    const potentialIssuesToAdd = await (
      this.ISSUE_SERVICE_MAP[providerKey] as any
    ).getNewIssuesToAddToBacklog(issueProviderId, allExistingIssueIds);

    const issuesToAdd: IssueDataReduced[] = potentialIssuesToAdd.filter(
      (issue: IssueData): boolean =>
        !(allExistingIssueIds as string[]).includes(issue.id as string),
    );

    issuesToAdd.forEach((issue: IssueDataReduced) => {
      this.addTaskWithIssue(providerKey, issue, issueProviderId, true);
    });

    if (issuesToAdd.length === 1) {
      const issueTitle = this.ISSUE_SERVICE_MAP[providerKey].getAddTaskData(
        issuesToAdd[0],
      ).title;
      this._snackService.open({
        svgIco: ISSUE_PROVIDER_ICON_MAP[providerKey],
        // ico: 'cloud_download',
        msg: T.F.ISSUE.S.IMPORTED_SINGLE_ISSUE,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[providerKey],
          issueStr: this._translateService.instant(ISSUE_STR_MAP[providerKey].ISSUE_STR),
          issueTitle,
        },
      });
    } else if (issuesToAdd.length > 1) {
      this._snackService.open({
        svgIco: ISSUE_PROVIDER_ICON_MAP[providerKey],
        // ico: 'cloud_download',
        msg: T.F.ISSUE.S.IMPORTED_MULTIPLE_ISSUES,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[providerKey],
          issuesStr: this._translateService.instant(
            ISSUE_STR_MAP[providerKey].ISSUES_STR,
          ),
          nr: issuesToAdd.length,
        },
      });
    }
  }

  async refreshIssueTask(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<void> {
    const { issueId, issueType, issueProviderId } = task;

    if (!issueId || !issueType || !issueProviderId) {
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
          svgIco: ISSUE_PROVIDER_ICON_MAP[issueType],
          msg: T.F.ISSUE.S.ISSUE_UPDATE_SINGLE,
          translateParams: {
            issueProviderName: ISSUE_PROVIDER_HUMANIZED[issueType],
            issueStr: this._translateService.instant(ISSUE_STR_MAP[issueType].ISSUE_STR),
            issueTitle: update.issueTitle,
          },
        });
      }
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        svgIco: ISSUE_PROVIDER_ICON_MAP[issueType],
        msg: T.F.ISSUE.S.ISSUE_NO_UPDATE_REQUIRED,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[issueType],
        },
      });
    }
  }

  async refreshIssueTasks(tasks: Task[]): Promise<void> {
    // dynamic map that has a list of tasks for every entry where the entry is an issue type
    const tasksIssueIdsByIssueProviderKey: any = {};
    const tasksWithoutIssueId: Readonly<Task>[] = [];

    for (const task of tasks) {
      if (!task.issueId || !task.issueType) {
        tasksWithoutIssueId.push(task);
      } else if (!tasksIssueIdsByIssueProviderKey[task.issueType]) {
        tasksIssueIdsByIssueProviderKey[task.issueType] = [];
        tasksIssueIdsByIssueProviderKey[task.issueType].push(task);
      } else {
        tasksIssueIdsByIssueProviderKey[task.issueType].push(task);
      }
    }

    for (const pKey of Object.keys(tasksIssueIdsByIssueProviderKey)) {
      const providerKey = pKey as IssueProviderKey;
      console.log(
        'POLLING CHANGES FOR ' + providerKey,
        tasksIssueIdsByIssueProviderKey[providerKey],
      );
      this._snackService.open({
        svgIco: ISSUE_PROVIDER_ICON_MAP[providerKey],
        msg: T.F.ISSUE.S.POLLING_CHANGES,
        isSpinner: true,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[providerKey],
          issuesStr: this._translateService.instant(
            ISSUE_STR_MAP[providerKey].ISSUES_STR,
          ),
        },
      });

      const updates: {
        task: Task;
        taskChanges: Partial<Task>;
        issue: IssueData;
      }[] = await // TODO export fn to type instead
      (this.ISSUE_SERVICE_MAP[providerKey].getFreshDataForIssueTasks as any)(
        tasksIssueIdsByIssueProviderKey[providerKey],
      );

      if (updates.length > 0) {
        for (const update of updates) {
          if (this.ISSUE_REFRESH_MAP[providerKey][update.task.issueId as string]) {
            this.ISSUE_REFRESH_MAP[providerKey][update.task.issueId as string].next(
              update.issue,
            );
          }
          this._taskService.update(update.task.id, update.taskChanges);
        }

        if (updates.length === 1) {
          this._snackService.open({
            svgIco: ISSUE_PROVIDER_ICON_MAP[providerKey],
            msg: T.F.ISSUE.S.ISSUE_UPDATE_SINGLE,
            translateParams: {
              issueProviderName: ISSUE_PROVIDER_HUMANIZED[providerKey],
              issueStr: this._translateService.instant(
                ISSUE_STR_MAP[providerKey].ISSUE_STR,
              ),
              issueTitle: updates[0].taskChanges.title || updates[0].task.title,
            },
          });
        } else if (updates.length > 1) {
          this._snackService.open({
            svgIco: ISSUE_PROVIDER_ICON_MAP[providerKey],
            msg: T.F.ISSUE.S.ISSUE_UPDATE_MULTIPLE,
            translateParams: {
              issueProviderName: ISSUE_PROVIDER_HUMANIZED[providerKey],
              issuesStr: this._translateService.instant(
                ISSUE_STR_MAP[providerKey].ISSUES_STR,
              ),
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
    issueProviderId: string,
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
              .getById$(issueIdOrData, issueProviderId)
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
      issueProviderId,
      issueId: issueId as string,
      issueWasUpdated: false,
      issueLastUpdated: Date.now(),
      ...additionalFields,
    });
  }
}
