import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogSimpleTaskSummaryComponent } from './dialog-simple-task-summary.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
  ],
  declarations: [DialogSimpleTaskSummaryComponent],
  entryComponents: [DialogSimpleTaskSummaryComponent]
})
export class DialogSimpleTaskSummaryModule {
}
