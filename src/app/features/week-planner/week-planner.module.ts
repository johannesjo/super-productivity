import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekPlannerComponent } from './week-planner.component';
import { WeekPlannerPlanViewComponent } from './week-planner-plan-view/week-planner-plan-view.component';

@NgModule({
  declarations: [WeekPlannerComponent, WeekPlannerPlanViewComponent],
  imports: [CommonModule],
})
export class WeekPlannerModule {}
