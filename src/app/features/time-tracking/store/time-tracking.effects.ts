import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { concatMap } from 'rxjs/operators';
import { EMPTY, Observable } from 'rxjs';
import { TimeTrackingActions } from './time-tracking.actions';

@Injectable()
export class TimeTrackingEffects {
  loadTimeTrackings$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TimeTrackingActions.loadTimeTrackings),
      /** An EMPTY observable only emits completion. Replace with your own observable API request */
      concatMap(() => EMPTY as Observable<{ type: string }>),
    );
  });

  constructor(private actions$: Actions) {}
}
