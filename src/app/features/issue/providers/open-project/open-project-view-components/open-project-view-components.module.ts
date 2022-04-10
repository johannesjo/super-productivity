import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogOpenProjectInitialSetupComponent } from './dialog-open-project-initial-setup/dialog-open-project-initial-setup.component';
import { DialogOpenProjectTrackTimeComponent } from './dialog-open-project-track-time/dialog-open-project-track-time.component';
import { FormsModule } from '@angular/forms';
import { OpenprojectCfgComponent } from './openproject-cfg/openproject-cfg.component';
import { DialogOpenprojectTransitionComponent } from './dialog-openproject-transition/dialog-openproject-transition.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [
    DialogOpenProjectInitialSetupComponent,
    DialogOpenProjectTrackTimeComponent,
    OpenprojectCfgComponent,
    DialogOpenprojectTransitionComponent,
  ],
  exports: [],
})
export class OpenProjectViewComponentsModule {}
