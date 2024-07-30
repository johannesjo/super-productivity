import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '../../core/base-component/base.component';
import { Store } from '@ngrx/store';
import { DateService } from '../../core/date/date.service';
import { LayoutService } from '../../core-ui/layout/layout.service';

@Component({
  selector: 'planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerComponent extends BaseComponent {
  isPanelOpen = false;

  constructor(
    private _store: Store,
    private _dateService: DateService,
    public layoutService: LayoutService,
  ) {
    super();

    // this._store
    //   .select(selectTodayTaskIds)
    //   .pipe(
    //     takeUntil(this.onDestroy$),
    //     // TODO check if enough
    //     distinctUntilChanged((a, b) => a.length === b.length),
    //     // delay needed for all effects to be executed and task not being scheduled any more
    //     delay(100),
    //   )
    //   .pipe(
    //     switchMap(() =>
    //       this._store
    //         .select(selectTodayTasksWithPlannedAndDoneSeperated)
    //         .pipe(
    //           takeUntil(this.onDestroy$),
    //           withLatestFrom(this._store.select(selectTaskFeatureState)),
    //           first(),
    //         ),
    //     ),
    //   )
    //   .subscribe(([{ planned, done, normal }, taskState]) => {
    //     this._store.dispatch(
    //       PlannerActions.upsertPlannerDayTodayAndCleanupOldAndUndefined({
    //         today: this._dateService.todayStr(),
    //         taskIdsToAdd: normal.map((task) => task.id),
    //         allTaskStateIds: taskState.ids as string[],
    //       }),
    //     );
    //   });
  }
}
