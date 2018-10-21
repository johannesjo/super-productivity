import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraCfgStepperComponent } from './jira-cfg-stepper/jira-cfg-stepper.component';
import { UiModule } from '../../ui/ui.module';
import { CoreModule } from '../../core/core.module';
import { NgxElectronModule } from 'ngx-electron';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    NgxElectronModule,
  ],
  declarations: [JiraCfgStepperComponent],
  exports: [JiraCfgStepperComponent],
})
export class JiraModule {
}
