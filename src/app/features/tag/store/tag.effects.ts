import {Injectable} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {switchMap, tap} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {selectTagFeatureState} from './tag.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';


@Injectable()
export class TagEffects {
  // updateTagsStorage$ = createEffect(() => this._actions$.pipe(
  //   ofType(
  //     tagActions.addTag,
  //     tagActions.updateTag,
  //     tagActions.upsertTag,
  //     tagActions.deleteTag,
  //     tagActions.deleteTags,
  //
  //     TaskActionTypes.UpdateTaskTags,
  //     TaskActionTypes.AddTask,
  //   ),
  //   switchMap(() => this.saveToLs$),
  // ), {dispatch: false});
  //
  // updateTagsStorageConditional$ = createEffect(() => this._actions$.pipe(
  //   ofType(
  //     moveTaskInTodayList
  //   ),
  //   filter((p) => p.workContextType === WorkContextType.TAG),
  //   switchMap(() => this.saveToLs$),
  // ), {dispatch: false});
  // saveToLs$ = this._store$.pipe(
  //   select(selectTagFeatureState),
  //   take(1),
  //   switchMap((tagState) => this._persistenceService.tag.saveState(tagState)),
  //   tap(this._updateLastActive.bind(this)),
  //   tap(() => console.log('SAVE'))
  // );

  updateLs$ = createEffect(() => this._store$.pipe(
    select(selectTagFeatureState),
    switchMap((tagState) => this._persistenceService.tag.saveState(tagState)),
    tap(this._updateLastActive.bind(this)),
  ), {dispatch: false});

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
