import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectModule } from '../../../project/project.module';
import { UiModule } from '../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { JiraIssueEffects } from './store/jira-issue.effects';
import { JIRA_ISSUE_FEATURE_NAME, jiraIssueReducer } from './store/jira-issue.reducer';
import { JiraIssueService } from './jira-issue.service';
import { JiraIssueHeaderComponent } from './jira-issue-header/jira-issue-header.component';
import { JiraIssueContentComponent } from './jira-issue-content/jira-issue-content.component';

@NgModule({
  imports: [
    CommonModule,
    ProjectModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forFeature(JIRA_ISSUE_FEATURE_NAME, jiraIssueReducer),
    EffectsModule.forFeature([JiraIssueEffects]),
  ],
  declarations: [
    JiraIssueHeaderComponent,
    JiraIssueContentComponent,
  ],
  exports: [],
  providers: [
    JiraIssueService,
  ],
  entryComponents: [
    JiraIssueHeaderComponent,
    JiraIssueContentComponent,
  ],

})
export class JiraIssueModule {
}
