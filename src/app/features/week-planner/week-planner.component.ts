import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'week-planner',
  templateUrl: './week-planner.component.html',
  styleUrl: './week-planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerComponent {
  isPanelOpen = true;
}
