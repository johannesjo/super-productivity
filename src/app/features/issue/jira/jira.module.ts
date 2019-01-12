import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraCfgStepperComponent } from './jira-cfg-stepper/jira-cfg-stepper.component';
import { UiModule } from '../../../ui/ui.module';
import { CoreModule } from '../../../core/core.module';
import { NgxElectronModule } from 'ngx-electron';
import { DialogJiraInitialSetupComponent } from './dialog-jira-initial-setup/dialog-jira-initial-setup.component';
import { JiraCfgComponent } from './jira-cfg/jira-cfg.component';
import { FormsModule } from '@angular/forms';
import { DialogJiraTransitionComponent } from './dialog-jira-transition/dialog-jira-transition.component';
import { DialogJiraAddWorklogComponent } from './dialog-jira-add-worklog/dialog-jira-add-worklog.component';
import { JiraApiService } from './jira-api.service';
import { JiraIssueService } from './jira-issue/jira-issue.service';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    NgxElectronModule,
    FormsModule,
  ],
  declarations: [
    JiraCfgStepperComponent,
    JiraCfgComponent,
    DialogJiraInitialSetupComponent,
    DialogJiraTransitionComponent,
    DialogJiraAddWorklogComponent,
  ],
  entryComponents: [
    DialogJiraTransitionComponent,
    DialogJiraInitialSetupComponent,
    DialogJiraAddWorklogComponent,
    JiraCfgComponent,
  ],
  exports: [
    JiraCfgStepperComponent
  ],
  providers: [
    JiraApiService,
    JiraIssueService,
  ]
})
export class JiraModule {
}
