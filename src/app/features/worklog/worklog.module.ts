import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogComponent } from './worklog.component';
import { UiModule } from '../../ui/ui.module';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { WorklogExportComponent } from './worklog-export/worklog-export.component';
import { FormsModule } from '@angular/forms';
import { DialogTaskSummaryComponent } from './dialog-task-summary/dialog-task-summary.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
  ],
  declarations: [
    WorklogComponent,
    DialogWorklogExportComponent,
    WorklogExportComponent,
    DialogTaskSummaryComponent,
  ],
  entryComponents: [
    DialogWorklogExportComponent,
    DialogTaskSummaryComponent,
  ],
  exports: [
    WorklogComponent,
    DialogWorklogExportComponent,
    WorklogExportComponent,
  ],
})
export class WorklogModule {
}
