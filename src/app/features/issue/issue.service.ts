import { Injectable } from '@angular/core';
import { IssueData, IssueProviderKey, SearchResultItem } from './issue';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { Attachment } from '../attachment/attachment.model';
import { JiraApiService } from './jira/jira-api.service';
import { GithubApiService } from './github/github-api.service';
import { combineLatest, from, Observable, zip } from 'rxjs';
import { ProjectService } from '../project/project.service';
import { catchError, map, switchMap } from 'rxjs/operators';
import { JiraIssueService } from './jira/jira-issue/jira-issue.service';
import { GithubIssueService } from './github/github-issue/github-issue.service';
import { GITHUB_TYPE, JIRA_TYPE } from './issue.const';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  public isJiraSearchEnabled$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled)
  );

  public isGithubSearchEnabled$: Observable<boolean> = this._projectService.currentGithubCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.isSearchIssuesFromGithub)
  );

  constructor(
    private _jiraApiService: JiraApiService,
    private _gitApiService: GithubApiService,
    private _jiraIssueService: JiraIssueService,
    private _gitIssueService: GithubIssueService,
    private _projectService: ProjectService,
  ) {
  }


  public async loadStatesForProject(projectId) {
    return Promise.all([
      this._jiraIssueService.loadStateForProject(projectId),
      this._gitIssueService.loadStateForProject(projectId),
    ]);
  }


  public searchIssues(searchTerm: string): Observable<SearchResultItem[]> {
    return combineLatest(
      this.isJiraSearchEnabled$,
      this.isGithubSearchEnabled$,
    ).pipe(
      switchMap(([isSearchJira, isSearchGithub]) => {
        const obs = [];
        obs.push(from([[]]));

        if (isSearchJira) {
          obs.push(
            this._jiraApiService.issuePicker(searchTerm)
              .pipe(
                catchError(() => {
                  return [];
                })
              )
          );
        }

        if (isSearchGithub) {
          obs.push(this._gitApiService.searchIssueForRepo(searchTerm));
        }

        return zip(...obs, (...allResults) => [].concat(...allResults)) as Observable<SearchResultItem[]>;
      })
    );
  }

  public refreshIssue(
    issueType: IssueProviderKey,
    issueId: string | number,
    issueData: IssueData,
    isNotifySuccess = true,
    isNotifyNoUpdateRequired = false
  ) {
    switch (issueType) {
      case JIRA_TYPE: {
        this._jiraIssueService.updateIssueFromApi(issueId, issueData, isNotifySuccess, isNotifyNoUpdateRequired);
        break;
      }
      case GITHUB_TYPE: {
        this._gitIssueService.updateIssueFromApi(issueId);
      }
    }
  }

  public getMappedAttachments(issueType: IssueProviderKey, issueData_: IssueData): Attachment[] {
    switch (issueType) {
      case JIRA_TYPE: {
        const issueData = issueData_ as JiraIssue;
        return this._jiraIssueService.getMappedAttachmentsFromIssue(issueData);
      }
    }
  }
}
