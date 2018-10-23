import { Injectable } from '@angular/core';
import { IssueProviderKey } from './issue';
import { JiraIssueContentComponent } from './jira/jira-issue/jira-issue-content/jira-issue-content.component';
import { JiraIssueHeaderComponent } from './jira/jira-issue/jira-issue-header/jira-issue-header.component';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  constructor() {
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
