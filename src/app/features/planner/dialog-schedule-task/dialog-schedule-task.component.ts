import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild,
} from '@angular/core';
import { UiModule } from '../../../ui/ui.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  Task,
  TaskCopy,
  TaskReminderOption,
  TaskReminderOptionId,
} from '../../tasks/task.model';
import { T } from 'src/app/t.const';
import { MatCalendar } from '@angular/material/datepicker';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../store/planner.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { CommonModule, DatePipe } from '@angular/common';
import { SnackService } from '../../../core/snack/snack.service';
import { updateTaskTags } from '../../tasks/store/task.actions';
import { TODAY_TAG } from '../../tag/tag.const';
import { truncate } from '../../../util/truncate';
import { TASK_REMINDER_OPTIONS } from './task-reminder-options.const';
import { FormsModule } from '@angular/forms';
import { millisecondsDiffToRemindOption } from '../../tasks/util/remind-option-to-milliseconds';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { getClockStringFromHours } from '../../../util/get-clock-string-from-hours';
import { isToday } from '../../../util/is-today.util';
import { TaskService } from '../../tasks/task.service';
import { ReminderService } from '../../reminder/reminder.service';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';

@Component({
  selector: 'dialog-schedule-task',
  standalone: true,
  imports: [UiModule, CommonModule, FormsModule],
  templateUrl: './dialog-schedule-task.component.html',
  styleUrl: './dialog-schedule-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
})
export class DialogScheduleTaskComponent implements AfterViewInit {
  T: typeof T = T;
  minDate = new Date().toISOString();
  @ViewChild(MatCalendar, { static: true }) calendar!: MatCalendar<Date>;

  remindAvailableOptions: TaskReminderOption[] = TASK_REMINDER_OPTIONS;
  task: TaskCopy = this.data.task;

  selectedDate: Date | string | null = null;
  selectedTime: string | null = null;
  selectedReminderCfgId!: TaskReminderOptionId;

