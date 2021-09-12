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
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { WorkViewComponent } from './work-view.component';

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
    BetterDrawerModule,
  ],
  declarations: [WorkViewComponent, BacklogComponent],
  exports: [WorkViewComponent],
})
export class WorkViewModule {}
