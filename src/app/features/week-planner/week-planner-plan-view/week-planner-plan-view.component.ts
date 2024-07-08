import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'week-planner-plan-view',
  templateUrl: './week-planner-plan-view.component.html',
  styleUrl: './week-planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerPlanViewComponent {}
