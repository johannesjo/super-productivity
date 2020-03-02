import {Injectable} from '@angular/core';
import {IssueData, IssueProviderKey, SearchResultItem} from './issue.model';
import {Attachment} from '../attachment/attachment.model';
import {from, Observable, of, zip} from 'rxjs';
import {ProjectService} from '../project/project.service';
import {GITHUB_TYPE, JIRA_TYPE} from './issue.const';
import {TaskService} from '../tasks/task.service';
import {Task} from '../tasks/task.model';
import {IssueServiceInterface} from './issue-service-interface';
import {JiraCommonInterfacesService} from './jira/jira-common-interfaces.service';
import {GithubCommonInterfacesService} from './github/github-common-interfaces.service';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  ISSUE_SERVICE_MAP: { [key: string]: IssueServiceInterface } = {
    [GITHUB_TYPE]: this._githubCommonInterfacesService,
    [JIRA_TYPE]: this._jiraCommonInterfacesService
  };

  constructor(
    private _projectService: ProjectService,
    private _taskService: TaskService,
    private _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private _githubCommonInterfacesService: GithubCommonInterfacesService,
  ) {
  }

  getById$(issueType: IssueProviderKey, id: string | number): Observable<IssueData> {
    if (typeof this.ISSUE_SERVICE_MAP[issueType].getById$ === 'function') {
      return this.ISSUE_SERVICE_MAP[issueType].getById$(id);
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
        this._taskService.update(task.id, update);
      }
    }
  }

  async addTaskWithIssue(
    issueType: IssueProviderKey,
    issueId: string | number,
    isAddToBacklog = false
  ) {
    const {title, additionalFields} = this.ISSUE_SERVICE_MAP[issueType].getAddTaskData
      ? await this.ISSUE_SERVICE_MAP[issueType].getAddTaskData(issueId)
      : {
        title: null,
        additionalFields: {}
      };

    this._taskService.add(title, isAddToBacklog, {
      issueType,
      issueId: (issueId as string),
      ...additionalFields,
    });
  }
}
