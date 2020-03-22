import {Injectable} from '@angular/core';
import {IssueData, IssueDataReduced, IssueProviderKey, SearchResultItem} from './issue.model';
import {Attachment} from '../attachment/attachment.model';
import {from, merge, Observable, of, Subject, zip} from 'rxjs';
import {ProjectService} from '../project/project.service';
import {GITHUB_TYPE, JIRA_TYPE, GITLAB_TYPE} from './issue.const';
import {TaskService} from '../tasks/task.service';
import {Task} from '../tasks/task.model';
import {IssueServiceInterface} from './issue-service-interface';
import {JiraCommonInterfacesService} from './providers/jira/jira-common-interfaces.service';
import {GithubCommonInterfacesService} from './providers/github/github-common-interfaces.service';
import {switchMap} from 'rxjs/operators';
import { GitlabCommonInterfacesService } from './providers/gitlab/gitlab-common-interfaces.service';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  ISSUE_SERVICE_MAP: { [key: string]: IssueServiceInterface } = {
    [GITLAB_TYPE]: this._gitlabCommonInterfacesService,
    [GITHUB_TYPE]: this._githubCommonInterfacesService,
    [JIRA_TYPE]: this._jiraCommonInterfacesService
  };

  // NOTE: in theory we might need to clean this up on project change, but it's unlikely to matter
  ISSUE_REFRESH_MAP: { [key: string]: { [key: string]: Subject<IssueData> } } = {
    [GITLAB_TYPE]: {},
    [GITHUB_TYPE]: {},
    [JIRA_TYPE]: {}
  };

  constructor(
    private _projectService: ProjectService,
    private _taskService: TaskService,
    private _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private _githubCommonInterfacesService: GithubCommonInterfacesService,
    private _gitlabCommonInterfacesService: GitlabCommonInterfacesService,
  ) {
  }

  getById$(issueType: IssueProviderKey, id: string | number): Observable<IssueData> {
    if (typeof this.ISSUE_SERVICE_MAP[issueType].getById$ === 'function') {

      // account for issue refreshment
      if (this.ISSUE_SERVICE_MAP[issueType].refreshIssue) {
        if (!this.ISSUE_REFRESH_MAP[issueType][id]) {
          this.ISSUE_REFRESH_MAP[issueType][id] = new Subject<IssueData>();
        }
        return this.ISSUE_SERVICE_MAP[issueType].getById$(id).pipe(
          switchMap(issue => merge<IssueData>(
            of(issue),
            this.ISSUE_REFRESH_MAP[issueType][id],
            ),
          )
        );
      } else {
        return this.ISSUE_SERVICE_MAP[issueType].getById$(id);
      }
    }
    return of(null);
  }

  searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    const obs = Object.keys(this.ISSUE_SERVICE_MAP)
      .map(key => this.ISSUE_SERVICE_MAP[key])
      .filter(provider => typeof provider.searchIssues$ === 'function')
      .map(provider => provider.searchIssues$(searchTerm));
    obs.unshift(from([[]]));
    console.log(obs);

    return zip(...obs, (...allResults) => [].concat(...allResults)) as Observable<SearchResultItem[]>;
  }

  issueLink(issueType: IssueProviderKey, issueId: string | number): string {
    if (typeof this.ISSUE_SERVICE_MAP[issueType].issueLink === 'function') {
      return this.ISSUE_SERVICE_MAP[issueType].issueLink(issueId);
    }
  }

  getMappedAttachments(issueType: IssueProviderKey, issueDataIN: IssueData): Attachment[] {
    if (typeof this.ISSUE_SERVICE_MAP[issueType].getMappedAttachments === 'function') {
      return this.ISSUE_SERVICE_MAP[issueType].getMappedAttachments(issueDataIN);
    }
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ): Promise<void> {
    if (typeof this.ISSUE_SERVICE_MAP[task.issueType].refreshIssue === 'function') {
      const update = await this.ISSUE_SERVICE_MAP[task.issueType].refreshIssue(task, isNotifySuccess, isNotifyNoUpdateRequired);

      if (update) {
        if (this.ISSUE_SERVICE_MAP[task.issueType].getById$ && this.ISSUE_REFRESH_MAP[task.issueType][task.issueId]) {
          this.ISSUE_REFRESH_MAP[task.issueType][task.issueId].next(update.issue);
        }
        this._taskService.update(task.id, update.taskChanges);
      }
    }
  }

  async addTaskWithIssue(
    issueType: IssueProviderKey,
    issueIdOrData: string | number | IssueDataReduced,
    isAddToBacklog = false
  ) {
    if (this.ISSUE_SERVICE_MAP[issueType].getAddTaskData) {
      const {issueId, issueData} = (typeof issueIdOrData === 'number' || typeof issueIdOrData === 'string')
        ? {
          issueId: issueIdOrData,
          issueData: await this.ISSUE_SERVICE_MAP[issueType].getById$(issueIdOrData).toPromise()
        }
        : {
          issueId: issueIdOrData.id,
          issueData: issueIdOrData
        };

      const {title = null, additionalFields = {}} = this.ISSUE_SERVICE_MAP[issueType].getAddTaskData(issueData);

      this._taskService.add(title, isAddToBacklog, {
        issueType,
        issueId: (issueId as string),
        issueWasUpdated: false,
        issueLastUpdated: Date.now(),
        ...additionalFields,
      });
    }
  }
}
