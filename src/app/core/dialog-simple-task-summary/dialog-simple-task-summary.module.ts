import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogSimpleTaskSummaryComponent } from './dialog-simple-task-summary.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { SnackModule } from '../snack/snack.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    SnackModule,
  ],
  declarations: [DialogSimpleTaskSummaryComponent],
  entryComponents: [DialogSimpleTaskSummaryComponent]
})
export class DialogSimpleTaskSummaryModule {
}
