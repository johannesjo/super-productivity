import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectModule } from '../../../project/project.module';
import { UiModule } from '../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { GitIssueEffects } from './store/git-issue.effects';
import { JIRA_ISSUE_FEATURE_NAME, gitIssueReducer } from './store/git-issue.reducer';
import { GitIssueService } from './git-issue.service';
import { GitIssueHeaderComponent } from './git-issue-header/git-issue-header.component';
import { GitIssueContentComponent } from './git-issue-content/git-issue-content.component';

@NgModule({
  imports: [
    CommonModule,
    ProjectModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forFeature(JIRA_ISSUE_FEATURE_NAME, gitIssueReducer),
    EffectsModule.forFeature([GitIssueEffects]),
  ],
  declarations: [
    GitIssueHeaderComponent,
    GitIssueContentComponent,
  ],
  exports: [
    GitIssueHeaderComponent,
    GitIssueContentComponent,
  ],
  providers: [
    GitIssueService,
  ],
})
export class GitIssueModule {
}
