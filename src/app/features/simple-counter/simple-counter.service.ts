import { inject, Injectable } from '@angular/core';
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
  toggleSimpleCounterCounter,
  turnOffAllSimpleCounterCounters,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter,
} from './store/simple-counter.actions';
import { Observable } from 'rxjs';
import { SimpleCounter, SimpleCounterState } from './simple-counter.model';
import { nanoid } from 'nanoid';
import { distinctUntilChanged } from 'rxjs/operators';
import { isEqualSimpleCounterCfg } from './is-equal-simple-counter-cfg.util';
import { DateService } from 'src/app/core/date/date.service';

@Injectable({
  providedIn: 'root',
})
export class SimpleCounterService {
  private _store$ = inject<Store<SimpleCounterState>>(Store);
  private _dateService = inject(DateService);

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
    this._store$.dispatch(increaseSimpleCounterCounterToday({ id, increaseBy, today }));
  }

  decreaseCounterToday(id: string, decreaseBy: number): void {
    const today = this._dateService.todayStr();
    this._store$.dispatch(decreaseSimpleCounterCounterToday({ id, decreaseBy, today }));
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
    this._store$.dispatch(deleteSimpleCounter({ id }));
  }

  deleteSimpleCounters(ids: string[]): void {
    this._store$.dispatch(deleteSimpleCounters({ ids }));
  }

  updateSimpleCounter(id: string, changes: Partial<SimpleCounter>): void {
    this._store$.dispatch(updateSimpleCounter({ simpleCounter: { id, changes } }));
  }

  upsertSimpleCounter(simpleCounter: SimpleCounter): void {
    this._store$.dispatch(upsertSimpleCounter({ simpleCounter }));
  }
}