  isInitValOnTimeFocus: boolean = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { task: Task; day?: string },
    private _matDialogRef: MatDialogRef<DialogScheduleTaskComponent>,
    private _cd: ChangeDetectorRef,
    private _store: Store,
    private _snackService: SnackService,
    private _datePipe: DatePipe,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
  ) {}

  ngAfterViewInit(): void {
    if (this.data.task.reminderId) {
      const reminder = this._reminderService.getById(this.data.task.reminderId);
      if (reminder) {
        this.selectedReminderCfgId = millisecondsDiffToRemindOption(
          this.data.task.plannedAt as number,
          reminder.remindAt,
        );
      } else {
        console.warn('No reminder found for task', this.data.task);
      }
    } else {
      this.selectedReminderCfgId = TaskReminderOptionId.AtStart;
    }

    if (this.data.task.plannedAt) {
      this.selectedDate = new Date(this.data.task.plannedAt);

      this.selectedTime = new Date(this.selectedDate).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } else {
      console.log(this.data.day);

      this.selectedDate =
        this.data.day ||
        (this.data.task.tagIds.includes(TODAY_TAG.id) ? new Date().toISOString() : null);
    }

    console.log(this.selectedDate);

    this.calendar.activeDate = new Date(this.selectedDate || new Date());
    this._cd.detectChanges();

    setTimeout(() => {
      this._focusInitially();
    });
    setTimeout(() => {
      this._focusInitially();
    }, 300);
  }

  private _focusInitially(): void {
    if (this.selectedDate) {
      (
        document.querySelector('.mat-calendar-body-selected') as HTMLElement
      )?.parentElement?.focus();
    } else {
      (
        document.querySelector('.mat-calendar-body-today') as HTMLElement
      )?.parentElement?.focus();
    }
  }

  onTimeKeyDown(ev: KeyboardEvent): void {
    console.log('ev.key!', ev.key);

    if (ev.key === 'Enter') {
      this._checkToSubmit();
    }
  }

  onKeyDownOnCalendar(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      this._checkToSubmit();
    }
  }

  onCalendarClick(ev: MouseEvent): void {
    if (
      (ev.target as HTMLElement)?.parentElement?.tagName === 'BUTTON' &&
      (ev.target as HTMLElement)?.parentElement?.classList.contains(
        'mat-calendar-body-active',
      )
    ) {
      this._checkToSubmit();
    }
  }

  private _checkToSubmit(): void {
    // console.log(
    //   'check to submit',
    //   this.selectedDate &&
    //     new Date(this.selectedDate).getTime() ===
    //       new Date(this.calendar.activeDate).getTime(),
    //   this.selectedDate,
    //   this.calendar.activeDate,
    // );
    if (
      this.selectedDate &&
      new Date(this.selectedDate).getTime() ===
        new Date(this.calendar.activeDate).getTime()
    ) {
      this.submit();
    }
  }

  close(isSuccess: boolean = false): void {
    this._matDialogRef.close(isSuccess);
  }

  dateSelected(newDate: Date): void {
    // console.log('dateSelected', typeof newDate, newDate, this.selectedDate);
    // we do the timeout is there to make sure this happens after our click handler
    setTimeout(() => {
      this.selectedDate = new Date(newDate);
      this.calendar.activeDate = this.selectedDate;
    });
  }

  remove(): void {
    if (this.data.day === getWorklogStr()) {
      // to cover edge cases
      this._store.dispatch(
        PlannerActions.removeTaskFromDays({ taskId: this.data.task.id }),
      );
      this._store.dispatch(
        updateTaskTags({
          task: this.data.task,
          newTagIds: this.data.task.tagIds.filter((id) => id !== TODAY_TAG.id),
        }),
      );
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.REMOVED_PLAN_DATE,
        translateParams: { taskTitle: truncate(this.data.task.title) },
      });
    } else {
      this._store.dispatch(
        PlannerActions.removeTaskFromDays({ taskId: this.data.task.id }),
      );
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.REMOVED_PLAN_DATE,
        translateParams: { taskTitle: truncate(this.data.task.title) },
      });
    }
    this.close(true);
  }

  onTimeClear(ev: MouseEvent): void {
    ev.stopPropagation();
    this.selectedTime = null;
    this.isInitValOnTimeFocus = true;
  }

  onTimeFocus(): void {
    console.log('onTimeFocus');
    if (!this.selectedTime && this.isInitValOnTimeFocus) {
      this.isInitValOnTimeFocus = false;

      if (this.selectedDate) {
        if (isToday(this.selectedDate as Date)) {
          this.selectedTime = getClockStringFromHours(new Date().getHours() + 1);
        } else {
          this.selectedTime = '09:00';
        }
      } else {
        // get current time +1h
        this.selectedTime = getClockStringFromHours(new Date().getHours() + 1);
        this.selectedDate = new Date().toISOString();
      }
    }
  }

  submit(): void {
    if (!this.selectedDate) {
      console.warn('no selected date');
      return;
    }

    const newDayDate = new Date(this.selectedDate);
    const newDay = getWorklogStr(newDayDate);
    const formattedDate = this._datePipe.transform(newDay, 'shortDate') as string;

    if (this.selectedTime) {
      const task = this.data.task;
      const newDate = new Date(
        getDateTimeFromClockString(this.selectedTime, this.selectedDate as Date),
      );

      const isTodayI = new Date().toDateString() === newDate.toDateString();
      this._taskService.scheduleTask(
        task,
        newDate.getTime(),
        this.selectedReminderCfgId,
        false,
      );
      if (isTodayI) {
        this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds]);
      } else {
        this._taskService.updateTags(
          task,
          task.tagIds.filter((tid) => tid !== TODAY_TAG.id),
        );
      }
    } else if (newDay === getWorklogStr()) {
      this._store.dispatch(
        updateTaskTags({
          task: this.data.task,
          newTagIds: [...this.data.task.tagIds, TODAY_TAG.id],
        }),
      );
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
        translateParams: { date: formattedDate },
      });
    } else {
      this._store.dispatch(
        PlannerActions.planTaskForDay({ task: this.data.task, day: newDay }),
      );
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
        translateParams: { date: formattedDate },
      });
    }
    this.close(true);
  }
}
