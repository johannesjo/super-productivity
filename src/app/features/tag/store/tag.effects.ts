import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import * as tagActions from './tag.actions';
import {selectTagFeatureState} from './tag.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {TaskActionTypes} from '../../tasks/store/task.actions';


@Injectable()
export class TagEffects {

  updateTagsStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      tagActions.addTag,
      tagActions.updateTag,
      tagActions.upsertTag,
      tagActions.deleteTag,
      tagActions.deleteTags,
      TaskActionTypes.UpdateTaskTags,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectTagFeatureState)),
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

  private _saveToLs([action, currentProjectId, tagState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.tag.saveState(currentProjectId, tagState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
