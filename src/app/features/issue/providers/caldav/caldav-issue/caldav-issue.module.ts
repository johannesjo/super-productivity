import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaldavIssueHeaderComponent } from './caldav-issue-header/caldav-issue-header.component';
import { CaldavIssueContentComponent } from './caldav-issue-content/caldav-issue-content.component';
// XXX import { GitlabIssueEffects } from './gitlab-issue.effects';
// XXX import { EffectsModule } from '@ngrx/effects';
import { UiModule } from 'src/app/ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EffectsModule } from '@ngrx/effects';
import { CaldavIssueEffects } from './caldav-issue.effects';

@NgModule({
  declarations: [CaldavIssueHeaderComponent, CaldavIssueContentComponent],
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    EffectsModule.forFeature([CaldavIssueEffects]),
  ],
  exports: [CaldavIssueHeaderComponent, CaldavIssueContentComponent],
})
export class CaldavIssueModule {}
