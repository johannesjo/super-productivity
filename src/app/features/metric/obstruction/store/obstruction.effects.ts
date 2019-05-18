import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {ObstructionActionTypes} from './obstruction.actions';
import {selectObstructionFeatureState} from './obstruction.reducer';
import {selectCurrentProjectId} from '../../../project/store/project.reducer';
import {PersistenceService} from '../../../../core/persistence/persistence.service';

@Injectable()
export class ObstructionEffects {

  @Effect({dispatch: false}) updateObstructions$: any = this._actions$
    .pipe(
      ofType(
        ObstructionActionTypes.AddObstruction,
        ObstructionActionTypes.UpdateObstruction,
        ObstructionActionTypes.DeleteObstruction,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectObstructionFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, obstructionState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.obstruction.save(currentProjectId, obstructionState);
    } else {
      throw new Error('No current project id');
    }
  }

}
