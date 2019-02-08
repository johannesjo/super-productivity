import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { Observable } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminder.component.html',
  styleUrls: ['./dialog-view-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewTaskReminderComponent {
  task$: Observable<Task> = this._taskService.getById(this.data.reminder.relatedId);

  private _reminder: Reminder;

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewTaskReminderComponent>,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this._reminder = this.data.reminder;
  }

  play() {
    this.task$.pipe(take(1)).subscribe((task) => {
      if (task.parentId) {
        this._taskService.moveToToday(task.parentId, true);
      } else {
        this._taskService.moveToToday(this._reminder.relatedId, true);
      }
      this._taskService.setCurrentId(this._reminder.relatedId);
      this.dismiss();
    });
  }

  dismiss() {
    this._taskService.update(this._reminder.relatedId, {
      reminderId: null,
    });
    this._reminderService.removeReminder(this._reminder.id);
    this.close();
  }

  snooze() {
    this._reminderService.updateReminder(this._reminder.id, {
      remindAt: Date.now() + (10 * 60 * 1000)
    });
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
