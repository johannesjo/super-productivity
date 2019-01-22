import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../ui/ui.module';
import { DialogGitInitialSetupComponent } from './dialog-git-initial-setup/dialog-git-initial-setup.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
  ],
  declarations: [DialogGitInitialSetupComponent],
  entryComponents: [DialogGitInitialSetupComponent],
  exports: [],
})
export class GitModule {
}
