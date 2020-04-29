import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {selectAllSimpleCounters, selectSimpleCounterById} from './store/simple-counter.reducer';
import {
  addSimpleCounter,
  deleteSimpleCounter,
  deleteSimpleCounters,
  increaseSimpleCounterCounterToday,
  setSimpleCounterCounterToday,
  toggleSimpleCounterCounter,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter,
} from './store/simple-counter.actions';
import {Observable} from 'rxjs';
import {SimpleCounter, SimpleCounterState} from './simple-counter.model';
import shortid from 'shortid';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SimpleCounterService {
  simpleCounters$: Observable<SimpleCounter[]> = this._store$.pipe(select(selectAllSimpleCounters));
  enabledSimpleCounters$: Observable<SimpleCounter[]> = this._store$.pipe(select(selectAllSimpleCounters)).pipe(
    map(items => items && items.filter(item => item.isEnabled)),
  );

  enabledAndToggledSimpleCounters$: Observable<SimpleCounter[]> = this._store$.pipe(select(selectAllSimpleCounters)).pipe(
    map(items => items && items.filter(item => item.isEnabled && item.isOn)),
  );

  constructor(
    private _store$: Store<SimpleCounterState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  getSimpleCounterById$(id: string): Observable<SimpleCounter> {
    return this._store$.pipe(select(selectSimpleCounterById, {id}));
  }

  updateAll(items: SimpleCounter[]) {
    this._store$.dispatch(updateAllSimpleCounters({items}));
  }

  setCounterToday(id: string, newVal: number) {
    this._store$.dispatch(setSimpleCounterCounterToday({id, newVal}));
  }

  increaseCounterToday(id: string, increaseBy: number) {
    this._store$.dispatch(increaseSimpleCounterCounterToday({id, increaseBy}));
  }

  toggleCounter(id: string) {
    this._store$.dispatch(toggleSimpleCounterCounter({id}));
  }


  addSimpleCounter(simpleCounter: SimpleCounter) {
    this._store$.dispatch(addSimpleCounter({
      simpleCounter: {
        ...simpleCounter,
        id: shortid()
      }
    }));
  }

  deleteSimpleCounter(id: string) {
    this._store$.dispatch(deleteSimpleCounter({id}));
  }

  deleteSimpleCounters(ids: string[]) {
    this._store$.dispatch(deleteSimpleCounters({ids}));
  }

  updateSimpleCounter(id: string, changes: Partial<SimpleCounter>) {
    this._store$.dispatch(updateSimpleCounter({simpleCounter: {id, changes}}));
  }

  upsertSimpleCounter(simpleCounter: SimpleCounter) {
    this._store$.dispatch(upsertSimpleCounter({simpleCounter}));
  }
}
