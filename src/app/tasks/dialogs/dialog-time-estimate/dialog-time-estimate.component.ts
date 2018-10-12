import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Task } from '../../task.model';
import { TaskService } from '../../task.service';
import { formatWorklogDateStr } from '../../../util/format-worklog-date-str';
import { getTodayStr } from '../../util/get-today-str';

@Component({
  selector: 'dialog-time-estimate',
  templateUrl: './dialog-time-estimate.component.html',
  styleUrls: ['./dialog-time-estimate.component.scss'],
})
export class DialogTimeEstimateComponent {
  todayStr: string;
  task: Task;
  taskCopy: Task;
  isAddForAnotherDayFormVisible: boolean;
  timeSpentOnDayCopy: any;
  newEntry: any;


  constructor(public dialogRef: MatDialogRef<DialogTimeEstimateComponent>,
              private _taskService: TaskService,
              @Inject(MAT_DIALOG_DATA) public data: any) {
    this.task = this.data.task;
    this.todayStr = getTodayStr();
    this._taskService = _taskService;
    this.taskCopy = Object.assign({}, this.task);
    this.timeSpentOnDayCopy = this.taskCopy.timeSpentOnDay || {};
    console.log(this.taskCopy);
  }


  submit() {
    this._taskService.update(this.taskCopy.id, {
      timeEstimate: this.taskCopy.timeEstimate,
      timeSpentOnDay: this.timeSpentOnDayCopy,
    });
    this.dialogRef.close({
      timeEstimate: this.taskCopy.timeEstimate,
      timeSpentOnDay: this.timeSpentOnDayCopy,
    });
  }


  createEmptyNewEntryForADay() {
    return {
      date: '',
      timeSpent: ''
    };
  }

  showAddForAnotherDayForm() {
    this.newEntry = this.createEmptyNewEntryForADay();
    this.isAddForAnotherDayFormVisible = true;
  }

  addNewEntry() {
    const strDate = formatWorklogDateStr(this.newEntry.date);
    this.timeSpentOnDayCopy[strDate] = this.newEntry.timeSpent;
    console.log(strDate, this.timeSpentOnDayCopy);
    this.isAddForAnotherDayFormVisible = false;

  }

  deleteValue(strDate) {
    delete this.timeSpentOnDayCopy[strDate];
  }
}
