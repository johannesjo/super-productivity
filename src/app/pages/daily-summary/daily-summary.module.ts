import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailySummaryComponent } from './daily-summary.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { WorklogModule } from '../../features/worklog/worklog.module';
import { MetricModule } from '../../features/metric/metric.module';
import { TasksModule } from '../../features/tasks/tasks.module';
import { PlanTasksTomorrowComponent } from './plan-tasks-tomorrow/plan-tasks-tomorrow.component';
import { RightPanelModule } from '../../features/right-panel/right-panel.module';
import { DialogGitlabSubmitWorklogForDayModule } from '../../features/issue/providers/gitlab/dialog-gitlab-submit-worklog-for-day/dialog-gitlab-submit-worklog-for-day.module';
import { AddScheduledTodayOrTomorrowBtnComponent } from '../../features/add-tasks-for-tomorrow/add-scheduled-for-tomorrow/add-scheduled-today-or-tomorrow-btn.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    RouterModule,
    WorklogModule,
    MetricModule,
    TasksModule,
    RightPanelModule,
    DialogGitlabSubmitWorklogForDayModule,
    AddScheduledTodayOrTomorrowBtnComponent,
  ],
  declarations: [DailySummaryComponent, PlanTasksTomorrowComponent],
})
export class DailySummaryModule {}
