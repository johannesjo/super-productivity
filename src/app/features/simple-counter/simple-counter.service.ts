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
  syncSimpleCounterTime,
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
import { Log } from 'src/app/core/log';

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
    (id, date, duration) =>
      this._store$.dispatch(syncSimpleCounterTime({ id, date, duration })),
  );
  private _modifiedClickCounters = new Set<string>(); // Track click counters that need sync
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

  private async _flushAccumulatedTime(): Promise<void> {
    // Flush StopWatch accumulated time
    this._stopwatchAccumulator.flush();

    // Flush ClickCounter modifications with absolute values
    if (this._modifiedClickCounters.size > 0) {
      const today = this._dateService.todayStr();
      // Copy IDs before clearing to ensure cleanup even if dispatch fails
      const idsToFlush = [...this._modifiedClickCounters];
      this._modifiedClickCounters.clear();

      try {
        const counters = await firstValueFrom(
          this._store$.pipe(select(selectAllSimpleCounters)),
        );
        for (const id of idsToFlush) {
          const counter = counters.find((c) => c.id === id);
          if (counter) {
            const newVal = counter.countOnDay[today] || 0;
            this._store$.dispatch(setSimpleCounterCounterToday({ id, newVal, today }));
          }
        }
      } catch (e) {
        // Log error but don't re-throw - flush is best-effort
        Log.error('[SimpleCounterService] Error flushing click counters:', e);
      }
    }
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

  increaseCounterToday(id: string, increaseBy: number): void {
    const today = this._dateService.todayStr();
    // Local UI update (non-persistent)
    this._store$.dispatch(increaseSimpleCounterCounterToday({ id, increaseBy, today }));
    // Mark for batched sync (will sync every 5 minutes)
    this._modifiedClickCounters.add(id);
  }

  decreaseCounterToday(id: string, decreaseBy: number): void {
    const today = this._dateService.todayStr();
    // Local UI update (non-persistent)
    this._store$.dispatch(decreaseSimpleCounterCounterToday({ id, decreaseBy, today }));
    // Mark for batched sync (will sync every 5 minutes)
    this._modifiedClickCounters.add(id);
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
    this._modifiedClickCounters.delete(id);
    this._store$.dispatch(deleteSimpleCounter({ id }));
  }

  deleteSimpleCounters(ids: string[]): void {
    // Clean up accumulators to prevent memory leak
    for (const id of ids) {
      this._stopwatchAccumulator.clearOne(id);
      this._modifiedClickCounters.delete(id);
    }
    this._store$.dispatch(deleteSimpleCounters({ ids }));
  }

  updateSimpleCounter(id: string, changes: Partial<SimpleCounter>): void {
    // If type is changing, flush the old type's accumulated data first
    if (changes.type !== undefined) {
      this._stopwatchAccumulator.flushOne(id);
      this._modifiedClickCounters.delete(id);
    }
    this._store$.dispatch(updateSimpleCounter({ simpleCounter: { id, changes } }));
  }

  upsertSimpleCounter(simpleCounter: SimpleCounter): void {
    this._store$.dispatch(upsertSimpleCounter({ simpleCounter }));
  }
}
