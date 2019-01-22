import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogComponent } from './worklog.component';
import { UiModule } from '../../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
  ],
  declarations: [WorklogComponent],
  exports: [WorklogComponent],
})
export class WorklogModule {
}
