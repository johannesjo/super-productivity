import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';

import { DialogOpenProjectTrackTimeComponent } from './dialog-open-project-track-time/dialog-open-project-track-time.component';
import { FormsModule } from '@angular/forms';
import { DialogOpenprojectTransitionComponent } from './dialog-openproject-transition/dialog-openproject-transition.component';
import { MatSliderModule } from '@angular/material/slider';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, MatSliderModule],
  declarations: [
    DialogOpenProjectTrackTimeComponent,
    DialogOpenprojectTransitionComponent,
  ],
  exports: [],
})
export class OpenProjectViewComponentsModule {}
