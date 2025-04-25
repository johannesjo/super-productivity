import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { T } from '../../../t.const';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerTaskComponent } from '../planner-task/planner-task.component';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { RoundDurationPipe } from '../../../ui/pipes/round-duration.pipe';
import { MatIcon } from '@angular/material/icon';
import { TaskCopy } from '../../tasks/task.model';

@Component({
  selector: 'planner-day-overdue',
  templateUrl: './planner-day-overdue.component.html',
  styleUrl: './planner-day-overdue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDropList,
    PlannerTaskComponent,
    CdkDrag,
    MatIcon,
    MsToStringPipe,
    RoundDurationPipe,
  ],
})
export class PlannerDayOverdueComponent {
  overdueTasks = input<TaskCopy[] | null>();
  totalEstimate = computed(() => {
    const tasks = this.overdueTasks();
    if (!tasks) return 0;
    return tasks.reduce((acc, task) => acc + (task.timeEstimate || 0), 0);
  });

  protected readonly T = T;

  enterPredicate(drag: CdkDrag, drop: CdkDropList): boolean {
    return false;
  }
}
