import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RedmineIssueContentComponent } from './redmine-issue-content/redmine-issue-content.component';
import { RedmineIssueHeaderComponent } from './redmine-issue-header/redmine-issue-header.component';

@NgModule({
  declarations: [RedmineIssueContentComponent, RedmineIssueHeaderComponent],
  imports: [CommonModule, UiModule, FormsModule, ReactiveFormsModule],
  exports: [RedmineIssueContentComponent, RedmineIssueHeaderComponent],
})
export class RedmineIssueModule {}
