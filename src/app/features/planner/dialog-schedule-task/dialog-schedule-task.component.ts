import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogRef,
} from '@angular/material/dialog';
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
import { DatePipe } from '@angular/common';
import { SnackService } from '../../../core/snack/snack.service';
import { removeReminderFromTask, unScheduleTask } from '../../tasks/store/task.actions';
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
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { DateAdapter, MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatFormField,
  MatLabel,
  MatPrefix,
  MatSuffix,
} from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatInput } from '@angular/material/input';

const DEFAULT_TIME = '09:00';

@Component({
  selector: 'dialog-schedule-task',
  imports: [
    FormsModule,
    MatTooltip,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatSelect,
    MatOption,
    TranslatePipe,
    MatButton,
    MatDialogActions,
    MatCalendar,
    MatInput,
    MatLabel,
    MatSuffix,
    MatPrefix,
  ],
  templateUrl: './dialog-schedule-task.component.html',
  styleUrl: './dialog-schedule-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, fadeAnimation],
})
export class DialogScheduleTaskComponent implements AfterViewInit {
  data = inject<{
    task: Task;
    targetDay?: string;
  }>(MAT_DIALOG_DATA);
  private _matDialogRef = inject<MatDialogRef<DialogScheduleTaskComponent>>(MatDialogRef);
  private _cd = inject(ChangeDetectorRef);
  private _store = inject(Store);
  private _snackService = inject(SnackService);
  private _datePipe = inject(DatePipe);
  private _taskService = inject(TaskService);
  private _reminderService = inject(ReminderService);
  private _translateService = inject(TranslateService);
  private readonly _dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);

  T: typeof T = T;
  minDate = new Date();
  readonly calendar = viewChild.required(MatCalendar);

  remindAvailableOptions: TaskReminderOption[] = TASK_REMINDER_OPTIONS;
  task: TaskCopy = this.data.task;

  selectedDate: Date | string | null = null;
  selectedTime: string | null = null;
  selectedReminderCfgId!: TaskReminderOptionId;

  plannedDayForTask: string | null = null;
  isInitValOnTimeFocus: boolean = true;

  isShowEnterMsg = false;
  todayStr = getWorklogStr();
  // private _prevSelectedQuickAccessDate: Date | null = null;
  // private _prevQuickAccessAction: number | null = null;
  private _timeCheckVal: string | null = null;

  async ngAfterViewInit(): Promise<void> {
    if (this.data.task.reminderId) {
      const reminder = this._reminderService.getById(this.data.task.reminderId);
      if (reminder && this.data.task.dueWithTime) {
        this.selectedReminderCfgId = millisecondsDiffToRemindOption(
          this.data.task.dueWithTime,
          reminder.remindAt,
        );
      } else {
        console.warn('No reminder found for task', this.data.task);
      }
      // for tasks without anything scheduled
    } else if (!this.data.task.dueWithTime) {
      this.selectedReminderCfgId = TaskReminderOptionId.AtStart;
    } else {
      this.selectedReminderCfgId = TaskReminderOptionId.DoNotRemind;
    }

    if (this.data.task.dueWithTime) {
      const tzOffset = new Date().getTimezoneOffset() * 60 * 1000;
      this.selectedDate = new Date(this.data.task.dueWithTime + tzOffset);
      this.selectedTime = new Date(this.data.task.dueWithTime).toLocaleTimeString(
        'en-GB',
        {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      );
    } else {
      this.plannedDayForTask = this.data.task.dueDay || null;

      this.selectedDate = this.plannedDayForTask
        ? dateStrToUtcDate(this.plannedDayForTask)
        : null;
    }

    if (this.data.targetDay) {
      this.selectedDate = dateStrToUtcDate(this.data.targetDay);
    }

    this.calendar().activeDate = new Date(this.selectedDate || new Date());
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
    // setTimeout(() => {
    //   (
    //     document.querySelector('dialog-schedule-task button:nth-child(2)') as HTMLElement
    //   )?.focus();
    // });
  }

  onKeyDownOnCalendar(ev: KeyboardEvent): void {
    this._timeCheckVal = null;
    // console.log(ev.key, ev.keyCode);
    if (ev.key === 'Enter' || ev.keyCode === 32) {
      this.isShowEnterMsg = true;
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
          new Date(this.calendar().activeDate).getTime()
      ) {
        this.submit();
      }
    } else {
      this.isShowEnterMsg = false;
    }
  }

  onTimeKeyDown(ev: KeyboardEvent): void {
    // console.log('ev.key!', ev.key);
    if (ev.key === 'Enter') {
      this.isShowEnterMsg = true;

      if (this._timeCheckVal === this.selectedTime) {
        this.submit();
      }
      this._timeCheckVal = this.selectedTime;
    } else {
      this.isShowEnterMsg = false;
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
      this.calendar().activeDate = this.selectedDate;
    });
  }

  remove(): void {
    // TODO simplify
    if (this.data.task.reminderId) {
      this._store.dispatch(
        unScheduleTask({
          id: this.data.task.id,
          reminderId: this.data.task.reminderId,
        }),
      );
    } else if (this.plannedDayForTask === getWorklogStr()) {
      // to cover edge cases
      this._store.dispatch(
        unScheduleTask({
          id: this.data.task.id,
          reminderId: this.data.task.reminderId,
          isSkipToast: true,
        }),
      );

      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.REMOVED_PLAN_DATE,
        translateParams: { taskTitle: truncate(this.data.task.title) },
      });
    } else {
      this._store.dispatch(
        unScheduleTask({
          id: this.data.task.id,
          reminderId: this.data.task.reminderId,
          isSkipToast: true,
        }),
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
          this.selectedTime = DEFAULT_TIME;
        }
      } else {
        // get current time +1h
        this.selectedTime = getClockStringFromHours(new Date().getHours() + 1);
        this.selectedDate = new Date();
      }
    }
  }

  async submit(): Promise<void> {
    if (!this.selectedDate) {
      console.warn('no selected date');
      return;
    }

    const newDayDate = new Date(this.selectedDate);
    const newDay = getWorklogStr(newDayDate);

    this._handleReminderRemoval();

    if (this.selectedTime) {
      this._scheduleWithTime();
    } else if (this.data.task.dueDay === newDay) {
      const formattedDate =
        newDay == getWorklogStr()
          ? this._translateService.instant(T.G.TODAY_TAG_TITLE)
          : (this._datePipe.transform(newDay, 'shortDate') as string);
      this._snackService.open({
        type: 'CUSTOM',
        ico: 'info',
        msg: T.F.PLANNER.S.TASK_ALREADY_PLANNED,
        translateParams: { date: formattedDate },
      });
    } else {
      await this._planForDay(newDay);
    }

    this.close(true);
  }

  private _handleReminderRemoval(): void {
    if (
      this.selectedReminderCfgId === TaskReminderOptionId.DoNotRemind &&
      typeof this.data.task.reminderId === 'string'
    ) {
      this._store.dispatch(
        removeReminderFromTask({
          id: this.data.task.id,
          reminderId: this.data.task.reminderId,
          isSkipToast: true,
          isLeaveDueTime: true,
        }),
      );
    }
  }

  private _scheduleWithTime(): void {
    const task = this.data.task;
    const newDate = new Date(
      getDateTimeFromClockString(this.selectedTime as string, this.selectedDate as Date),
    );

    this._taskService.scheduleTask(
      task,
      newDate.getTime(),
      this.selectedReminderCfgId,
      false,
    );
    // TODO if we want this, we should add it as an effect
    // const isTodayI = isToday(newDate);
    // if (isTodayI) {
    //   this.addToToday();
    // }
  }

  private async _planForDay(newDay: string): Promise<void> {
    this._store.dispatch(
      PlannerActions.planTaskForDay({
        task: this.data.task,
        day: newDay,
        isShowSnack: true,
      }),
    );
  }

  quickAccessBtnClick(item: number): void {
    const tDate = new Date();
    tDate.setMinutes(0, 0, 0);

    switch (item) {
      case 1:
        this.selectedDate = tDate;
        break;
      case 2:
        const tomorrow = tDate;
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.selectedDate = tomorrow;
        break;
      case 3:
        const nextFirstDayOfWeek = tDate;
        const dayOffset =
          (this._dateAdapter.getFirstDayOfWeek() -
            this._dateAdapter.getDayOfWeek(nextFirstDayOfWeek) +
            7) %
            7 || 7;
        nextFirstDayOfWeek.setDate(nextFirstDayOfWeek.getDate() + dayOffset);
        this.selectedDate = nextFirstDayOfWeek;
        break;
      case 4:
        const nextMonth = tDate;
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        this.selectedDate = nextMonth;
        break;
    }

    this.submit();
  }
}
