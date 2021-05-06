import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitlabIssueHeaderComponent } from './gitlab-issue-header/gitlab-issue-header.component';
import { GitlabIssueContentComponent } from './gitlab-issue-content/gitlab-issue-content.component';
import { GitlabIssueEffects } from './gitlab-issue.effects';
import { EffectsModule } from '@ngrx/effects';
import { UiModule } from 'src/app/ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [GitlabIssueHeaderComponent, GitlabIssueContentComponent],
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    EffectsModule.forFeature([GitlabIssueEffects]),
  ],
  exports: [GitlabIssueHeaderComponent, GitlabIssueContentComponent],
})
export class GitlabIssueModule {}
