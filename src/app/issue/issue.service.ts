import { map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { JiraIssueService } from './jira/jira-issue/jira-issue.service';
import { combineLatest, Observable } from 'rxjs';
import { IssueEntityMap, IssueProviderKey } from './issue';
import { JiraIssueContentComponent } from './jira/jira-issue/jira-issue-content/jira-issue-content.component';
import { JiraIssueHeaderComponent } from './jira/jira-issue/jira-issue-header/jira-issue-header.component';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  public issueEntityMap$: Observable<IssueEntityMap> = combineLatest(
    this._jiraIssueService.jiraIssuesEntities$
  ).pipe(map(([jiraEntities]) => {
    return {
      JIRA: jiraEntities
    };
  }));

  constructor(private _jiraIssueService: JiraIssueService) {
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
