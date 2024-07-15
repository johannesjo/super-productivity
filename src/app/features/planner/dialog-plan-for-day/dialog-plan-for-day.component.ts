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
import { CommonModule } from '@angular/common';

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
  ) {
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

  close(): void {
    this._matDialogRef.close();
  }

  dateSelected(ev: Date): void {
    console.log(ev);
    this._store.dispatch(
      PlannerActions.planTaskForDay({ task: this.data.task, day: getWorklogStr(ev) }),
    );

    this.close();
  }
}
