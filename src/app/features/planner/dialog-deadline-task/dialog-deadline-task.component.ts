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
import { Task, TaskCopy } from '../../tasks/task.model';
import { T } from 'src/app/t.const';
import { MatCalendar } from '@angular/material/datepicker';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { DatePipe } from '@angular/common';
import { SnackService } from '../../../core/snack/snack.service';
import { truncate } from '../../../util/truncate';
import { FormsModule } from '@angular/forms';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { TaskService } from '../../tasks/task.service';
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
  templateUrl: './dialog-deadline-task.component.html',
  styleUrl: './dialog-deadline-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, fadeAnimation],
})
export class DialogDeadlineTaskComponent implements AfterViewInit {
  data = inject<{
    task: Task;
    targetDay?: string;
  }>(MAT_DIALOG_DATA);
  private _matDialogRef = inject<MatDialogRef<DialogDeadlineTaskComponent>>(MatDialogRef);
  private _cd = inject(ChangeDetectorRef);
  private _snackService = inject(SnackService);
  private _datePipe = inject(DatePipe);
  private _taskService = inject(TaskService);
  private _translateService = inject(TranslateService);
  private readonly _dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);

  T: typeof T = T;
  minDate = new Date();
  readonly calendar = viewChild.required(MatCalendar);

  task: TaskCopy = this.data.task;

  selectedDate: Date | string | null = null;

  setDeadlineForTask: string | null = null;

  isShowEnterMsg = false;

  async ngAfterViewInit(): Promise<void> {
    this.setDeadlineForTask = this.data.task.deadline || null;

    this.selectedDate = this.setDeadlineForTask
      ? dateStrToUtcDate(this.setDeadlineForTask)
      : null;

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
  }

  onKeyDownOnCalendar(ev: KeyboardEvent): void {
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
    this._taskService.update(this.data.task.id, { deadline: undefined });

    this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.TASK.D_DEADLINE_TASK.REMOVED_DEADLINE,
      translateParams: { taskTitle: truncate(this.data.task.title) },
    });

    this.close(true);
  }

  async submit(): Promise<void> {
    if (!this.selectedDate) {
      console.warn('no selected date');
      return;
    }

    const newDayDate = new Date(this.selectedDate);
    const newDay = getWorklogStr(newDayDate);

    if (this.data.task.deadline === newDay) {
      const formattedDate =
        newDay == getWorklogStr()
          ? this._translateService.instant(T.G.TODAY_TAG_TITLE)
          : (this._datePipe.transform(newDay, 'shortDate') as string);
      this._snackService.open({
        type: 'CUSTOM',
        ico: 'info',
        msg: T.F.TASK.D_DEADLINE_TASK.DEADLINE_ALREADY_SET,
        translateParams: { date: formattedDate },
      });
    } else {
      await this._setDeadline(newDay);
    }

    this.close(true);
  }

  private async _setDeadline(newDay: string): Promise<void> {
    this._taskService.update(this.data.task.id, { deadline: newDay });
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
