import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageModule } from './config-page/config-page.module';
import { ProjectOverviewPageModule } from './project-overview-page/project-overview-page.module';
import { ProjectTaskPageModule } from './project-task-page/project-task-page.module';
import { DailySummaryModule } from './daily-summary/daily-summary.module';
import { MetricPageModule } from './metric-page/metric-page.module';
import { SchedulePageModule } from './schedule-page/schedule-page.module';
import { WorklogPageModule } from './worklog-page/worklog-page.module';
import { ProjectSettingsPageModule } from './project-settings-page/project-settings-page.module';
import { TagTaskPageModule } from './tag-task-page/tag-task-page.module';
import { TagSettingsPageModule } from './tag-settings-page/tag-settings-page.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigPageModule,
    ProjectOverviewPageModule,
    ProjectTaskPageModule,
    ProjectSettingsPageModule,
    DailySummaryModule,
    MetricPageModule,
    WorklogPageModule,
    SchedulePageModule,
    TagTaskPageModule,
    TagSettingsPageModule,
  ],
  declarations: []
})
export class PagesModule {
}
