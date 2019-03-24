import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './jira/jira-issue/jira-issue.module';
import { IssueHeaderComponent } from './issue-header/issue-header.component';
import { IssueContentComponent } from './issue-content/issue-content.component';
import { GithubIssueModule } from './github/github-issue/github-issue.module';
import { IssueIconPipe } from './issue-icon/issue-icon.pipe';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule,
    GithubIssueModule,
  ],
  declarations: [
    IssueHeaderComponent,
    IssueContentComponent,
    IssueIconPipe,
  ],
  exports: [
    IssueHeaderComponent,
    IssueContentComponent,
    IssueIconPipe,
  ],
})
export class IssueModule {
}
