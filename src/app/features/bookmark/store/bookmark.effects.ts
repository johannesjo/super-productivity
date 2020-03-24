import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {BookmarkActionTypes} from './bookmark.actions';
import {selectBookmarkFeatureState} from './bookmark.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {WorkContextService} from '../../work-context/work-context.service';

@Injectable()
export class BookmarkEffects {

  @Effect({dispatch: false}) updateBookmarks$: any = this._actions$
    .pipe(
      ofType(
        BookmarkActionTypes.AddBookmark,
        BookmarkActionTypes.UpdateBookmark,
        BookmarkActionTypes.DeleteBookmark,
        BookmarkActionTypes.ShowBookmarks,
        BookmarkActionTypes.HideBookmarks,
        BookmarkActionTypes.ToggleBookmarks,
      ),
      withLatestFrom(
        this._workContextService.activeWorkContextIdIfProject$,
        this._store$.pipe(select(selectBookmarkFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {
  }

  private _saveToLs([action, currentProjectId, bookmarkState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.bookmark.save(currentProjectId, bookmarkState);
    } else {
      throw new Error('No current project id');
    }
  }

}
