import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../task.service';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { T } from '../../../t.const';
import { AddTaskReminderInterface } from './add-task-reminder-interface';
import { throttle } from 'helpful-decorators';
import { Task, TaskReminderOption, TaskReminderOptionId } from '../task.model';
import { millisecondsDiffToRemindOption } from '../util/remind-option-to-milliseconds';
import { LS_LAST_IS_MOVE_SCHEDULED_TO_BACKLOG } from '../../../core/persistence/ls-keys.const';

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

  dateTime?: number = this.task.plannedAt || undefined;
  isShowMoveToBacklog: boolean =
    !!this.task.projectId && this.task.parentId === null && !this.task.repeatCfgId;
  isMoveToBacklog: boolean;
  // TODO make translatable
  remindAvailableOptions: TaskReminderOption[] = [
    {
      // id: TaskReminderOptionId.DoNotRemind,
      // title: 'Dont show reminder',
      // }, {
      id: TaskReminderOptionId.AtStart,
      title: T.F.TASK.D_REMINDER_ADD.RO_START,
    },
    {
      id: TaskReminderOptionId.m5,
      title: T.F.TASK.D_REMINDER_ADD.RO_5M,
    },
    {
      id: TaskReminderOptionId.m10,
      title: T.F.TASK.D_REMINDER_ADD.RO_10M,
    },
    {
      id: TaskReminderOptionId.m15,
      title: T.F.TASK.D_REMINDER_ADD.RO_15M,
    },
    {
      id: TaskReminderOptionId.m30,
      title: T.F.TASK.D_REMINDER_ADD.RO_30M,
    },
    {
      id: TaskReminderOptionId.h1,
      title: T.F.TASK.D_REMINDER_ADD.RO_1H,
    },
  ];
  selectedReminderCfgId: TaskReminderOptionId;

  constructor(
    private _taskService: TaskService,
    private _reminderService: ReminderService,
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

    // default move to backlog setting
    // -------------------------------
    const lsLastIsMoveToBacklog = localStorage.getItem(
      LS_LAST_IS_MOVE_SCHEDULED_TO_BACKLOG,
    );
    // NOTE: JSON.parse is good for parsing string booleans
    const lastIsMoveToBacklog =
      lsLastIsMoveToBacklog && JSON.parse(lsLastIsMoveToBacklog);
    if (this.isEdit) {
      this.isMoveToBacklog = false;
    } else {
      this.isMoveToBacklog =
        this.isShowMoveToBacklog && typeof lastIsMoveToBacklog === 'boolean'
          ? lastIsMoveToBacklog
          : this.isShowMoveToBacklog;
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, { leading: true, trailing: false })
  save() {
    const timestamp = this.dateTime;

    if (!timestamp) {
      return;
    }

    if (this.isEdit && this.reminder) {
      this._taskService.reScheduleTask({
        taskId: this.task.id,
        reminderId: this.task.reminderId as string,
        plannedAt: timestamp,
        remindCfg: this.selectedReminderCfgId,
        title: this.task.title,
      });
      this.close();
    } else {
      this._taskService.scheduleTask(
        this.task,
        timestamp,
        this.selectedReminderCfgId,
        this.isMoveToBacklog,
      );
      localStorage.setItem(
        LS_LAST_IS_MOVE_SCHEDULED_TO_BACKLOG,
        this.isMoveToBacklog + '',
      );
      this.close();
    }
  }

  // NOTE: throttle is used as quick way to prevent multiple submits
  @throttle(2000, { leading: true, trailing: false })
  remove() {
    if (!this.reminder || !this.reminder.id) {
      console.log(this.reminder, this.task);
      throw new Error('No reminder or id');
    }
    this._taskService.unScheduleTask(this.task.id, this.reminder.id);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }

  trackByIndex(i: number, p: any) {
    return i;
  }
}
