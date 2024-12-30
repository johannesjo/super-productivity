import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { SplitModule } from './split/split.module';
import { BacklogComponent } from './backlog/backlog.component';
import { MetricModule } from '../../features/metric/metric.module';
import { MatSidenavModule } from '@angular/material/sidenav';
import { WorkViewComponent } from './work-view.component';
import { RightPanelModule } from '../right-panel/right-panel.module';
import { AddScheduledTodayOrTomorrowBtnComponent } from '../add-tasks-for-tomorrow/add-scheduled-for-tomorrow/add-scheduled-today-or-tomorrow-btn.component';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { TaskListComponent } from '../tasks/task-list/task-list.component';
import { AddTaskBarComponent } from '../tasks/add-task-bar/add-task-bar.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,

    SplitModule,
    MetricModule,
    MatSidenavModule,
    RightPanelModule,
    AddScheduledTodayOrTomorrowBtnComponent,
    CdkDropListGroup,
    TaskListComponent,
    AddTaskBarComponent,
  ],
  declarations: [WorkViewComponent, BacklogComponent],
  exports: [WorkViewComponent],
})
export class WorkViewModule {}
