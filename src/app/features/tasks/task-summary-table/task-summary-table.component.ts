import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {Task} from '../task.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {TaskService} from '../task.service';
import {T} from '../../../t.const';
import { IssueService } from '../../issue/issue.service';

@Component({
  selector: 'task-summary-table',
  templateUrl: './task-summary-table.component.html',
  styleUrls: ['./task-summary-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskSummaryTableComponent {
  @Input() flatTasks: Task[];
  @Input() day: string = getWorklogStr();
  @Output() updated = new EventEmitter<void>();

  T = T;

  constructor(
    private _taskService: TaskService,
    private _issueService: IssueService,
  ) {
  }

  updateTimeSpentTodayForTask(task: Task, newVal: number | string) {
    this._taskService.update(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [this.day]: +newVal,
      }
    });
    this.updated.emit();
  }

  updateTaskTitle(task: Task, newVal: string) {
    this._taskService.update(task.id, {
      title: newVal
    });
    this.updated.emit();
  }

  toggleTaskDone(task: Task) {
    if (task.isDone) {
      this._taskService.setUnDone(task.id);
      this._issueService.reopenIssue(task);
    } else {
      this._taskService.setDone(task.id);
      this._issueService.closeIssue(task);
    }
    this.updated.emit();
  }
}
