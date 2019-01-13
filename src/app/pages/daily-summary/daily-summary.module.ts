import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailySummaryComponent } from './daily-summary.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { GoogleModule } from '../../features/google/google.module';
import { SimpleTaskSummaryModule } from '../../features/simple-task-summary/simple-task-summary.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    RouterModule,
    GoogleModule,
    SimpleTaskSummaryModule,
  ],
  declarations: [DailySummaryComponent]
})
export class DailySummaryModule {
}
