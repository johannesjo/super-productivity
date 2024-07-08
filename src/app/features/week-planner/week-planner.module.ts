import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekPlannerComponent } from './week-planner.component';
import { WeekPlannerPlanViewComponent } from './week-planner-plan-view/week-planner-plan-view.component';
import { UiModule } from '../../ui/ui.module';
import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';

@NgModule({
  declarations: [WeekPlannerComponent, WeekPlannerPlanViewComponent],
  imports: [CommonModule, UiModule, CdkDropList, CdkDropListGroup, CdkDrag],
})
export class WeekPlannerModule {}
