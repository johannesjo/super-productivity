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
import {map, mergeMap, switchMap, tap, withLatestFrom} from 'rxjs/operators';
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
        map(tick => ({tick, items}))
      )
      : EMPTY
    ),
    mergeMap(({items, tick}) => {
        return items.map(
          (item) => increaseSimpleCounterCounterToday({id: item.id, increaseBy: tick.duration})
        );
      }
    ),
  ));

  // actionListeners$ = createEffect(() => this._simpleCounterService.enabledSimpleCounters$.pipe(
  //   // map(items=> items.filter(item => item. ...)),
  //   tap(console.log),
  //   switchMap((items) => (items && items.length)
  //     ? this._actions$.pipe(
  //       map(action => ({action, items}))
  //     )
  //     : EMPTY
  //   ),
  //   mergeMap(({items, action}) => {
  //       const startItems = items.filter();
  //       const stopItems = items.filter();
  //       const simpleTriggerUp = items.filter();
  //
  //       return items
  //         .filter()
  //         .map(
  //           (item) => increaseSimpleCounterCounterToday({id: item.id, increaseBy: tick.duration})
  //         );
  //     }
  //   ),
  //   tap(console.log),
  // ), {dispatch: false});


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
