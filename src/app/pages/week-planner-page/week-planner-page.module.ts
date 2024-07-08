import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekPlannerModule } from '../../features/week-planner/week-planner.module';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, WeekPlannerModule, UiModule],
})
export class WeekPlannerPageModule {}
