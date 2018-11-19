import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from './calendar.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [CalendarComponent],
  exports: [CalendarComponent],
})
export class CalendarModule {
}
