import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GithubIssueHeaderComponent } from './github-issue-header/github-issue-header.component';
import { GithubIssueContentComponent } from './github-issue-content/github-issue-content.component';
import { EffectsModule } from '@ngrx/effects';
import { GithubIssueEffects } from './github-issue.effects';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    EffectsModule.forFeature([GithubIssueEffects]),
  ],
  declarations: [GithubIssueHeaderComponent, GithubIssueContentComponent],
  exports: [GithubIssueHeaderComponent, GithubIssueContentComponent],
})
export class GithubIssueModule {}
