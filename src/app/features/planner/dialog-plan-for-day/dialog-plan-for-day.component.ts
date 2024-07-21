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
import { Task } from '../../tasks/task.model';
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

@Component({
  selector: 'dialog-plan-for-day',
  standalone: true,
  imports: [UiModule, CommonModule],
  templateUrl: './dialog-plan-for-day.component.html',
  styleUrl: './dialog-plan-for-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogPlanForDayComponent implements AfterViewInit {
  T: typeof T = T;
  selectedDate: string | null = null;
  minDate = new Date().toISOString();
  @ViewChild(MatCalendar, { static: true }) calendar!: MatCalendar<Date>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { task: Task; day?: string },
    private _matDialogRef: MatDialogRef<DialogPlanForDayComponent>,
    private _cd: ChangeDetectorRef,
    private _store: Store,
    private _snackService: SnackService,
    private _datePipe: DatePipe,
  ) {
    console.log(this.data);

    this.selectedDate = data.day || new Date().toISOString();
  }

  ngAfterViewInit(): void {
    this.calendar.activeDate = new Date(this.selectedDate as any);
    this._cd.detectChanges();
    (
      document.querySelector('.mat-calendar-body-selected') as HTMLElement
    )?.parentElement?.focus();
    this.selectedDate = this.data.day || new Date().toISOString();
  }

  save(): void {}

  close(isSuccess): void {
    this._matDialogRef.close(isSuccess);
  }

  dateSelected(ev: Date): void {
    console.log(ev);
    const newDay = getWorklogStr(ev);

    const formattedDate = this._datePipe.transform(newDay, 'shortDate') as string;

    if (newDay === getWorklogStr()) {
      this._store.dispatch(
        updateTaskTags({
          task: this.data.task,
          newTagIds: [...this.data.task.tagIds, TODAY_TAG.id],
          oldTagIds: this.data.task.tagIds,
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

  remove(): void {
    if (this.data.day === getWorklogStr()) {
      this._store.dispatch(
        updateTaskTags({
          task: this.data.task,
          newTagIds: this.data.task.tagIds.filter((id) => id !== TODAY_TAG.id),
          oldTagIds: this.data.task.tagIds,
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
}
