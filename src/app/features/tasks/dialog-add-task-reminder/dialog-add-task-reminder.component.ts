import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { SnackService } from '../../../core/snack/snack.service';

@Component({
  selector: 'dialog-add-task-reminder',
  templateUrl: './dialog-add-task-reminder.component.html',
  styleUrls: ['./dialog-add-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddTaskReminderComponent {
  public date: string;
  public title: string;
  public isEdit: boolean;
  public isMoveToBacklog: boolean;
  public reminder: ReminderCopy;
  public task: Task;

  constructor(
    private _taskService: TaskService,
    private _snackService: SnackService,
    private _reminderService: ReminderService,
    private _matDialogRef: MatDialogRef<DialogAddTaskReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
  ) {
    this.task = this.data.task;
    this.reminder = this.task.reminderId && {
      ...this._reminderService.getById(this.data.task.reminderId)
    };
    this.isEdit = !!(this.reminder && this.reminder.id);
    this.isMoveToBacklog = !this.isEdit && !this.task.parentId;

    this.title = this.task.title;
  }

  save() {
    const timestamp = this.date && new Date(this.date).getTime();

    if (!timestamp || !this.title) {
      return;
    }

    // if (this.isEdit) {
    //   this._taskService.updateReminder(
    //     this.task.id,
    //     this.reminder.id,
    //     timestamp,
    //     this.title,
    //   );
    //   this.close();
    // } else {
    //   this._taskService.addReminder(
    //     this.task.id,
    //     timestamp,
    //     this.title,
    //   );
    //   this.close();
    // }
  }

  remove() {
    // this._taskService.removeReminder(this.task.id, this.reminder.id);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }

  // TODO check why we're off by one hour
  private _convertDate(date: Date): string {
    const isoStr = date.toISOString();
    return isoStr.substring(0, isoStr.length - 1);
  }
}
