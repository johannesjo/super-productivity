import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
} from '@angular/core';
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
  readonly flatTasks = input<Task[]>([]);
  readonly day = input<string>(this._dateService.todayStr());
  @Output() updated: EventEmitter<void> = new EventEmitter();

  T: typeof T = T;

  constructor(
    private _taskService: TaskService,
    private _dateService: DateService,
  ) {}

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
