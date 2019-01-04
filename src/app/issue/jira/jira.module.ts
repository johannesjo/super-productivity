import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraCfgStepperComponent } from './jira-cfg-stepper/jira-cfg-stepper.component';
import { UiModule } from '../../ui/ui.module';
import { CoreModule } from '../../core/core.module';
import { NgxElectronModule } from 'ngx-electron';
import { DialogJiraInitialSetupComponent } from './dialog-jira-initial-setup/dialog-jira-initial-setup.component';
import { JiraCfgComponent } from './jira-cfg/jira-cfg.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    NgxElectronModule,
    FormsModule,
  ],
  declarations: [JiraCfgStepperComponent, DialogJiraInitialSetupComponent, JiraCfgComponent],
  entryComponents: [DialogJiraInitialSetupComponent, JiraCfgComponent],
  exports: [JiraCfgStepperComponent],
})
export class JiraModule {
}
