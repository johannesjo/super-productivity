import { ChangeDetectionStrategy, Component, HostListener, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../task.service';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { T } from '../../../t.const';
import { AddTaskReminderInterface } from './add-task-reminder-interface';
import { throttle } from 'helpful-decorators';
import { Task, TaskReminderOption, TaskReminderOptionId } from '../task.model';
import { millisecondsDiffToRemindOption } from '../util/remind-option-to-milliseconds';
import { LS } from '../../../core/persistence/storage-keys.const';
import { isToday } from '../../../util/is-today.util';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { TASK_REMINDER_OPTIONS } from './task-reminder-options.const';

@Component({
  selector: 'dialog-add-task-reminder',
  templateUrl: './dialog-add-task-reminder.component.html',
  styleUrls: ['./dialog-add-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddTaskReminderComponent {
  T: typeof T = T;
  task: Task = this.data.task;
  reminder?: ReminderCopy = this.task.reminderId
    ? this._reminderService.getById(this.task.reminderId) || undefined
    : undefined;
  isEdit: boolean = !!(this.reminder && this.reminder.id);

  isLastDateToday = true;

  dateTime?: number = this.task.plannedAt || undefined;
  isShowMoveToBacklog: boolean =
    !!this.task.projectId && this.task.parentId === null && !this.task.repeatCfgId;
  isMoveToBacklog: boolean = false;
  // TODO make translatable
  remindAvailableOptions: TaskReminderOption[] = TASK_REMINDER_OPTIONS;
  selectedReminderCfgId: TaskReminderOptionId;

  constructor(
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    private _matDialog: MatDialog,
    private _matDialogRef: MatDialogRef<DialogAddTaskReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddTaskReminderInterface,
  ) {
    if (this.isEdit) {
      this.selectedReminderCfgId = millisecondsDiffToRemindOption(
        this.task.plannedAt as number,
        this.reminder?.remindAt,
      );
    } else {
      this.selectedReminderCfgId = TaskReminderOptionId.AtStart;
    }

    this.updateMoveToBacklog();
  }

  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent): void {
    if (this.isShowMoveToBacklog && ev.key.toLowerCase() === 'b') {
      this.isMoveToBacklog = !this.isMoveToBacklog;
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, { leading: true, trailing: false })
  save(): void {
    const timestamp = this.dateTime;

    if (!timestamp) {
      return;
    }

    if (this.isEdit && this.reminder) {
      this._taskService.reScheduleTask({
        task: this.task,
        plannedAt: timestamp,
        remindCfg: this.selectedReminderCfgId,
        isMoveToBacklog: this.isMoveToBacklog,
      });
      localStorage.setItem(this.getLSKey(), this.isMoveToBacklog + '');
      this.close(true);
    } else {
      if (!!this.task.repeatCfgId && !isToday(timestamp)) {
        this._matDialog
          .open(DialogConfirmComponent, {
            restoreFocus: true,
            data: {
              message: T.F.TASK.D_REMINDER_ADD.CONFIRM_REPEAT_TXT,
              okTxt: T.F.TASK.D_REMINDER_ADD.CONFIRM_REPEAT_OK,
            },
          })
          .afterClosed()
          .subscribe((isConfirm: boolean) => {
            if (isConfirm) {
              this._taskService.scheduleTask(
                this.task,
                timestamp,
                this.selectedReminderCfgId,
                this.isMoveToBacklog,
              );
              localStorage.setItem(this.getLSKey(), this.isMoveToBacklog + '');
              this.close(true);
            }
          });
      } else {
        this._taskService.scheduleTask(
          this.task,
          timestamp,
          this.selectedReminderCfgId,
          this.isMoveToBacklog,
        );
        localStorage.setItem(this.getLSKey(), this.isMoveToBacklog + '');
        this.close(true);
      }
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, { leading: true, trailing: false })
  remove(): void {
    if (!this.reminder || !this.reminder.id) {
      console.log(this.reminder, this.task);
      throw new Error('No reminder or id');
    }
    this._taskService.unScheduleTask(this.task.id, this.reminder.id);
    this.close(true);
  }

  close(wasEdited: boolean = false): void {
    this._matDialogRef.close(wasEdited);
  }

  onDateTimeChange(dateTime: number): void {
    const isLastDateToday = isToday(dateTime);
    if (isLastDateToday !== this.isLastDateToday) {
      this.isLastDateToday = isLastDateToday;
      this.updateMoveToBacklog();
    }
  }

  private updateMoveToBacklog(): void {
    // default move to backlog setting
    // -------------------------------
    const lsLastIsMoveToBacklog = localStorage.getItem(this.getLSKey());
    // NOTE: JSON.parse is good for parsing string booleans
    const lastIsMoveToBacklog =
      lsLastIsMoveToBacklog && JSON.parse(lsLastIsMoveToBacklog);
    // if (this.isEdit) {
    //   this.isMoveToBacklog = false;
    // } else {

    this.isMoveToBacklog =
      this.isShowMoveToBacklog && typeof lastIsMoveToBacklog === 'boolean'
        ? lastIsMoveToBacklog
        : this.isShowMoveToBacklog;
    // }

    console.log(this.isMoveToBacklog);
  }

  private getLSKey(): string {
    const LS_KEY = this.isEdit
      ? LS.LAST_IS_MOVE_SCHEDULED_TO_BACKLOG_EDIT
      : LS.LAST_IS_MOVE_SCHEDULED_TO_BACKLOG_ADD;
    const LS_KEY_TODAY = this.isEdit
      ? LS.LAST_IS_MOVE_SCHEDULED_TO_BACKLOG_EDIT_TODAY
      : LS.LAST_IS_MOVE_SCHEDULED_TO_BACKLOG_ADD_TODAY;

    return this.isLastDateToday ? LS_KEY_TODAY : LS_KEY;
  }
}
