import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './jira/jira-issue/jira-issue.module';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule
  ],
  declarations: []
})
export class IssueModule {
}
