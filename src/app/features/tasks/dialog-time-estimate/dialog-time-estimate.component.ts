import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Task, TaskCopy, TimeSpentOnDayCopy } from '../task.model';
import { TaskService } from '../task.service';
import { getTodayStr } from '../util/get-today-str';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { createTaskCopy } from '../util/create-task-copy';

interface NewTimeEntry {
  timeSpent: number;
  date: string;
}

@Component({
  selector: 'dialog-time-estimate',
  templateUrl: './dialog-time-estimate.component.html',
  styleUrls: ['./dialog-time-estimate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTimeEstimateComponent {
  todayStr: string;
  task: Task;
  taskCopy: TaskCopy;
  isAddForAnotherDayFormVisible: boolean;
  timeSpentOnDayCopy: TimeSpentOnDayCopy;
  newEntry: NewTimeEntry;

  constructor(private _matDialogRef: MatDialogRef<DialogTimeEstimateComponent>,
              private _taskService: TaskService,
              @Inject(MAT_DIALOG_DATA) public data: any) {
    this.task = this.data.task;
    this.todayStr = getTodayStr();
    this._taskService = _taskService;
    this.taskCopy = createTaskCopy(this.task);
    this.timeSpentOnDayCopy = this.taskCopy.timeSpentOnDay || {};
  }


  submit() {
    this._taskService.update(this.taskCopy.id, {
      timeEstimate: this.taskCopy.timeEstimate,
      timeSpentOnDay: this.timeSpentOnDayCopy,
    });
    this._matDialogRef.close({
      timeEstimate: this.taskCopy.timeEstimate,
      timeSpentOnDay: this.timeSpentOnDayCopy,
    });
  }


  createEmptyNewEntryForADay(): NewTimeEntry {
    return {
      date: '',
      timeSpent: 0
    };
  }

  showAddForAnotherDayForm() {
    this.newEntry = this.createEmptyNewEntryForADay();
    this.isAddForAnotherDayFormVisible = true;
  }

  addNewEntry() {
    const strDate = getWorklogStr(this.newEntry.date);
    this.timeSpentOnDayCopy[strDate] = this.newEntry.timeSpent;
    this.isAddForAnotherDayFormVisible = false;

  }

  deleteValue(strDate) {
    delete this.timeSpentOnDayCopy[strDate];
  }
}
