import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './providers/jira/jira-issue/jira-issue.module';
import { IssueHeaderComponent } from './issue-header/issue-header.component';
import { IssueContentComponent } from './issue-content/issue-content.component';
import { GithubIssueModule } from './providers/github/github-issue/github-issue.module';
import { IssueIconPipe } from './issue-icon/issue-icon.pipe';
import { GitlabIssueModule } from './providers/gitlab/gitlab-issue/gitlab-issue.module';
import { CaldavIssueModule } from './providers/caldav/caldav-issue/caldav-issue.module';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule,
    GithubIssueModule,
    GitlabIssueModule,
    CaldavIssueModule,
  ],
  declarations: [IssueHeaderComponent, IssueContentComponent, IssueIconPipe],
  exports: [IssueHeaderComponent, IssueContentComponent, IssueIconPipe],
})
export class IssueModule {}
