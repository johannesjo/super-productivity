import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './jira/jira-issue/jira-issue.module';
import { IssueHeaderComponent } from './issue-header/issue-header.component';
import { IssueContentComponent } from './issue-content/issue-content.component';
import { GitIssueModule } from './git/git-issue/git-issue.module';
import { IssueIconPipe } from './issue-icon/issue-icon.pipe';
import { IssueService } from './issue.service';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule,
    GitIssueModule,
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
