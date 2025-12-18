import { inject, Injectable, OnDestroy } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  selectAllSimpleCounters,
  selectEnabledAndToggledSimpleCounters,
  selectEnabledSimpleCounters,
  selectEnabledSimpleStopWatchCounters,
} from './store/simple-counter.reducer';
import {
  addSimpleCounter,
  decreaseSimpleCounterCounterToday,
  deleteSimpleCounter,
  deleteSimpleCounters,
  increaseSimpleCounterCounterToday,
  setSimpleCounterCounterForDate,
  setSimpleCounterCounterToday,
  tickSimpleCounterLocal,
  toggleSimpleCounterCounter,
  turnOffAllSimpleCounterCounters,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter,
} from './store/simple-counter.actions';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import {
  SimpleCounter,
  SimpleCounterState,
  SimpleCounterType,
} from './simple-counter.model';
import { nanoid } from 'nanoid';
import { distinctUntilChanged, withLatestFrom } from 'rxjs/operators';
import { isEqualSimpleCounterCfg } from './is-equal-simple-counter-cfg.util';
import { DateService } from 'src/app/core/date/date.service';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { BatchedTimeSyncAccumulator } from '../../core/util/batched-time-sync-accumulator';

@Injectable({
  providedIn: 'root',
})
export class SimpleCounterService implements OnDestroy {
  private static readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  private _store$ = inject<Store<SimpleCounterState>>(Store);
  private _dateService = inject(DateService);
  private _timeTrackingService = inject(GlobalTrackingIntervalService);
  private _imexViewService = inject(ImexViewService);

  private _stopwatchAccumulator = new BatchedTimeSyncAccumulator(
    SimpleCounterService.SYNC_INTERVAL_MS,
    (id, date, _duration) => this._syncStopwatchAbsoluteValue(id, date),
  );
  private _subscriptions = new Subscription();
  private _visibilityHandler: (() => void) | null = null;

  simpleCounters$: Observable<SimpleCounter[]> = this._store$.pipe(
    select(selectAllSimpleCounters),
  );
  simpleCountersUpdatedOnCfgChange$: Observable<SimpleCounter[]> =
    this.simpleCounters$.pipe(
      distinctUntilChanged((a, b) => isEqualSimpleCounterCfg(a, b)),
    );

  enabledSimpleCounters$: Observable<SimpleCounter[]> = this._store$.select(
    selectEnabledSimpleCounters,
  );
  enabledSimpleStopWatchCounters$: Observable<SimpleCounter[]> = this._store$.select(
    selectEnabledSimpleStopWatchCounters,
  );

  enabledAndToggledSimpleCounters$: Observable<SimpleCounter[]> = this._store$.select(
    selectEnabledAndToggledSimpleCounters,
  );

  constructor() {
    this._setupStopwatchTracking();
    this._setupFlushOnToggleOff();
    this._setupVisibilityFlush();
  }

  ngOnDestroy(): void {
    // Flush any pending data before cleanup to prevent data loss
    this._flushAccumulatedTime();

    this._subscriptions.unsubscribe();
    if (this._visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
    }
  }

  /**
   * Flush accumulated StopWatch time to sync.
   * Called before app close and when counter stops.
   */
  flushAccumulatedTime(): void {
    this._flushAccumulatedTime();
  }

  private _setupStopwatchTracking(): void {
    this._subscriptions.add(
      this._timeTrackingService.tick$
        .pipe(
          withLatestFrom(
            this.enabledAndToggledSimpleCounters$,
            this._imexViewService.isDataImportInProgress$,
          ),
        )
        .subscribe(([tick, counters, isImportInProgress]) => {
          if (isImportInProgress) return;

          const stopwatchCounters = counters.filter(
            (c) => c.type === SimpleCounterType.StopWatch,
          );

          for (const counter of stopwatchCounters) {
            // Update local state immediately (non-persistent)
            this._store$.dispatch(
              tickSimpleCounterLocal({
                id: counter.id,
                increaseBy: tick.duration,
                today: tick.date,
              }),
            );

            // Accumulate for batch sync
            this._stopwatchAccumulator.accumulate(counter.id, tick.duration, tick.date);
          }

          // Check if it's time to sync (every 5 minutes)
          if (this._stopwatchAccumulator.shouldFlush()) {
            this._flushAccumulatedTime();
          }
        }),
    );
  }

