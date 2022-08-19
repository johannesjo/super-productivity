import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { DialogRedmineInitialSetupComponent } from './redmine-initial-setup/dialog-redmine-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [DialogRedmineInitialSetupComponent],
  exports: [],
})
export class RedmineViewComponentsModule {}
