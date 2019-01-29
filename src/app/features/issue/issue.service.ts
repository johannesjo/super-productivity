import {Injectable} from '@angular/core';
import {IssueData, IssueProviderKey, SearchResultItem} from './issue';
import {JiraIssue} from './jira/jira-issue/jira-issue.model';
import {Attachment} from '../attachment/attachment.model';
import {JiraApiService} from './jira/jira-api.service';
import {GitApiService} from './git/git-api.service';
import {combineLatest, from, Observable, zip} from 'rxjs';
import {ProjectService} from '../project/project.service';
import {catchError, map, switchMap, take} from 'rxjs/operators';
import {JiraIssueService} from './jira/jira-issue/jira-issue.service';
import {GitIssueService} from './git/git-issue/git-issue.service';
import {GIT_TYPE, JIRA_TYPE} from './issue.const';

@Injectable({
  providedIn: 'root',
})
export class IssueService {
  public isJiraSearchEnabled$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled)
  );
  public isJiraAddToBacklog$: Observable<boolean> = this._projectService.currentJiraCfg$.pipe(
    map(jiraCfg => jiraCfg && jiraCfg.isEnabled && jiraCfg.isAutoAddToBacklog)
  );


  public isGitSearchEnabled$: Observable<boolean> = this._projectService.currentGitCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.isSearchIssuesFromGit)
  );
  public isGitAddToBacklog$: Observable<boolean> = this._projectService.currentGitCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.isAutoAddToBacklog)
  );
  public isGitRefreshIssueData$: Observable<boolean> = this._projectService.currentGitCfg$.pipe(
    map(gitCfg => gitCfg && gitCfg.repo && (gitCfg.isSearchIssuesFromGit || gitCfg.isAutoAddToBacklog || gitCfg.isAutoPoll))
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
        console.log(isSearchJira, isSearchGit);
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

  public loadMissingIssueData(issueType: IssueProviderKey, issueId: string | number) {
    console.log('LOADING MISSING ISSUE DATA', issueType, issueId);
    switch (issueType) {
      case JIRA_TYPE: {
        this._jiraIssueService.loadMissingIssueData(issueId);
        break;
      }
      case GIT_TYPE: {
        this._gitIssueService.loadMissingIssueData(issueId);
      }
    }
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
      case GIT_TYPE: {
        this._gitIssueService.updateIssueFromApi(issueId);
      }
    }
  }

  public refreshIssueData() {
    console.log('refreshIssueData');

    this.isGitRefreshIssueData$.pipe(
      take(1),
    ).subscribe((isRefreshGit) => {
      console.log('isRefreshGit', isRefreshGit);

      if (isRefreshGit) {
        this._gitApiService.refreshIssuesCache();
      }
    });
  }

  // TODO refactor to actions
  public refreshBacklog() {
    console.log('REFRESH BACKLOG');

    // TODO refactor, so the old request is thrown away when the project is
    // switched again
    this.isGitAddToBacklog$.pipe(
      take(1),
    ).subscribe((isGitAddToBacklog) => {
      console.log('isGitAddToBacklog', isGitAddToBacklog);

      if (isGitAddToBacklog) {
        this._gitIssueService.addOpenIssuesToBacklog();
      }
    });

    this.isJiraAddToBacklog$.pipe(
      take(1),
    ).subscribe((isJiraAddToBacklog) => {
      console.log('isJiraAddToBacklog', isJiraAddToBacklog);

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
