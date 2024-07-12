import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerModule } from '../../features/planner/planner.module';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, PlannerModule, UiModule],
})
export class PlannerPageModule {}
