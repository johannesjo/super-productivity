import { Injectable } from '@angular/core';
import {
  IssueData,
  IssueDataReduced,
  IssueProviderKey,
  SearchResultItem,
} from './issue.model';
import { TaskAttachment } from '../tasks/task-attachment/task-attachment.model';
import { from, merge, Observable, of, Subject, zip } from 'rxjs';
import { CALDAV_TYPE, GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from './issue.const';
import { TaskService } from '../tasks/task.service';
import { Task } from '../tasks/task.model';
import { IssueServiceInterface } from './issue-service-interface';
import { JiraCommonInterfacesService } from './providers/jira/jira-common-interfaces.service';
import { GithubCommonInterfacesService } from './providers/github/github-common-interfaces.service';
import { switchMap } from 'rxjs/operators';
import { GitlabCommonInterfacesService } from './providers/gitlab/gitlab-common-interfaces.service';
import { CaldavCommonInterfacesService } from './providers/caldav/caldav-common-interfaces.service';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  ISSUE_SERVICE_MAP: { [key: string]: IssueServiceInterface } = {
    [GITLAB_TYPE]: this._gitlabCommonInterfacesService,
    [GITHUB_TYPE]: this._githubCommonInterfacesService,
    [JIRA_TYPE]: this._jiraCommonInterfacesService,
    [CALDAV_TYPE]: this._caldavCommonInterfaceService,
  };

  // NOTE: in theory we might need to clean this up on project change, but it's unlikely to matter
  ISSUE_REFRESH_MAP: { [key: string]: { [key: string]: Subject<IssueData> } } = {
    [GITLAB_TYPE]: {},
    [GITHUB_TYPE]: {},
    [JIRA_TYPE]: {},
    [CALDAV_TYPE]: {},
  };

  constructor(
    private _taskService: TaskService,
    private _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private _githubCommonInterfacesService: GithubCommonInterfacesService,
    private _gitlabCommonInterfacesService: GitlabCommonInterfacesService,
    private _caldavCommonInterfaceService: CaldavCommonInterfacesService,
  ) {}

  getById$(
    issueType: IssueProviderKey,
    id: string | number,
    projectId: string,
  ): Observable<IssueData> {
    // account for issue refreshment
    if (this.ISSUE_SERVICE_MAP[issueType].refreshIssue) {
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
    } else {
      return this.ISSUE_SERVICE_MAP[issueType].getById$(id, projectId);
    }
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

  async refreshIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<void> {
    if (!task.issueId || !task.issueType) {
      throw new Error('No issue task');
    }
    if (!this.ISSUE_SERVICE_MAP[task.issueType].refreshIssue) {
      throw new Error('Issue method not available');
    }

    const update = await (this.ISSUE_SERVICE_MAP[task.issueType].refreshIssue as any)(
      task,
      isNotifySuccess,
      isNotifyNoUpdateRequired,
    );
    if (update) {
      if (this.ISSUE_REFRESH_MAP[task.issueType][task.issueId]) {
        this.ISSUE_REFRESH_MAP[task.issueType][task.issueId].next(update.issue);
      }
      this._taskService.update(task.id, update.taskChanges);
    }
  }

  async refreshIssues(
    tasks: Task[],
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<void> {
    // dynamic map that has a list of tasks for every entry where the entry is an issue type
    const tasksIssueIdsByIssueType: any = {};
    const tasksWithoutIssueId = [];
    const tasksWithoutMethod = [];

    for (const task of tasks) {
      if (!task.issueId || !task.issueType) {
        tasksWithoutIssueId.push(task);
      } else if (!this.ISSUE_SERVICE_MAP[task.issueType].refreshIssues) {
        tasksWithoutMethod.push(task);
      } else if (!tasksIssueIdsByIssueType[task.issueType]) {
        tasksIssueIdsByIssueType[task.issueType] = [];
        tasksIssueIdsByIssueType[task.issueType].push(task);
      } else {
        tasksIssueIdsByIssueType[task.issueType].push(task);
      }
    }

    for (const issuesType of Object.keys(tasksIssueIdsByIssueType)) {
      const updates = await (this.ISSUE_SERVICE_MAP[issuesType].refreshIssues as any)(
        tasksIssueIdsByIssueType[issuesType],
        isNotifySuccess,
        isNotifyNoUpdateRequired,
      );
      if (updates) {
        for (const update of updates) {
          if (this.ISSUE_REFRESH_MAP[issuesType][update.task.issueId]) {
            this.ISSUE_REFRESH_MAP[issuesType][update.task.issueId].next(update.issue);
          }
          this._taskService.update(update.task.id, update.taskChanges);
        }
      }
    }

    for (const taskWithoutIssueId of tasksWithoutIssueId) {
      throw new Error('No issue task ' + taskWithoutIssueId.id);
    }
    for (const taskWithoutMethod of tasksWithoutMethod) {
      throw new Error('Issue method not available ' + taskWithoutMethod);
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

    const { title = null, additionalFields = {} } =
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
