import { Injectable } from '@angular/core';
import { IssueData, IssueProviderKey, SearchResultItem } from './issue';
import { JiraIssueContentComponent } from './jira/jira-issue/jira-issue-content/jira-issue-content.component';
import { JiraIssueHeaderComponent } from './jira/jira-issue/jira-issue-header/jira-issue-header.component';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { Attachment } from '../tasks/attachment/attachment.model';
import { mapJiraAttachmentToAttachment } from './jira/jira-issue/jira-issue-map.util';
import { JiraApiService } from './jira/jira-api.service';
import { GitApiService } from './git/git-api.service';
import { combineLatest, from, Observable, zip } from 'rxjs';
import { ProjectService } from '../project/project.service';
import { map, switchMap } from 'rxjs/operators';

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
    private _projectService: ProjectService,
  ) {
    this.isRemoteSearchEnabled$.subscribe(val => this.isRemoteSearchEnabled = val);
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

        if (jiraCfg.isEnabled) {
          obs.push(this._jiraApiService.search(searchTerm, false, 50)
            .catch(() => {
              return [];
            }));
        }
        if (gitCfg.isShowIssuesFromGit) {
          obs.push(this._gitApiService.searchIssue(searchTerm));
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
        return issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment) as Attachment[];
      }
    }
  }

  public getTabHeader(issueType: IssueProviderKey) {
    switch (issueType) {
      case 'JIRA': {
        return JiraIssueHeaderComponent;
      }
    }
  }


  public getTabContent(issueType: IssueProviderKey) {
    switch (issueType) {
      case 'JIRA': {
        return JiraIssueContentComponent;
      }
    }
  }
}
