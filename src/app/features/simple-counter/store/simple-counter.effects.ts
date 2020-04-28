import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {select, Store} from '@ngrx/store';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {
  addSimpleCounter,
  deleteSimpleCounter,
  deleteSimpleCounters,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter
} from './simple-counter.actions';
import {tap, withLatestFrom} from 'rxjs/operators';
import {selectSimpleCounterFeatureState} from './simple-counter.reducer';
import {SimpleCounterState} from '../simple-counter.model';


@Injectable()
export class SimpleCounterEffects {

  updateSimpleCountersStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      addSimpleCounter,
      updateSimpleCounter,
      upsertSimpleCounter,
      deleteSimpleCounter,
      deleteSimpleCounters,
      updateAllSimpleCounters,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectSimpleCounterFeatureState)),
    ),
    tap(([, featureState]) => this._saveToLs(featureState)),
  ), {dispatch: false});


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _saveToLs(simpleCounterState: SimpleCounterState) {
    this._persistenceService.saveLastActive();
    this._persistenceService.simpleCounter.saveState(simpleCounterState);
  }
}
