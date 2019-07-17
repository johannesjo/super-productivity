import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Task, TaskWithIssueData} from '../task.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {TaskService} from '../task.service';
import {T} from '../../../t.const';

@Component({
  selector: 'task-summary-table',
  templateUrl: './task-summary-table.component.html',
  styleUrls: ['./task-summary-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskSummaryTableComponent {
  @Input() flatTasks: TaskWithIssueData[];
  @Input() day: string = getWorklogStr();

  T = T;

  constructor(
    private _taskService: TaskService,
  ) {
  }

  updateTimeSpentTodayForTask(task: Task, newVal: number | string) {
    this._taskService.update(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [this.day]: +newVal,
      }
    });
  }

  toggleTaskDone(task: Task) {
    task.isDone
      ? this._taskService.setUnDone(task.id)
      : this._taskService.setDone(task.id);
  }
}
