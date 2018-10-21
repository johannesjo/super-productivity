import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyPlannerComponent } from './daily-planner.component';
import { UiModule } from '../../ui/ui.module';
import { CoreModule } from '../../core/core.module';
import { TasksModule } from '../../tasks/tasks.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    CoreModule,
    TasksModule,
  ],
  declarations: [DailyPlannerComponent]
})
export class DailyPlannerModule { }
