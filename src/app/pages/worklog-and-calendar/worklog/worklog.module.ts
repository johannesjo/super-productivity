import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogComponent } from './worklog.component';
import { CoreModule } from '../../../core/core.module';
import { UiModule } from '../../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
  ],
  declarations: [WorklogComponent],
  exports: [WorklogComponent],
})
export class WorklogModule { }
