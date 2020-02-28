import {Injectable} from '@angular/core';
import {IssueData, IssueProviderKey, SearchResultItem} from './issue';
import {JiraIssue} from './jira/jira-issue/jira-issue.model';
import {Attachment} from '../attachment/attachment.model';
import {JiraApiService} from './jira/jira-api.service';
import {GithubApiService} from './github/github-api.service';
import {combineLatest, from, Observable, zip} from 'rxjs';
import {ProjectService} from '../project/project.service';
import {catchError, map, switchMap} from 'rxjs/operators';
import {JiraIssueService} from './jira/jira-issue/jira-issue.service';
import {GITHUB_TYPE, JIRA_TYPE} from './issue.const';
import {TaskService} from '../tasks/task.service';
import {Task} from '../tasks/task.model';
import {JiraCfg} from './jira/jira';
import {GithubCfg} from './github/github';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  public isJiraSearchEnabled$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled)
  );
  jiraCfg: JiraCfg;

  public isGithubSearchEnabled$: Observable<boolean> = this._projectService.currentGithubCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.isSearchIssuesFromGithub)
  );
  githubCfg: GithubCfg;


  constructor(
    private _jiraApiService: JiraApiService,
    private _gitApiService: GithubApiService,
    private _jiraIssueService: JiraIssueService,
    // private _gitIssueService: GithubIssueService,
    private _projectService: ProjectService,
    private _taskService: TaskService,
  ) {
    this._projectService.currentJiraCfg$.subscribe((jiraCfg) => this.jiraCfg = jiraCfg);
    this._projectService.currentGithubCfg$.subscribe((githubCfg) => this.githubCfg = githubCfg);
  }


  public async loadStatesForProject(projectId) {
    return Promise.all([
      // this._jiraIssueService.loadStateForProject(projectId),
      // this._gitIssueService.loadStateForProject(projectId),
    ]);
  }


  public searchIssues$(searchTerm: string): Observable<SearchResultItem[]> {
    return combineLatest([
      this.isJiraSearchEnabled$,
      this.isGithubSearchEnabled$,
    ]).pipe(
      switchMap(([isSearchJira, isSearchGithub]) => {
        const obs = [];
        obs.push(from([[]]));

        if (isSearchJira) {
          obs.push(
            this._jiraApiService.issuePicker$(searchTerm)
              .pipe(
                catchError(() => {
                  return [];
                })
              )
          );
        }

        if (isSearchGithub) {
          obs.push(this._gitApiService.searchIssueForRepo$(searchTerm));
        }

        return zip(...obs, (...allResults) => [].concat(...allResults)) as Observable<SearchResultItem[]>;
      })
    );
  }

  public refreshIssue(
    task: Task,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ) {
    switch (task.issueType) {
      case JIRA_TYPE: {
        // TODO fix
        this._jiraIssueService.updateIssueFromApi(task, isNotifySuccess, isNotifyNoUpdateRequired);
        break;
      }
      case GITHUB_TYPE: {
        // TODO implement
        console.warn('NOT IMPLEMENTED');
        // this._gitIssueService.updateIssueFromApi(issueId);
      }
    }
  }

  public async addTaskWithIssue(
    issueType: IssueProviderKey,
    issueData: IssueData,
    isAddToBacklog = false
  ) {

    let title: string;
    let additionalFields: Partial<Task> = {};

    switch (issueType) {
      case JIRA_TYPE: {
        // NOTE we need to reload, because we need to get the story points etc
        // TODO load additional data afterwards to speed up process
        const issue = await this._jiraApiService.getIssueById$(issueData.id).toPromise();
        title = issue.summary;
        additionalFields = {
          issuePoints: issue.storyPoints,
          issueAttachmentNr: issue.attachments ? issue.attachments.length : 0,
          issueWasUpdated: false,
          issueLastUpdated: new Date(issue.updated).getTime()
        };
        break;
      }
      case GITHUB_TYPE: {
        // TODO implement
        console.warn('NOT IMPLEMENTED');
        // this._gitIssueService.updateIssueFromApi(issueId);
      }
    }

    this._taskService.add(title, isAddToBacklog, {
      issueType,
      issueId: (issueData.id as string),
      ...additionalFields,
    });
  }

  public getMappedAttachments(issueType: IssueProviderKey, issueDataIN: IssueData): Attachment[] {
    switch (issueType) {
      case JIRA_TYPE: {
        const issueData = issueDataIN as JiraIssue;
        return this._jiraIssueService.getMappedAttachmentsFromIssue(issueData);
      }
    }
  }

  public issueLink(issueType: IssueProviderKey, issueId: string | number): string {
    switch (issueType) {
      case JIRA_TYPE: {
        return this.jiraCfg.host + '/browse/' + issueId;
      }
      case GITHUB_TYPE: {
        return `https://github.com/${this.githubCfg.repo}/issues/${issueId}`;
      }
    }
  }
}
