import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { GithubIssueEffects } from './store/github-issue.effects';
import { GITHUB_ISSUE_FEATURE_NAME, githubIssueReducer } from './store/github-issue.reducer';
import { GithubIssueHeaderComponent } from './github-issue-header/github-issue-header.component';
import { GithubIssueContentComponent } from './github-issue-content/github-issue-content.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forFeature(GITHUB_ISSUE_FEATURE_NAME, githubIssueReducer),
    EffectsModule.forFeature([GithubIssueEffects]),
  ],
  declarations: [
    GithubIssueHeaderComponent,
    GithubIssueContentComponent,
  ],
  exports: [
    GithubIssueHeaderComponent,
    GithubIssueContentComponent,
  ],
})
export class GithubIssueModule {
}
