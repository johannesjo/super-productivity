import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../../features/tasks/tasks.module';
import { RouterModule } from '@angular/router';
import { SplitModule } from './split/split.module';
import { BacklogComponent } from './backlog/backlog.component';
import { MetricModule } from '../../features/metric/metric.module';
import { MatSidenavModule } from '@angular/material/sidenav';
import { WorkViewComponent } from './work-view.component';
import { RightPanelModule } from '../right-panel/right-panel.module';
import { AddScheduledTodayOrTomorrowBtnComponent } from '../add-tasks-for-tomorrow/add-scheduled-for-tomorrow/add-scheduled-today-or-tomorrow-btn.component';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TasksModule,
    SplitModule,
    MetricModule,
    MatSidenavModule,
    RightPanelModule,
    AddScheduledTodayOrTomorrowBtnComponent,
    CdkDropListGroup,
  ],
  declarations: [WorkViewComponent, BacklogComponent],
  exports: [WorkViewComponent],
})
export class WorkViewModule {}
