import { inject, Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';

import { map, skip } from 'rxjs/operators';
import { AppStateActions } from './app-state.actions';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';

@Injectable()
export class AppStateEffects {
  private _globalTimeTrackingIntervalService = inject(GlobalTrackingIntervalService);

  setTodayStr$ = createEffect(() => {
    return this._globalTimeTrackingIntervalService.todayDateStr$.pipe(
      skip(1), // skip first since it should be already the default value
      map((todayStr) => AppStateActions.setTodayString({ todayStr })),
    );
  });
}
