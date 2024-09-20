import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageModule } from './config-page/config-page.module';
import { ProjectTaskPageModule } from './project-task-page/project-task-page.module';
import { DailySummaryModule } from './daily-summary/daily-summary.module';
import { MetricPageModule } from './metric-page/metric-page.module';
import { ScheduledListPageModule } from './scheduled-list-page/scheduled-list-page.module';
import { ProjectSettingsPageModule } from './project-settings-page/project-settings-page.module';
import { TagTaskPageModule } from './tag-task-page/tag-task-page.module';
import { TagSettingsPageModule } from './tag-settings-page/tag-settings-page.module';
import { QuickHistoryModule } from '../features/quick-history/quick-history.module';
import { PlannerPageModule } from './planner-page/planner-page.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigPageModule,
    ProjectTaskPageModule,
    ProjectSettingsPageModule,
    DailySummaryModule,
    MetricPageModule,
    ScheduledListPageModule,
    TagTaskPageModule,
    TagSettingsPageModule,
    PlannerPageModule,
    QuickHistoryModule,
  ],
  declarations: [],
})
export class PagesModule {}
