import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { T } from '../../../t.const';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ScheduleItemType, WeekPlannerDay } from '../week-planner.model';
import { Store } from '@ngrx/store';
import { selectWeekPlannerDays } from '../store/week-planner.selectors';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { switchMap } from 'rxjs/operators';
import { WeekPlannerActions } from '../store/week-planner.actions';
import { TaskCopy } from '../../tasks/task.model';

@Component({
  selector: 'week-planner-plan-view',
  templateUrl: './week-planner-plan-view.component.html',
  styleUrl: './week-planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerPlanViewComponent {
  SCHEDULE_ITEM_TYPE = ScheduleItemType;
  // days$: Observable<WeekPlannerDay[]> = of(WEEK_PLANNER_DUMMY_DATA);
  daysToShow$ = of([
    getWorklogStr(),
    // eslint-disable-next-line no-mixed-operators
    getWorklogStr(new Date().getTime() + 24 * 60 * 60 * 1000),
    // eslint-disable-next-line no-mixed-operators
    getWorklogStr(new Date().getTime() + 48 * 60 * 60 * 1000),
  ]);
  days$: Observable<WeekPlannerDay[]> = this.daysToShow$.pipe(
    switchMap((daysToShow) => this._store.select(selectWeekPlannerDays(daysToShow))),
  );

  protected readonly remindAvailableOptions = TASK_REMINDER_OPTIONS;
  protected readonly T = T;

  constructor(private _store: Store) {}

  // TODO correct type
  drop(
    targetList: 'TODO' | 'SCHEDULED',
    ev: CdkDragDrop<string, string, TaskCopy>,
  ): void {
    if (targetList === 'SCHEDULED') {
      console.log('SCHEDULED');
      console.log(ev);
      // TODO show schedule dialog
      return;
    }

    if (ev.previousContainer === ev.container) {
      this._store.dispatch(
        WeekPlannerActions.moveInList({
          targetDay: ev.container.data,
          fromIndex: ev.previousIndex,
          toIndex: ev.currentIndex,
        }),
      );
    } else {
      console.log(targetList, ev);
      this._store.dispatch(
        WeekPlannerActions.transferTask({
          tId: ev.item.data.id,
          prevDay: ev.previousContainer.data,
          newDay: ev.container.data,
          targetIndex: ev.currentIndex,
        }),
      );
      // transferArrayItem(
      //   ev.previousContainer.data,
      //   ev.container.data,
      //   ev.previousIndex,
      //   ev.currentIndex,
      // );
      // if (targetList === 'TODO') {
      //   const item = ev.container.data[ev.currentIndex];
      //   if (item.type) {
      //     // TODO remove reminder
      //     ev.container.data[ev.currentIndex] = item.task;
      //   }
      // }
    }
  }
}
