import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { JiraAdditionalCfgComponent } from './jira-cfg/jira-additional-cfg.component';
import { FormsModule } from '@angular/forms';
import { DialogJiraTransitionComponent } from './dialog-jira-transition/dialog-jira-transition.component';
import { DialogJiraAddWorklogComponent } from './dialog-jira-add-worklog/dialog-jira-add-worklog.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [
    DialogJiraTransitionComponent,
    DialogJiraAddWorklogComponent,
    JiraAdditionalCfgComponent,
  ],
  exports: [JiraAdditionalCfgComponent],
})
export class JiraViewComponentsModule {}
