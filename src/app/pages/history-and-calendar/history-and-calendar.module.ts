import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryAndCalendarComponent } from './history-and-calendar.component';
import { CalendarModule } from './calendar/calendar.module';
import { HistoryModule } from './history/history.module';
import { CoreModule } from '../../core/core.module';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    CalendarModule,
    HistoryModule,
    CoreModule,
    UiModule,
    RouterModule,
  ],
  declarations: [HistoryAndCalendarComponent],
  exports: [HistoryAndCalendarComponent],
})
export class HistoryAndCalendarModule { }
