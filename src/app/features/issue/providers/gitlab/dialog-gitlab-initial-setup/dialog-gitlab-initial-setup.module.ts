import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogGitlabInitialSetupComponent } from './dialog-gitlab-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule],
  declarations: [DialogGitlabInitialSetupComponent],
  exports: [],
})
export class DialogGitlabInitialSetupModule {}
