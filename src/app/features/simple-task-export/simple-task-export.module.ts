import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogSimpleTaskExportComponent } from './dialog-simple-task-export/dialog-simple-task-export.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { SimpleTaskExportComponent } from './simple-task-export/simple-task-export.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
  ],
  declarations: [DialogSimpleTaskExportComponent, SimpleTaskExportComponent],
  entryComponents: [DialogSimpleTaskExportComponent],
  exports: [SimpleTaskExportComponent],
})
export class SimpleTaskExportModule {
}
