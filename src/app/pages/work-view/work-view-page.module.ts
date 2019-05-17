import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkViewPageComponent } from './work-view-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../../features/tasks/tasks.module';
import { RouterModule } from '@angular/router';
import { SplitModule } from './split/split.module';
import { TimeTrackingModule } from '../../features/time-tracking/time-tracking.module';
import { BacklogTabsComponent } from './backlog-tabs/backlog-tabs.component';
import {MetricsModule} from '../../features/metrics/metrics.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TasksModule,
    SplitModule,
    TimeTrackingModule,
    MetricsModule,
  ],
  declarations: [WorkViewPageComponent, BacklogTabsComponent],
})
export class WorkViewPageModule {
}
