import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import * as intelligentListActions from './intelligent-list.actions';
import {selectIntelligentListFeatureState} from './intelligent-list.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';


@Injectable()
export class IntelligentListEffects {

  updateIntelligentListsStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      intelligentListActions.addIntelligentList,
      intelligentListActions.updateIntelligentList,
      intelligentListActions.upsertIntelligentList,
      intelligentListActions.deleteIntelligentList,
      intelligentListActions.deleteIntelligentLists,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectIntelligentListFeatureState)),
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

  private _saveToLs([action, currentProjectId, intelligentListState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.intelligentList.saveState(intelligentListState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
