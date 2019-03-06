import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogComponent } from './worklog.component';
import { UiModule } from '../../ui/ui.module';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { WorklogExportComponent } from './worklog-export/worklog-export.component';
import { FormsModule } from '@angular/forms';

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
  ],
  entryComponents: [
    DialogWorklogExportComponent,
  ],
  exports: [
    WorklogComponent,
    DialogWorklogExportComponent,
    WorklogExportComponent,
  ],
})
export class WorklogModule {
}
