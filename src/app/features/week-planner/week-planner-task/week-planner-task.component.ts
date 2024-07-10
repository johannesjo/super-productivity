import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskCopy } from '../../tasks/task.model';

@Component({
  selector: 'week-planner-task',
  templateUrl: './week-planner-task.component.html',
  styleUrl: './week-planner-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerTaskComponent {
  @Input({ required: true }) task!: TaskCopy;
}
