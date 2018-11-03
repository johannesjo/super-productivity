import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageModule } from './config-page/config-page.module';
import { ProjectPageModule } from './project-page/project-page.module';
import { WorkViewPageModule } from './work-view/work-view-page.module';
import { DailyPlannerModule } from './daily-planner/daily-planner.module';
import { DailySummaryModule } from './daily-summary/daily-summary.module';
import { WorklogAndCalendarModule } from './worklog-and-calendar/worklog-and-calendar.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigPageModule,
    ProjectPageModule,
    WorkViewPageModule,
    DailySummaryModule,
    WorklogAndCalendarModule,
  ],
  declarations: []
})
export class PagesModule {
}
