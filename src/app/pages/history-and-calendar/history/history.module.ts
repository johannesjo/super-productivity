import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryComponent } from './history.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [HistoryComponent],
  exports: [HistoryComponent],
})
export class HistoryModule { }
