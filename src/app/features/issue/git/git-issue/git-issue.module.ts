import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { GitIssueEffects } from './store/git-issue.effects';
import { GIT_ISSUE_FEATURE_NAME, gitIssueReducer } from './store/git-issue.reducer';
import { GitIssueHeaderComponent } from './git-issue-header/git-issue-header.component';
import { GitIssueContentComponent } from './git-issue-content/git-issue-content.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forFeature(GIT_ISSUE_FEATURE_NAME, gitIssueReducer),
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
})
export class GitIssueModule {
}
