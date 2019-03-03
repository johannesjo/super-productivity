import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogComponent } from './worklog.component';
import { UiModule } from '../../../ui/ui.module';
import { WorklogExportModule } from '../../../features/worklog-export/worklog-export.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    WorklogExportModule,
  ],
  declarations: [WorklogComponent],
  exports: [WorklogComponent],
})
export class WorklogModule {
}
