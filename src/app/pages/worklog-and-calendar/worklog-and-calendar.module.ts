import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogAndCalendarComponent } from './worklog-and-calendar.component';
import { CalendarModule } from './calendar/calendar.module';
import { WorklogModule } from './worklog/worklog.module';
import { CoreModule } from '../../core/core.module';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    CalendarModule,
    WorklogModule,
    CoreModule,
    UiModule,
    RouterModule,
  ],
  declarations: [WorklogAndCalendarComponent],
  exports: [WorklogAndCalendarComponent],
})
export class WorklogAndCalendarModule {
}
