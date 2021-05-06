import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogCaldavInitialSetupComponent } from './dialog-caldav-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule],
  declarations: [DialogCaldavInitialSetupComponent],
  exports: [],
})
export class DialogCaldavInitialSetupModule {}
