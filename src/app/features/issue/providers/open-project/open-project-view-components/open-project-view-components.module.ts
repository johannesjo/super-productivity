import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogOpenProjectInitialSetupComponent } from './dialog-open-project-initial-setup/dialog-open-project-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule],
  declarations: [DialogOpenProjectInitialSetupComponent],
  exports: [],
})
export class OpenProjectViewComponentsModule {}
