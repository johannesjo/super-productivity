import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminder.component.html',
  styleUrls: ['./dialog-view-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewTaskReminderComponent implements OnDestroy {
  task$: Observable<Task> = this._taskService.getById(this.data.reminder.relatedId);
  task: Task;
  reminder: Reminder;

  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewTaskReminderComponent>,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this.reminder = this.data.reminder;
    this._subs.add(this.task$.pipe(take(1)).subscribe(task => this.task = task));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  play() {
    if (this.task.parentId) {
      this._taskService.moveToToday(this.task.parentId, true);
    } else {
      this._taskService.moveToToday(this.reminder.relatedId, true);
    }
    this._taskService.setCurrentId(this.reminder.relatedId);
    this.dismiss();
  }

  dismiss() {
    if (this.task) {
      this._taskService.update(this.reminder.relatedId, {
        reminderId: null,
      });
    }
    this._reminderService.removeReminder(this.reminder.id);
    this.close();
  }

  snooze() {
    this._reminderService.updateReminder(this.reminder.id, {
      remindAt: Date.now() + (10 * 60 * 1000)
    });
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }
}
