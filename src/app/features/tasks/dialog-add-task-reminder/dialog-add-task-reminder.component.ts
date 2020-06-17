import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TaskService} from '../task.service';
import {ReminderCopy} from '../../reminder/reminder.model';
import {ReminderService} from '../../reminder/reminder.service';
import {SnackService} from '../../../core/snack/snack.service';
import {T} from '../../../t.const';
import {AddTaskReminderInterface} from './add-task-reminder-interface';
import {WorkContextService} from '../../work-context/work-context.service';
import {throttle} from 'helpful-decorators';

@Component({
  selector: 'dialog-add-task-reminder',
  templateUrl: './dialog-add-task-reminder.component.html',
  styleUrls: ['./dialog-add-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogAddTaskReminderComponent {
  T = T;
  task = this.data.task;
  reminder: ReminderCopy = this.task.reminderId && this._reminderService.getById(this.task.reminderId);
  isEdit: boolean = !!(this.reminder && this.reminder.id);

  dateTime: number = this.reminder && this.reminder.remindAt;
  isShowMoveToBacklog: boolean = (!this.isEdit && !!this.task.projectId);
  isMoveToBacklog: boolean = (this.isShowMoveToBacklog);

  constructor(
    private _taskService: TaskService,
    private _snackService: SnackService,
    private _workContextService: WorkContextService,
    private _reminderService: ReminderService,
    private _matDialogRef: MatDialogRef<DialogAddTaskReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddTaskReminderInterface,
  ) {
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, {leading: true, trailing: false})
  save() {
    const timestamp = this.dateTime;

    if (!timestamp) {
      return;
    }

    if (this.isEdit) {
      this._taskService.updateReminder(
        this.task.id,
        this.reminder.id,
        timestamp,
        this.task.title,
      );
      this.close();
    } else {
      this._taskService.addReminder(
        this.task,
        timestamp,
        this.isMoveToBacklog,
      );
      this.close();
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, {leading: true, trailing: false})
  remove() {
    this._taskService.removeReminder(this.task.id, this.reminder.id);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}

