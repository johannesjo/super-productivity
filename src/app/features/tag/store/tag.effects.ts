import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {select, Store} from '@ngrx/store';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {TaskActionTypes} from '../../tasks/store/task.actions';
import {tap, withLatestFrom} from 'rxjs/operators';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {TagActionTypes} from './tag.actions';
import {selectTagFeatureState} from './tag.reducer';

@Injectable()
export class TagEffects {

  @Effect({dispatch: false}) updateTags$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.MoveToArchive,
        TagActionTypes.AddTag,
        TagActionTypes.DeleteTag
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTagFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, tagState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.taskTag.save(currentProjectId, tagState);
    } else {
      throw new Error('No current project id');
    }
  }
}
