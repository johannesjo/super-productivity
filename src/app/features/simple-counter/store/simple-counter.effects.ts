import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import {
  addSimpleCounter,
  deleteSimpleCounter,
  deleteSimpleCounters,
  increaseSimpleCounterCounterToday,
  setSimpleCounterCounterOff,
  setSimpleCounterCounterOn,
  setSimpleCounterCounterToday,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter,
} from './simple-counter.actions';
import { map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { selectSimpleCounterFeatureState } from './simple-counter.reducer';
import { SimpleCounterState, SimpleCounterType } from '../simple-counter.model';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { SimpleCounterService } from '../simple-counter.service';
import { EMPTY, Observable } from 'rxjs';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { DateService } from 'src/app/core/date/date.service';

@Injectable()
export class SimpleCounterEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _timeTrackingService = inject(GlobalTrackingIntervalService);
  private _dateService = inject(DateService);
  private _persistenceService = inject(PersistenceService);
  private _simpleCounterService = inject(SimpleCounterService);
  private _snackService = inject(SnackService);

  updateSimpleCountersStorage$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          updateAllSimpleCounters,
          setSimpleCounterCounterToday,
          increaseSimpleCounterCounterToday,
          setSimpleCounterCounterOn,
          setSimpleCounterCounterOff,
          // toggleSimpleCounterCounter,

          // currently not used
          addSimpleCounter,
          updateSimpleCounter,
          upsertSimpleCounter,
          deleteSimpleCounter,
          deleteSimpleCounters,
        ),
        withLatestFrom(this._store$.pipe(select(selectSimpleCounterFeatureState))),
        tap(([, featureState]) => this._saveToLs(featureState)),
      ),
    { dispatch: false },
  );

  checkTimedCounters$: Observable<unknown> = createEffect(() =>
    this._simpleCounterService.enabledAndToggledSimpleCounters$.pipe(
      switchMap((itemsI) => {
        const items = itemsI.filter((item) => item.type === SimpleCounterType.StopWatch);
        return items && items.length
          ? this._timeTrackingService.tick$.pipe(map((tick) => ({ tick, items })))
          : EMPTY;
      }),
      mergeMap(({ items, tick }) => {
        const today = this._dateService.todayStr();
        return items.map((item) =>
          increaseSimpleCounterCounterToday({
            id: item.id,
            increaseBy: tick.duration,
            today,
          }),
        );
      }),
    ),
  );

  successSnack$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateAllSimpleCounters),
        tap(() =>
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.CONFIG.S.UPDATE_SECTION,
            translateParams: { sectionKey: 'Simple Counters' },
          }),
        ),
      ),
    { dispatch: false },
  );

  private _saveToLs(simpleCounterState: SimpleCounterState): void {
    this._persistenceService.simpleCounter.saveState(simpleCounterState, {
      isSyncModelChange: true,
    });
  }
}
