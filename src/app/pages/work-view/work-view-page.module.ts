import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WorkViewPageComponent} from './work-view-page.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {UiModule} from '../../ui/ui.module';
import {TasksModule} from '../../features/tasks/tasks.module';
import {RouterModule} from '@angular/router';
import {SplitModule} from './split/split.module';
import {TimeTrackingModule} from '../../features/time-tracking/time-tracking.module';
import {BacklogComponent} from './backlog/backlog.component';
import {MetricModule} from '../../features/metric/metric.module';
import {MatSidenavModule} from '@angular/material/sidenav';
import {BetterDrawerModule} from '../../ui/better-drawer/better-drawer.module';

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
    MetricModule,
    MatSidenavModule,
    BetterDrawerModule,
  ],
  declarations: [WorkViewPageComponent, BacklogComponent],
})
export class WorkViewPageModule {
}
