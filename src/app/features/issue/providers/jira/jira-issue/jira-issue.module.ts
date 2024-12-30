import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JiraIssueHeaderComponent } from './jira-issue-header/jira-issue-header.component';
import { JiraIssueContentComponent } from './jira-issue-content/jira-issue-content.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, ReactiveFormsModule],
  declarations: [JiraIssueHeaderComponent, JiraIssueContentComponent],
  exports: [JiraIssueHeaderComponent, JiraIssueContentComponent],
})
export class JiraIssueModule {}
