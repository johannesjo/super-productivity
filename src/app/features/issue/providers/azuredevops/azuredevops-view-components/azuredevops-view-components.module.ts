import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogAzuredevopsInitialSetupComponent } from './dialog-azuredevops-initial-setup/dialog-azuredevops-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule],
  declarations: [DialogAzuredevopsInitialSetupComponent],
  exports: [],
})
export class AzuredevopsViewComponentsModule {}
