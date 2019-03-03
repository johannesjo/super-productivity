import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { WorklogExportComponent } from './worklog-export/worklog-export.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    UiModule,
    CommonModule,
    FormsModule,
  ],
  declarations: [
    DialogWorklogExportComponent,
    WorklogExportComponent,
  ],
  entryComponents: [DialogWorklogExportComponent],
  exports: [
    DialogWorklogExportComponent,
    WorklogExportComponent,
  ],
})
export class WorklogExportModule {
}
