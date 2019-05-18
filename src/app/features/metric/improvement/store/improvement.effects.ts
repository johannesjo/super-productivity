import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {ImprovementActionTypes} from './improvement.actions';
import {selectImprovementFeatureState} from './improvement.reducer';
import {PersistenceService} from '../../../../core/persistence/persistence.service';
import {selectCurrentProjectId} from '../../../project/store/project.reducer';

@Injectable()
export class ImprovementEffects {

  @Effect({dispatch: false}) updateImprovements$: any = this._actions$
    .pipe(
      ofType(
        ImprovementActionTypes.AddImprovement,
        ImprovementActionTypes.UpdateImprovement,
        ImprovementActionTypes.DeleteImprovement,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectImprovementFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, improvementState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.improvement.save(currentProjectId, improvementState);
    } else {
      throw new Error('No current project id');
    }
  }

}
