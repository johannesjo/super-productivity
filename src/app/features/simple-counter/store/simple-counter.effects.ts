import {Injectable} from '@angular/core';
import {Actions} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {PersistenceService} from '../../../core/persistence/persistence.service';


@Injectable()
export class SimpleCounterEffects {

  // updateSimpleCountersStorage$ = createEffect(() => this._actions$.pipe(
  //   ofType(
  //     simpleCounterActions.addSimpleCounter,
  //     simpleCounterActions.updateSimpleCounter,
  //     simpleCounterActions.upsertSimpleCounter,
  //     simpleCounterActions.deleteSimpleCounter,
  //     simpleCounterActions.deleteSimpleCounters,
  //   ),
  //   withLatestFrom(
  //     this._store$.pipe(select(selectSimpleCounterFeatureState)),
  //   ),
  //   tap(this._saveToLs.bind(this)),
  //   tap(this._updateLastActive.bind(this)),
  // ), {dispatch: false});


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _saveToLs([action, currentProjectId, simpleCounterState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.simpleCounter.saveState(simpleCounterState);
    } else {
      throw new Error('No current project id');
    }
  }
}
