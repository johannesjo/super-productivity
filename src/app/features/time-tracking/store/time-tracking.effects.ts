import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { auditTime, switchMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { selectTimeTrackingState } from './time-tracking.selectors';
import { TimeTrackingActions } from './time-tracking.actions';
import { TIME_TRACKING_TO_DB_INTERVAL } from '../../../app.constants';

@Injectable()
export class TimeTrackingEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _pfapiService = inject(PfapiService);

  saveToLs$: Observable<unknown> = this._store$.pipe(
    select(selectTimeTrackingState),
    take(1),
    switchMap((ttState) =>
      this._pfapiService.m.timeTracking.save(ttState, {
        isUpdateRevAndLastUpdate: true,
      }),
    ),
  );

  updateTimeTrackingStorageAuditTime$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          // TIME TRACKING
          TimeTrackingActions.addTimeSpent,
        ),
        auditTime(TIME_TRACKING_TO_DB_INTERVAL),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );

  updateTimeTrackingStorage$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TimeTrackingActions.updateWorkContextData),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );

  constructor() {}
}
