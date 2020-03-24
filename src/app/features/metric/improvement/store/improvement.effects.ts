import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {filter, map, tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {ClearHiddenImprovements, DeleteImprovements, ImprovementActionTypes} from './improvement.actions';
import {selectImprovementFeatureState, selectImprovementHideDay} from './improvement.reducer';
import {PersistenceService} from '../../../../core/persistence/persistence.service';
import {selectUnusedImprovementIds} from '../../store/metric.selectors';
import {ProjectActionTypes} from '../../../project/store/project.actions';
import {getWorklogStr} from '../../../../util/get-work-log-str';
import {WorkContextService} from '../../../work-context/work-context.service';

@Injectable()
export class ImprovementEffects {

  @Effect({dispatch: false}) updateImprovements$: any = this._actions$
    .pipe(
      ofType(
        ImprovementActionTypes.AddImprovement,
        ImprovementActionTypes.UpdateImprovement,
        ImprovementActionTypes.ToggleImprovementRepeat,
        ImprovementActionTypes.DisableImprovementRepeat,
        ImprovementActionTypes.HideImprovement,
        ImprovementActionTypes.DeleteImprovement,
        ImprovementActionTypes.AddImprovementCheckedDay,
      ),
      withLatestFrom(
        this._workContextService.activeWorkContextIdIfProject$,
        this._store$.pipe(select(selectImprovementFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect() clearImprovements$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
      ),
      withLatestFrom(this._store$.pipe(select(selectImprovementHideDay))),
      filter(([, hideDay]) => hideDay !== getWorklogStr()),
      map(() => new ClearHiddenImprovements()),
    );

  @Effect() clearUnusedImprovements$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectUnusedImprovementIds)),
      ),
      map(([a, unusedIds]) => new DeleteImprovements({ids: unusedIds})),
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
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
