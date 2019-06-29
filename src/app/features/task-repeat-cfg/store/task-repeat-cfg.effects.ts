import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {TaskRepeatCfgActionTypes} from './task-repeat-cfg.actions';
import {selectTaskRepeatCfgFeatureState} from './task-repeat-cfg.reducer';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';

@Injectable()
export class TaskRepeatCfgEffects {

    @Effect({dispatch: false}) updateTaskRepeatCfgs$: any = this._actions$
        .pipe(
            ofType(
                TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
                TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg,
                TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
            ),
            withLatestFrom(
                this._store$.pipe(select(selectCurrentProjectId)),
                this._store$.pipe(select(selectTaskRepeatCfgFeatureState)),
            ),
            tap(this._saveToLs.bind(this))
        );

    constructor(
        private _actions$: Actions,
        private _store$: Store<any>,
        private _persistenceService: PersistenceService
    ) {
    }

    private _saveToLs([action, currentProjectId, taskRepeatCfgState]) {
        if (currentProjectId) {
            this._persistenceService.saveLastActive();
            this._persistenceService.taskRepeatCfg.save(currentProjectId, taskRepeatCfgState);
        } else {
            throw new Error('No current project id');
        }
    }

}
