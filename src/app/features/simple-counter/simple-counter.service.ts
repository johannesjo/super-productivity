import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { selectAllSimpleCounters } from './store/simple-counter.reducer';
import {
  addSimpleCounter,
  deleteSimpleCounter,
  deleteSimpleCounters,
  increaseSimpleCounterCounterToday,
  setSimpleCounterCounterToday,
  toggleSimpleCounterCounter,
  turnOffAllSimpleCounterCounters,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter,
} from './store/simple-counter.actions';
import { Observable } from 'rxjs';
import {
  SimpleCounter,
  SimpleCounterCfgFields,
  SimpleCounterState,
} from './simple-counter.model';
import * as shortid from 'shortid';
import { distinctUntilChanged, map } from 'rxjs/operators';

const FIELDS_TO_COMPARE: (keyof SimpleCounterCfgFields)[] = [
  'id',
  'title',
  'isEnabled',
  'icon',
  'iconOn',
  'type',
  'triggerOnActions',
  'triggerOffActions',
];

const isEqualSimpleCounterCfg = (a: any, b: any): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let j = 0; j < FIELDS_TO_COMPARE.length; j++) {
          const field: any = FIELDS_TO_COMPARE[j];
          if (a[field] !== b[field]) {
            return false;
          }
        }
      }
    }
    return true;
  } else {
    return a === b;
  }
};

@Injectable({
  providedIn: 'root',
})
export class SimpleCounterService {
  simpleCounters$: Observable<SimpleCounter[]> = this._store$.pipe(
    select(selectAllSimpleCounters),
  );
  simpleCountersUpdatedOnCfgChange$: Observable<SimpleCounter[]> =
    this.simpleCounters$.pipe(distinctUntilChanged(isEqualSimpleCounterCfg));

  enabledSimpleCounters$: Observable<SimpleCounter[]> = this._store$
    .pipe(select(selectAllSimpleCounters))
    .pipe(map((items) => items && items.filter((item) => item.isEnabled)));
  enabledSimpleCountersUpdatedOnCfgChange$: Observable<SimpleCounter[]> =
    this.enabledSimpleCounters$.pipe(distinctUntilChanged(isEqualSimpleCounterCfg));

  enabledAndToggledSimpleCounters$: Observable<SimpleCounter[]> = this._store$
    .pipe(select(selectAllSimpleCounters))
    .pipe(map((items) => items && items.filter((item) => item.isEnabled && item.isOn)));

  constructor(private _store$: Store<SimpleCounterState>) {}

  updateAll(items: SimpleCounter[]) {
    this._store$.dispatch(updateAllSimpleCounters({ items }));
  }

  setCounterToday(id: string, newVal: number) {
    this._store$.dispatch(setSimpleCounterCounterToday({ id, newVal }));
  }

  increaseCounterToday(id: string, increaseBy: number) {
    this._store$.dispatch(increaseSimpleCounterCounterToday({ id, increaseBy }));
  }

  toggleCounter(id: string) {
    this._store$.dispatch(toggleSimpleCounterCounter({ id }));
  }

  turnOffAll() {
    this._store$.dispatch(turnOffAllSimpleCounterCounters());
  }

  addSimpleCounter(simpleCounter: SimpleCounter) {
    this._store$.dispatch(
      addSimpleCounter({
        simpleCounter: {
          ...simpleCounter,
          id: shortid(),
        },
      }),
    );
  }

  deleteSimpleCounter(id: string) {
    this._store$.dispatch(deleteSimpleCounter({ id }));
  }

  deleteSimpleCounters(ids: string[]) {
    this._store$.dispatch(deleteSimpleCounters({ ids }));
  }

  updateSimpleCounter(id: string, changes: Partial<SimpleCounter>) {
    this._store$.dispatch(updateSimpleCounter({ simpleCounter: { id, changes } }));
  }

  upsertSimpleCounter(simpleCounter: SimpleCounter) {
    this._store$.dispatch(upsertSimpleCounter({ simpleCounter }));
  }
}
