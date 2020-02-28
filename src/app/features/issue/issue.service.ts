import {Injectable} from '@angular/core';
import {IssueData, IssueProviderKey, SearchResultItem} from './issue.model';
import {Attachment} from '../attachment/attachment.model';
import {from, Observable, zip} from 'rxjs';
import {ProjectService} from '../project/project.service';
import {JiraIssueService} from './jira/jira-issue/jira-issue.service';
import {GITHUB_TYPE, JIRA_TYPE} from './issue.const';
import {TaskService} from '../tasks/task.service';
import {Task} from '../tasks/task.model';
import {GithubCfg} from './github/github';
import {IssueServiceInterface} from './issue-service-interface';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  ISSUE_SERVICE_MAP: { [key: string]: IssueServiceInterface } = {
    [GITHUB_TYPE]: this._jiraIssueService,
    [JIRA_TYPE]: this._jiraIssueService
  };

  // TODO remove
  githubCfg: GithubCfg;


  constructor(
    private _jiraIssueService: JiraIssueService,
    // private _gitIssueService: GithubIssueService,
    private _projectService: ProjectService,
    private _taskService: TaskService,
  ) {
    this._projectService.currentGithubCfg$.subscribe((githubCfg) => this.githubCfg = githubCfg);
  }


  public searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    const obs = Object.keys(this.ISSUE_SERVICE_MAP)
      .map(key => this.ISSUE_SERVICE_MAP[key])
      .filter(provider => typeof provider.searchIssues$ === 'function')
      .map(provider => provider.searchIssues$(searchTerm));
    obs.unshift(from([[]]));

    return zip(...obs, (...allResults) => [].concat(...allResults)) as Observable<SearchResultItem[]>;
  }

  public refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ): void {
    if (typeof this.ISSUE_SERVICE_MAP[task.issueType].refreshIssue === 'function') {
      this.ISSUE_SERVICE_MAP[task.issueType].refreshIssue(task, isNotifySuccess, isNotifyNoUpdateRequired);
    }
    //   case GITHUB_TYPE: {
    //     // TODO implement
    //     console.warn('NOT IMPLEMENTED');
    //     // this._gitIssueService.updateIssueFromApi(issueId);
    //   }
  }

  public getMappedAttachments(issueType: IssueProviderKey, issueDataIN: IssueData): Attachment[] {
    if (typeof this.ISSUE_SERVICE_MAP[issueType].getMappedAttachments === 'function') {
      return this.ISSUE_SERVICE_MAP[issueType].getMappedAttachments(issueDataIN);
    }
  }

  public issueLink(issueType: IssueProviderKey, issueId: string | number): string {
    if (typeof this.ISSUE_SERVICE_MAP[issueType].issueLink === 'function') {
      return this.ISSUE_SERVICE_MAP[issueType].issueLink(issueId);
    }
    //     // TODO implement
    // GITHUB_TYPE: {
    //   return `https://github.com/${this.githubCfg.repo}/issues/${issueId}`;
    // }
  }

  public async addTaskWithIssue(
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