  private _setupFlushOnToggleOff(): void {
    let previousRunningIds: string[] = [];

    this._subscriptions.add(
      this.enabledAndToggledSimpleCounters$.subscribe((counters) => {
        const currentRunningIds = counters
          .filter((c) => c.type === SimpleCounterType.StopWatch)
          .map((c) => c.id);

        // Check if any stopwatch was turned off
        const stoppedIds = previousRunningIds.filter(
          (id) => !currentRunningIds.includes(id),
        );

        // Flush only the stopped counters
        for (const id of stoppedIds) {
          this._stopwatchAccumulator.flushOne(id);
        }

        previousRunningIds = currentRunningIds;
      }),
    );
  }

  private _setupVisibilityFlush(): void {
    if (typeof document !== 'undefined') {
      this._visibilityHandler = (): void => {
        if (document.hidden) {
          this._flushAccumulatedTime();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
  }

  private _flushAccumulatedTime(): void {
    // Flush StopWatch accumulated time only
    // Click counters sync immediately in increaseCounterToday/decreaseCounterToday
    this._stopwatchAccumulator.flush();
  }

  /**
   * Sync stopwatch counter with absolute value instead of relative duration.
   * This ensures remote clients get the correct value regardless of their current state.
   */
  private _syncStopwatchAbsoluteValue(id: string, date: string): void {
    // Read current state synchronously via firstValueFrom
    firstValueFrom(this._store$.pipe(select(selectAllSimpleCounters))).then(
      (counters) => {
        const counter = counters.find((c) => c.id === id);
        if (counter) {
          const newVal = counter.countOnDay[date] || 0;
          this._store$.dispatch(
            setSimpleCounterCounterToday({ id, newVal, today: date }),
          );
        }
      },
    );
  }

  updateAll(items: SimpleCounter[]): void {
    this._store$.dispatch(updateAllSimpleCounters({ items }));
  }

  setCounterToday(id: string, newVal: number): void {
    const today = this._dateService.todayStr();
    this._store$.dispatch(setSimpleCounterCounterToday({ id, newVal, today }));
  }

  setCounterForDate(id: string, date: string, newVal: number): void {
    this._store$.dispatch(setSimpleCounterCounterForDate({ id, newVal, date }));
  }

  async increaseCounterToday(id: string, increaseBy: number): Promise<void> {
    const today = this._dateService.todayStr();
    // Local UI update (non-persistent)
    this._store$.dispatch(increaseSimpleCounterCounterToday({ id, increaseBy, today }));

    // Immediately sync with absolute value (persistent)
    const counters = await firstValueFrom(
      this._store$.pipe(select(selectAllSimpleCounters)),
    );
    const counter = counters.find((c) => c.id === id);
    if (counter) {
      const newVal = counter.countOnDay[today] || 0;
      this._store$.dispatch(setSimpleCounterCounterToday({ id, newVal, today }));
    }
  }

  async decreaseCounterToday(id: string, decreaseBy: number): Promise<void> {
    const today = this._dateService.todayStr();
    // Local UI update (non-persistent)
    this._store$.dispatch(decreaseSimpleCounterCounterToday({ id, decreaseBy, today }));

    // Immediately sync with absolute value (persistent)
    const counters = await firstValueFrom(
      this._store$.pipe(select(selectAllSimpleCounters)),
    );
    const counter = counters.find((c) => c.id === id);
    if (counter) {
      const newVal = counter.countOnDay[today] || 0;
      this._store$.dispatch(setSimpleCounterCounterToday({ id, newVal, today }));
    }
  }

  toggleCounter(id: string): void {
    this._store$.dispatch(toggleSimpleCounterCounter({ id }));
  }

  turnOffAll(): void {
    this._store$.dispatch(turnOffAllSimpleCounterCounters());
  }

  addSimpleCounter(simpleCounter: SimpleCounter): void {
    this._store$.dispatch(
      addSimpleCounter({
        simpleCounter: {
          ...simpleCounter,
          id: nanoid(),
        },
      }),
    );
  }

  deleteSimpleCounter(id: string): void {
    // Clean up accumulators to prevent memory leak
    this._stopwatchAccumulator.clearOne(id);
    this._store$.dispatch(deleteSimpleCounter({ id }));
  }

  deleteSimpleCounters(ids: string[]): void {
    // Clean up accumulators to prevent memory leak
    for (const id of ids) {
      this._stopwatchAccumulator.clearOne(id);
    }
    this._store$.dispatch(deleteSimpleCounters({ ids }));
  }

  updateSimpleCounter(id: string, changes: Partial<SimpleCounter>): void {
    // If type is changing, flush the old type's accumulated data first
    if (changes.type !== undefined) {
      this._stopwatchAccumulator.flushOne(id);
    }
    this._store$.dispatch(updateSimpleCounter({ simpleCounter: { id, changes } }));
  }

  upsertSimpleCounter(simpleCounter: SimpleCounter): void {
    this._store$.dispatch(upsertSimpleCounter({ simpleCounter }));
  }
}
