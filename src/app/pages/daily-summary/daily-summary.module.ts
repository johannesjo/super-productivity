import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailySummaryComponent } from './daily-summary.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { GoogleModule } from '../../core/google/google.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    RouterModule,
    GoogleModule,
  ],
  declarations: [DailySummaryComponent]
})
export class DailySummaryModule { }
