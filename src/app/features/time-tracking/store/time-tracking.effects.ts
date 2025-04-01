import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { switchMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { selectTimeTrackingState } from './time-tracking.selectors';
import { TimeTrackingActions } from './time-tracking.actions';
import { addTimeSpent } from '../../tasks/store/task.actions';

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

  updateTimeTrackingStorage$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTimeSpent, TimeTrackingActions.updateWorkContextData),
        switchMap(() => this.saveToLs$),
      ),
    { dispatch: false },
  );

  constructor() {}
}
