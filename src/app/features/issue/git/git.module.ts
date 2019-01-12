import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../ui/ui.module';
import { CoreModule } from '../../../core/core.module';
import { NgxElectronModule } from 'ngx-electron';
import { DialogGitInitialSetupComponent } from './dialog-git-initial-setup/dialog-git-initial-setup.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    NgxElectronModule,
  ],
  declarations: [DialogGitInitialSetupComponent],
  entryComponents: [DialogGitInitialSetupComponent],
  exports: [],
})
export class GitModule {
}
