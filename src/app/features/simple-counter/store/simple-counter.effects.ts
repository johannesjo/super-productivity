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
import {
  selectSimpleCounterById,
  selectSimpleCounterFeatureState,
} from './simple-counter.reducer';
import { SimpleCounterState, SimpleCounterType } from '../simple-counter.model';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { SimpleCounterService } from '../simple-counter.service';
import { EMPTY, Observable } from 'rxjs';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { DateService } from 'src/app/core/date/date.service';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { getSimpleCounterStreakDuration } from '../get-simple-counter-streak-duration';
import {
  hideCelebrate,
  showCelebrate,
} from '../../../core-ui/layout/store/layout.actions';

@Injectable()
export class SimpleCounterEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _timeTrackingService = inject(GlobalTrackingIntervalService);
  private _dateService = inject(DateService);
  private _persistenceService = inject(PersistenceService);
  private _simpleCounterService = inject(SimpleCounterService);
  private _snackService = inject(SnackService);

  successFullCountersMap: { [key: string]: boolean } = {};

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

  updateCfgSuccessSnack$: Observable<unknown> = createEffect(
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

  streakSuccessSnack$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(increaseSimpleCounterCounterToday),
        switchMap((a) =>
          this._store$.pipe(select(selectSimpleCounterById, { id: a.id })),
        ),
        tap((sc) => {
          if (
            sc &&
            !this.successFullCountersMap[sc.id] &&
            sc.isTrackStreaks &&
            sc.countOnDay[getWorklogStr()] >= sc.streakMinValue
          ) {
            const streakDuration = getSimpleCounterStreakDuration(sc);
            const DURATION = 5000;
            this._snackService.open({
              type: 'SUCCESS',
              config: { duration: DURATION },
              // msg: T.F.CONFIG.S.UPDATE_SECTION,
              // eslint-disable-next-line max-len
              msg: `🎉 You successfully reached your goal for <strong>${sc.title}</strong> for today! 🎉 <br />🔥 Current streak duration: <strong>${streakDuration}</strong>`,
              translateParams: { sectionKey: 'Simple Counters' },
            });
            this.successFullCountersMap[sc.id] = true;
            this._store$.dispatch(showCelebrate());
            // TODO this needs to be more robust than using a timeout
            window.setTimeout(() => {
              this._store$.dispatch(hideCelebrate());
            }, DURATION);
          }
        }),
      ),
    { dispatch: false },
  );

  private _saveToLs(simpleCounterState: SimpleCounterState): void {
    this._persistenceService.simpleCounter.saveState(simpleCounterState, {
      isSyncModelChange: true,
    });
  }
}
