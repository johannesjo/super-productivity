import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './jira/jira-issue/jira-issue.module';
import { IssueHeaderComponent } from './issue-header/issue-header.component';
import { IssueContentComponent } from './issue-content/issue-content.component';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule
  ],
  declarations: [
    IssueHeaderComponent,
    IssueContentComponent,
  ],
  exports: [
    IssueHeaderComponent,
    IssueContentComponent,
  ]
})
export class IssueModule {
}
