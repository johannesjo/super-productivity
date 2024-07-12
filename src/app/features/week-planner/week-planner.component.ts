import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '../../core/base-component/base.component';
import { first, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectTodayTasksWithPlannedAndDoneSeperated } from '../work-context/store/work-context.selectors';
import { WeekPlannerActions } from './store/week-planner.actions';
import { getWorklogStr } from '../../util/get-work-log-str';
import { selectTaskFeatureState } from '../tasks/store/task.selectors';

@Component({
  selector: 'week-planner',
  templateUrl: './week-planner.component.html',
  styleUrl: './week-planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerComponent extends BaseComponent {
  isPanelOpen = true;

  constructor(private _store: Store) {
    super();
    // TODO optimize later
    this._store
      .select(selectTodayTasksWithPlannedAndDoneSeperated)
      .pipe(
        takeUntil(this.onDestroy$),
        withLatestFrom(this._store.select(selectTaskFeatureState)),
        first(),
      )
      .subscribe(([{ planned, done, normal }, taskState]) => {
        this._store.dispatch(
          WeekPlannerActions.upsertWeekPlannerDayTodayAndCleanupOldAndUndefined({
            today: getWorklogStr(),
            taskIds: normal.map((task) => task.id),
            allTaskIds: taskState.ids as string[],
          }),
        );
      });
  }
}
