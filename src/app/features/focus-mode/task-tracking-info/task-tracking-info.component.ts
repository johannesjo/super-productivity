import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { getTodayStr } from '../../tasks/util/get-today-str';
import { TaskService } from '../../tasks/task.service';

@Component({
  selector: 'task-tracking-info',
  standalone: true,
  imports: [MatIcon, MatTooltipModule, MsToStringPipe],
  template: `
    @if (currentTask() && (showTitle() || currentTaskTimeToday() > 0)) {
      <div
        class="task-tracking-info"
        (click)="onTaskClick()"
        [matTooltip]="'Pause tracking'"
        role="button"
        tabindex="0"
        aria-label="Pause tracking for current task"
        @expand
      >
        @if (showTitle()) {
          <div class="task-title">{{ currentTask()?.title }}</div>
        }
        @if (currentTaskTimeToday() > 0) {
          <small>
            <mat-icon class="play-icon">play_arrow</mat-icon>
            {{ currentTaskTimeToday() | msToString: true }}
          </small>
        }
      </div>
    }
  `,
  styleUrls: ['./task-tracking-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class TaskTrackingInfoComponent {
  private readonly _store = inject(Store);
  private readonly _taskService = inject(TaskService);

  // Input to control whether to show the task title
  showTitle = input<boolean>(true);

  // Get current task and its tracking info
  currentTask = toSignal(this._store.select(selectCurrentTask));

  // Computed property to get today's tracked time for the current task
  currentTaskTimeToday = computed(() => {
    const task = this.currentTask();
    if (!task) return 0;
    const todayStr = getTodayStr();
    return task.timeSpentOnDay[todayStr] || 0;
  });

  // Click handler to pause the current task
  onTaskClick(): void {
    const task = this.currentTask();
    if (task) {
      this._taskService.pauseCurrent();
    }
  }
}
