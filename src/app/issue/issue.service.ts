import { Injectable } from '@angular/core';
import { IssueData, IssueProviderKey, SearchResultItem } from './issue';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { Attachment } from '../attachment/attachment.model';
import { JiraApiService } from './jira/jira-api.service';
import { GitApiService } from './git/git-api.service';
import { combineLatest, from, Observable, zip } from 'rxjs';
import { ProjectService } from '../project/project.service';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { JiraIssueService } from './jira/jira-issue/jira-issue.service';
import { GitIssueService } from './git/git-issue/git-issue.service';
import { GIT_TYPE, JIRA_TYPE } from './issue.const';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  public isJiraSearchEnabled$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled)
  );
  public isJiraAddToBacklog$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isAutoAddToBacklog)
  );


  public isGitSearchEnabled$: Observable<boolean> = this._projectService.currentGitCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.isSearchIssuesFromGit)
  );
  public isGitAddToBacklog$: Observable<boolean> = this._projectService.currentGitCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.isAutoAddToBacklog)
  );
  public isGitRefreshIssueData$: Observable<boolean> = this._projectService.currentGitCfg$.pipe(
    map(gitCfg => gitCfg && (gitCfg.isSearchIssuesFromGit || gitCfg.isAutoAddToBacklog || gitCfg.isAutoPoll))
  );

  constructor(
    private _jiraApiService: JiraApiService,
    private _gitApiService: GitApiService,
    private _jiraIssueService: JiraIssueService,
    private _gitIssueService: GitIssueService,
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
      this.isGitSearchEnabled$,
    ).pipe(
      switchMap(([isSearchJira, isSearchGit]) => {
        const obs = [];
        obs.push(from([[]]));

        if (isSearchJira) {
          obs.push(
            this._jiraApiService.search(searchTerm, false, 50)
              .pipe(
                catchError(() => {
                  return [];
                })
              )
          );
        }

        if (isSearchGit) {
          obs.push(this._gitApiService.searchIssueForRepo(searchTerm));
        }

        return zip(...obs, (...allResults) => [].concat(...allResults));
      })
    );
  }


  public refreshIssue(issueType: IssueProviderKey, issueId: string | number, issueData: IssueData) {
    switch (issueType) {
      case JIRA_TYPE: {
        this._jiraIssueService.updateIssueFromApi(issueId, issueData);
        break;
      }
      case GIT_TYPE: {
        this._gitIssueService.updateIssueFromApi(issueId);
      }
    }
  }

  public refreshIssueData() {
    this.isGitRefreshIssueData$.pipe(
      take(1),
    ).subscribe((isRefreshGit) => {
      if (isRefreshGit) {
        this._gitApiService.refreshIssuesCache();
      }
    });
  }

  public refreshBacklog() {
    console.log('REFRESH BACKLOG');

    this.isGitAddToBacklog$.pipe(
      take(1),
    ).subscribe((isGitAddToBacklog) => {

      if (isGitAddToBacklog) {
        this._gitIssueService.addOpenIssuesToBacklog();
      }
    });

    this.isJiraAddToBacklog$.pipe(
      take(1),
    ).subscribe((isJiraAddToBacklog) => {
      if (isJiraAddToBacklog) {
        this._jiraIssueService.addOpenIssuesToBacklog();
      }
    });
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
