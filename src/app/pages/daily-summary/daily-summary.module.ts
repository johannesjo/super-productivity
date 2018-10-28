import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailySummaryComponent } from './daily-summary.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
  ],
  declarations: [DailySummaryComponent]
})
export class DailySummaryModule { }
