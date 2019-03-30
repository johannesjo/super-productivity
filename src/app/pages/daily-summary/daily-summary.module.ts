import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DailySummaryComponent} from './daily-summary.component';
import {FormsModule} from '@angular/forms';
import {UiModule} from '../../ui/ui.module';
import {GoogleModule} from '../../features/google/google.module';
import {SimpleTaskExportModule} from '../../features/simple-task-export/simple-task-export.module';
import {RouterModule} from '@angular/router';
import {WorklogModule} from '../../features/worklog/worklog.module';
import {DialogEditStartEndComponent} from './dialog-edit-start-end/dialog-edit-start-end.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    GoogleModule,
    RouterModule,
    SimpleTaskExportModule,
    WorklogModule,
  ],
  declarations: [
    DailySummaryComponent,
    DialogEditStartEndComponent,
  ],
  entryComponents: [
    DialogEditStartEndComponent,
  ]

})
export class DailySummaryModule {
}
