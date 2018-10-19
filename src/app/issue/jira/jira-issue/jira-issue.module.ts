import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectModule } from '../../../project/project.module';
import { UiModule } from '../../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { JiraIssueEffects } from './store/jira-issue.effects';
import { JIRA_ISSUE_FEATURE_NAME } from './store/jira-issue.reducer';
import { jiraIssueReducer } from './store/jira-issue.reducer';
import { JiraIssueService } from './jira-issue.service';

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
  declarations: [],
  exports: [],
  providers: [
    JiraIssueService,
  ],
  entryComponents: []

})
export class JiraIssueModule {
}
