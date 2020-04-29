import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {select, Store} from '@ngrx/store';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {
  addSimpleCounter,
  deleteSimpleCounter,
  deleteSimpleCounters,
  increaseSimpleCounterCounterToday,
  setSimpleCounterCounterToday,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter
} from './simple-counter.actions';
import {switchMap, tap, withLatestFrom} from 'rxjs/operators';
import {selectSimpleCounterFeatureState} from './simple-counter.reducer';
import {SimpleCounterState} from '../simple-counter.model';
import {TimeTrackingService} from '../../time-tracking/time-tracking.service';
import {SimpleCounterService} from '../simple-counter.service';
import {EMPTY} from 'rxjs';


@Injectable()
export class SimpleCounterEffects {

  updateSimpleCountersStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      updateAllSimpleCounters,
      setSimpleCounterCounterToday,
      increaseSimpleCounterCounterToday,
      // toggleSimpleCounterCounter,

      // currently not used
      addSimpleCounter,
      updateSimpleCounter,
      upsertSimpleCounter,
      deleteSimpleCounter,
      deleteSimpleCounters,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectSimpleCounterFeatureState)),
    ),
    tap(([, featureState]) => this._saveToLs(featureState)),
  ), {dispatch: false});

  checkTimedCounters$ = createEffect(() => this._simpleCounterService.enabledAndToggledSimpleCounters$.pipe(
    switchMap((items) => (items && items.length)
      ? this._timeTrackingService.tick$.pipe(
        // TODO make this work!!!
        // mergeMap(() => items.map(
        //   (item) => increaseSimpleCounterCounterToday({id: item.id, increaseBy: 1000})
        // )),
        tap((tick) => items.map(
          (item) => this._simpleCounterService.increaseCounterToday(item.id, tick.duration)
        )),
      )
      : EMPTY
    ),
    // tap(console.log)
  ), {dispatch: false});


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _timeTrackingService: TimeTrackingService,
    private _persistenceService: PersistenceService,
    private _simpleCounterService: SimpleCounterService,
  ) {
  }

  private _saveToLs(simpleCounterState: SimpleCounterState) {
    this._persistenceService.saveLastActive();
    this._persistenceService.simpleCounter.saveState(simpleCounterState);
  }
}
