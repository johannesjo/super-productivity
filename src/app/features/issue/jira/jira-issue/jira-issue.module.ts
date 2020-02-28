import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {UiModule} from '../../../../ui/ui.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {EffectsModule} from '@ngrx/effects';
import {JiraIssueEffects} from './store/jira-issue.effects';
import {JiraIssueHeaderComponent} from './jira-issue-header/jira-issue-header.component';
import {JiraIssueContentComponent} from './jira-issue-content/jira-issue-content.component';
import {AttachmentModule} from '../../../attachment/attachment.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    AttachmentModule,
    ReactiveFormsModule,
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
})
export class JiraIssueModule {
}
