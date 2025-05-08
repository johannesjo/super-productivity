import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import confetti from 'canvas-confetti';
import {
  increaseSimpleCounterCounterToday,
  updateAllSimpleCounters,
} from './simple-counter.actions';
import { map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { selectSimpleCounterById } from './simple-counter.reducer';
import { SimpleCounterType } from '../simple-counter.model';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { SimpleCounterService } from '../simple-counter.service';
import { EMPTY, Observable } from 'rxjs';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { DateService } from 'src/app/core/date/date.service';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { getSimpleCounterStreakDuration } from '../get-simple-counter-streak-duration';
import { TranslateService } from '@ngx-translate/core';
import { PfapiService } from '../../../pfapi/pfapi.service';

@Injectable()
export class SimpleCounterEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _timeTrackingService = inject(GlobalTrackingIntervalService);
  private _dateService = inject(DateService);
  private _pfapiService = inject(PfapiService);
  private _simpleCounterService = inject(SimpleCounterService);
  private _snackService = inject(SnackService);
  private _translateService = inject(TranslateService);

  successFullCountersMap: { [key: string]: boolean } = {};

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
          if (sc && !this.successFullCountersMap[sc.id] && sc.isTrackStreaks) {
            if (sc.countOnDay[getWorklogStr()] >= (sc.streakMinValue || 0)) {
              const streakDuration = getSimpleCounterStreakDuration(sc);
              // eslint-disable-next-line max-len
              const msg = `<strong>${sc.title}</strong> <br />${this._translateService.instant(T.F.SIMPLE_COUNTER.S.GOAL_REACHED_1)}<br /> ${this._translateService.instant(T.F.SIMPLE_COUNTER.S.GOAL_REACHED_2)} <strong>${streakDuration}🔥</strong>`;

              const DURATION = 4000;
              this._snackService.open({
                type: 'SUCCESS',
                ico: sc.icon || undefined,
                // ico: 'celebration',
                // ico: '🎉',
                config: {
                  duration: DURATION,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                },
                msg,
              });
              this.successFullCountersMap[sc.id] = true;
              this._celebrate();
            }
            // else if (
            //   sc.type !== SimpleCounterType.StopWatch &&
            //   sc.countOnDay[getWorklogStr()] > 0
            // ) {
            //   confetti({
            //     particleCount: 40,
            //     startVelocity: 10,
            //     spread: 200,
            //     angle: -180,
            //     ticks: 50,
            //     decay: 0.99,
            //     origin: { y: 0, x: 0.9 },
            //   });
            // }
          }
        }),
      ),
    { dispatch: false },
  );

  private _celebrate(): void {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }
}
