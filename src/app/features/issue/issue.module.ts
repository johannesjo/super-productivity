import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './providers/jira/jira-issue/jira-issue.module';
import { IssueHeaderComponent } from './issue-header/issue-header.component';
import { IssueContentComponent } from './issue-content/issue-content.component';
import { GithubIssueModule } from './providers/github/github-issue/github-issue.module';
import { RedmineIssueModule } from './providers/redmine/redmine-issue/redmine-issue.module';
import { IssueIconPipe } from './issue-icon/issue-icon.pipe';
import { GitlabIssueModule } from './providers/gitlab/gitlab-issue/gitlab-issue.module';
import { CaldavIssueModule } from './providers/caldav/caldav-issue/caldav-issue.module';
import { OpenProjectIssueModule } from './providers/open-project/open-project-issue/open-project-issue.module';
import { GiteaIssueModule } from './providers/gitea/gitea-issue/gitea-issue.module';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule,
    GithubIssueModule,
    RedmineIssueModule,
    GitlabIssueModule,
    CaldavIssueModule,
    OpenProjectIssueModule,
    GiteaIssueModule,
  ],
  declarations: [IssueHeaderComponent, IssueContentComponent, IssueIconPipe],
  exports: [IssueHeaderComponent, IssueContentComponent, IssueIconPipe],
})
export class IssueModule {}
