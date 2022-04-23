import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { DialogGiteaInitialSetupComponent } from './dialog-gitea-initial-setup/dialog-gitea-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [DialogGiteaInitialSetupComponent],
  exports: [],
})
export class GiteaViewComponentsModule {}
