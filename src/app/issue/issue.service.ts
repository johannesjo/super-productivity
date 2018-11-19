import { Injectable } from '@angular/core';
import { IssueProviderKey } from './issue';
import { JiraIssueContentComponent } from './jira/jira-issue/jira-issue-content/jira-issue-content.component';
import { JiraIssueHeaderComponent } from './jira/jira-issue/jira-issue-header/jira-issue-header.component';
import { JiraIssue } from './jira/jira-issue/jira-issue.model';
import { Attachment } from '../tasks/attachment/attachment.model';
import { mapJiraAttachmentToAttachment } from './jira/jira-issue/jira-issue-map.util';

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  constructor() {
  }

  public getMappedAttachments(issueType: IssueProviderKey, issueData: JiraIssue): Attachment[] {
    switch (issueType) {
      case 'JIRA': {
        return issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment);
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
