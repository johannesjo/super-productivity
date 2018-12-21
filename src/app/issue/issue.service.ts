import { Injectable } from '@angular/core';
import { IssueData, IssueProviderKey, SearchResultItem } from './issue';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { Attachment } from '../attachment/attachment.model';
import { JiraApiService } from './jira/jira-api.service';
import { GitApiService } from './git/git-api.service';
import { combineLatest, from, Observable, zip } from 'rxjs';
import { ProjectService } from '../project/project.service';
import { map, switchMap } from 'rxjs/operators';
import { JiraIssueService } from './jira/jira-issue/jira-issue.service';
import { GitIssueService } from './git/git-issue/git-issue.service';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  public isRemoteSearchEnabled: boolean;
  public isRemoteSearchEnabled$: Observable<boolean> = combineLatest(
    this._projectService.currentJiraCfg$,
    this._projectService.currentGitCfg$,
  ).pipe(map(([jiraCfg, gitCfg]) => (jiraCfg && jiraCfg.isEnabled) || (gitCfg && gitCfg.isShowIssuesFromGit)));

  constructor(
    private _jiraApiService: JiraApiService,
    private _gitApiService: GitApiService,
    private _jiraIssueService: JiraIssueService,
    private _gitIssueService: GitIssueService,
    private _projectService: ProjectService,
  ) {
    this.isRemoteSearchEnabled$.subscribe(val => this.isRemoteSearchEnabled = val);
  }


  public async loadStatesForProject(projectId) {
    return Promise.all([
      this._jiraIssueService.loadStateForProject(projectId),
      this._gitIssueService.loadStateForProject(projectId),
    ]);
  }

  public searchIssues(searchTerm: string): Observable<SearchResultItem[]> {
    if (!this.isRemoteSearchEnabled) {
      return from([[]]);
    }

    return combineLatest(
      this._projectService.currentJiraCfg$,
      this._projectService.currentGitCfg$,
    ).pipe(
      switchMap(([jiraCfg, gitCfg]) => {
        const obs = [];

        if (jiraCfg && jiraCfg.isEnabled) {
          obs.push(this._jiraApiService.search(searchTerm, false, 50)
            .catch(() => {
              return [];
            }));
        }
        if (gitCfg && gitCfg.isShowIssuesFromGit && gitCfg.repo) {
          obs.push(this._gitApiService.searchIssueForRepo(searchTerm));
        }
        console.log(obs);

        return zip(...obs, (...allResults) => [].concat(...(allResults)));
      })
    );
  }

  public getMappedAttachments(issueType: IssueProviderKey, issueData_: IssueData): Attachment[] {
    switch (issueType) {
      case 'JIRA': {
        const issueData = issueData_ as JiraIssue;
        return this._jiraIssueService.getMappedAttachmentsFromIssue(issueData);
      }
    }
  }
}
