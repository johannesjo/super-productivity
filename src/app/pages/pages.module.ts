import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigPageModule} from './config-page/config-page.module';
import {ProjectPageModule} from './project-page/project-page.module';
import {ProjectTaskPageModule} from './project-task-page/project-task-page.module';
import {DailySummaryModule} from './daily-summary/daily-summary.module';
import {MetricPageModule} from './metric-page/metric-page.module';
import {SchedulePageModule} from './schedule-page/schedule-page.module';
import {WorklogPageModule} from './worklog-page/worklog-page.module';
import {ProjectSettingsModule} from './project-settings/project-settings.module';
import {TagTaskPageModule} from './tag-task-page/tag-task-page.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigPageModule,
    ProjectPageModule,
    ProjectTaskPageModule,
    DailySummaryModule,
    MetricPageModule,
    WorklogPageModule,
    SchedulePageModule,
    ProjectSettingsModule,
    TagTaskPageModule,
  ],
  declarations: []
})
export class PagesModule {
}
