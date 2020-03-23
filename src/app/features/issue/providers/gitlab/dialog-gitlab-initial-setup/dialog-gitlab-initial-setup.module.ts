import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {UiModule} from '../../../../../ui/ui.module';
import {DialogGitlabInitialSetupComponent} from './dialog-gitlab-initial-setup.component';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
  ],
  declarations: [DialogGitlabInitialSetupComponent],
  entryComponents: [DialogGitlabInitialSetupComponent],
  exports: [],
})
export class DialogGitlabInitialSetupModule {
}
