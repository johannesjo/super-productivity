import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { first, switchMap, tap } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { BookmarkActionTypes } from './bookmark.actions';
import { BookmarkState, selectBookmarkFeatureState } from './bookmark.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { combineLatest, Observable } from 'rxjs';
import { WorkContextService } from '../../work-context/work-context.service';

@Injectable()
export class BookmarkEffects {
  @Effect({ dispatch: false })
  updateBookmarks$: Observable<unknown> = this._actions$.pipe(
    ofType(
      BookmarkActionTypes.AddBookmark,
      BookmarkActionTypes.UpdateBookmark,
      BookmarkActionTypes.DeleteBookmark,
      BookmarkActionTypes.ShowBookmarks,
      BookmarkActionTypes.HideBookmarks,
      BookmarkActionTypes.ToggleBookmarks,
    ),
    switchMap(() =>
      combineLatest([
        this._workContextService.activeWorkContextIdIfProject$,
        this._store$.pipe(select(selectBookmarkFeatureState)),
      ]).pipe(first()),
    ),
    tap(([projectId, state]) => this._saveToLs(projectId, state)),
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {}

  private _saveToLs(currentProjectId: string, bookmarkState: BookmarkState) {
    if (currentProjectId) {
      this._persistenceService.bookmark.save(currentProjectId, bookmarkState, {
        isSyncModelChange: true,
      });
    } else {
      throw new Error('No current project id');
    }
  }
}
