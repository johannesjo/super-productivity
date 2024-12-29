import { ChangeDetectionStrategy, Component, input, output, inject } from '@angular/core';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { T } from '../../../t.const';
import { DateService } from 'src/app/core/date/date.service';

@Component({
  selector: 'task-summary-table',
  templateUrl: './task-summary-table.component.html',
  styleUrls: ['./task-summary-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TaskSummaryTableComponent {
  private _taskService = inject(TaskService);
  private _dateService = inject(DateService);

  readonly flatTasks = input<Task[]>([]);
  readonly day = input<string>(this._dateService.todayStr());
  readonly updated = output<void>();

  T: typeof T = T;

  updateTimeSpentTodayForTask(task: Task, newVal: number | string): void {
    this._taskService.updateEverywhere(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [this.day()]: +newVal,
      },
    });
    this.updated.emit();
  }

  updateTaskTitle(task: Task, newVal: string): void {
    this._taskService.updateEverywhere(task.id, {
      title: newVal,
    });
    this.updated.emit();
  }

  toggleTaskDone(task: Task): void {
    this._taskService.updateEverywhere(task.id, {
      isDone: !task.isDone,
    });
    // task.isDone
    //   ? this._taskService.setUnDone(task.id)
    //   : this._taskService.setDone(task.id);
    this.updated.emit();
  }
}
