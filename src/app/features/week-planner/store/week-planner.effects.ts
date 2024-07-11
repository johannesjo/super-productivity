import { Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class WeekPlannerEffects {
  // loadWeekPlanners$ = createEffect(() => {
  //   return this.actions$.pipe(
  //
  //     ofType(WeekPlannerActions.loadWeekPlanners),
  //     concatMap(() =>
  //       /** An EMPTY observable only emits completion. Replace with your own observable API request */
  //       EMPTY.pipe(
  //         map(data => WeekPlannerActions.loadWeekPlannersSuccess({ data })),
  //         catchError(error => of(WeekPlannerActions.loadWeekPlannersFailure({ error }))))
  //     )
  //   );
  // });

  constructor(private actions$: Actions) {}
}
