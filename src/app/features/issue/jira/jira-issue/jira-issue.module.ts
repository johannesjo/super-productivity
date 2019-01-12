import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { JiraIssueEffects } from './store/jira-issue.effects';
import { JIRA_ISSUE_FEATURE_NAME, jiraIssueReducer } from './store/jira-issue.reducer';
import { JiraIssueService } from './jira-issue.service';
import { JiraIssueHeaderComponent } from './jira-issue-header/jira-issue-header.component';
import { JiraIssueContentComponent } from './jira-issue-content/jira-issue-content.component';
import { AttachmentModule } from '../../../attachment/attachment.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    AttachmentModule,
    ReactiveFormsModule,
    StoreModule.forFeature(JIRA_ISSUE_FEATURE_NAME, jiraIssueReducer),
    EffectsModule.forFeature([JiraIssueEffects]),
  ],
  declarations: [
    JiraIssueHeaderComponent,
    JiraIssueContentComponent,
  ],
  exports: [
    JiraIssueHeaderComponent,
    JiraIssueContentComponent,
  ],
  providers: [
    JiraIssueService,
  ],
})
export class JiraIssueModule {
}
