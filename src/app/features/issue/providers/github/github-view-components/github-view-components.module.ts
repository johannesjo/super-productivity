import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogGithubInitialSetupComponent } from './dialog-github-initial-setup/dialog-github-initial-setup.component';

@NgModule({
  imports: [CommonModule, UiModule],
  declarations: [DialogGithubInitialSetupComponent],
  exports: [],
})
export class GithubViewComponentsModule {}
