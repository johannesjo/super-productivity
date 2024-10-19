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
import { PlannerService } from '../planner.service';
import { first } from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { DateAdapter } from '@angular/material/core';
import {
  isTaskNotPlannedForToday,
  isTaskPlannedForToday,
} from '../../tasks/util/is-task-today';
import { WorkContextService } from '../../work-context/work-context.service';

@Component({
  selector: 'dialog-schedule-task',
  standalone: true,
  imports: [UiModule, CommonModule, FormsModule],
  templateUrl: './dialog-schedule-task.component.html',
  styleUrl: './dialog-schedule-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, fadeAnimation],
})
export class DialogScheduleTaskComponent implements AfterViewInit {
  T: typeof T = T;
  minDate = new Date();
  @ViewChild(MatCalendar, { static: true }) calendar!: MatCalendar<Date>;

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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { task: Task; targetDay?: string },
    private _matDialogRef: MatDialogRef<DialogScheduleTaskComponent>,
    private _cd: ChangeDetectorRef,
    private _store: Store,
    private _snackService: SnackService,
    private _datePipe: DatePipe,
    private _taskService: TaskService,
    private workContextService: WorkContextService,
    private _reminderService: ReminderService,
    private _plannerService: PlannerService,
    private readonly _dateAdapter: DateAdapter<unknown>,
  ) {}

  async ngAfterViewInit(): Promise<void> {
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
      const tzOffset = new Date().getTimezoneOffset() * 60 * 1000;
      this.selectedDate = new Date(this.data.task.plannedAt + tzOffset);
      this.selectedTime = new Date(this.data.task.plannedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } else {
      const plannerTaskMap = await this._plannerService.plannedTaskDayMap$
        .pipe(first())
        .toPromise();
      this.plannedDayForTask = plannerTaskMap[this.data.task.id];

      this.selectedDate = this.plannedDayForTask
        ? dateStrToUtcDate(this.plannedDayForTask)
        : this.data.task.tagIds.includes(TODAY_TAG.id)
          ? new Date()
          : null;
    }

    if (this.data.targetDay) {
      this.selectedDate = dateStrToUtcDate(this.data.targetDay);
    }

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
          new Date(this.calendar.activeDate).getTime()
      ) {
        this.submit();
      }
    } else {
      this.isShowEnterMsg = false;
    }
  }

  addToMyDay(): void {
    this._taskService.addTodayTag(this.data.task);
  }

  removeFromMyDay(): void {
    this._taskService.updateTags(
      this.data.task,
      this.data.task.tagIds.filter((tid) => tid !== TODAY_TAG.id),
    );
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
      this.calendar.activeDate = this.selectedDate;
    });
  }

  remove(): void {
    if (this.data.task.reminderId) {
      this._taskService.unScheduleTask(this.data.task.id, this.data.task.reminderId);
    } else if (this.plannedDayForTask === getWorklogStr()) {
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
        this.selectedDate = new Date();
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

      const isTodayI = isToday(newDate);
      this._taskService.scheduleTask(
        task,
        newDate.getTime(),
        this.selectedReminderCfgId,
        false,
      );
      if (isTodayI) {
        this.addToMyDay();
      } else {
        this.removeFromMyDay();
      }
    } else if (newDay === getWorklogStr()) {
      if (this.isTaskPlannedForToday()) {
        this.addToMyDay();

        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
          translateParams: { date: formattedDate },
        });
      } else {
        this.removeFromMyDay();
      }
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

  quickAccessBtnClick(item: number): void {
    const tDate = new Date();
    tDate.setMinutes(0, 0, 0);

    switch (item) {
      case 0:
        this.selectedDate = tDate;
        break;
      case 1:
        const tomorrow = tDate;
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.selectedDate = tomorrow;
        break;
      case 2:
        const nextFirstDayOfWeek = tDate;
        const dayOffset =
          (this._dateAdapter.getFirstDayOfWeek() -
            this._dateAdapter.getDayOfWeek(nextFirstDayOfWeek) +
            7) %
            7 || 7;
        nextFirstDayOfWeek.setDate(nextFirstDayOfWeek.getDate() + dayOffset);
        this.selectedDate = nextFirstDayOfWeek;
        break;
      case 3:
        const nextMonth = tDate;
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        this.selectedDate = nextMonth;
        break;
    }

    this.submit();
  }

  isTaskNotPlannedForToday(): boolean {
    return isTaskNotPlannedForToday(this.task);
  }

  isTaskPlannedForToday(): boolean {
    return isTaskPlannedForToday(this.task, this.workContextService.isToday);
  }
}
