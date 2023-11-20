import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogGitlabSubmitWorklogForDayComponent } from './dialog-gitlab-submit-worklog-for-day.component';
import { UiModule } from '../../../../../ui/ui.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [DialogGitlabSubmitWorklogForDayComponent],
  imports: [CommonModule, UiModule, TranslateModule],
  exports: [DialogGitlabSubmitWorklogForDayComponent],
})
export class DialogGitlabSubmitWorklogForDayModule {}
