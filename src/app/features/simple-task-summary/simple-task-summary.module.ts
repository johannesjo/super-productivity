import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogSimpleTaskSummaryComponent } from './dialog-simple-task-summary/dialog-simple-task-summary.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { SimpleTaskSummaryComponent } from './simple-task-summary/simple-task-summary.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
  ],
  declarations: [DialogSimpleTaskSummaryComponent, SimpleTaskSummaryComponent],
  entryComponents: [DialogSimpleTaskSummaryComponent],
  exports: [SimpleTaskSummaryComponent],
})
export class SimpleTaskSummaryModule {
}
