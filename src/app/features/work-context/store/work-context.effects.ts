import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import * as contextActions from './work-context.actions';
import {selectContextFeatureState} from './work-context.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';


@Injectable()
export class WorkContextEffects {

  updateContextsStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      contextActions.setActiveWorkContext,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectContextFeatureState)),
    ),
    tap(this._saveToLs.bind(this)),
    tap(this._updateLastActive.bind(this)),
  ), {dispatch: false});


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _saveToLs([action, contextState]) {
    this._persistenceService.saveLastActive();
    this._persistenceService.context.saveState(contextState);
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
