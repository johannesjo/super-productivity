import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { first, switchMap, tap } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { selectBookmarkFeatureState } from './bookmark.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { combineLatest, Observable } from 'rxjs';
import { WorkContextService } from '../../work-context/work-context.service';
import { BookmarkState } from '../bookmark.model';
import {
  addBookmark,
  deleteBookmark,
  hideBookmarks,
  showBookmarks,
  toggleBookmarks,
  updateBookmark,
} from './bookmark.actions';

@Injectable()
export class BookmarkEffects {
  updateBookmarks$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addBookmark,
          updateBookmark,
          deleteBookmark,
          showBookmarks,
          hideBookmarks,
          toggleBookmarks,
        ),
        switchMap(() =>
          combineLatest([
            this._workContextService.activeWorkContextIdIfProject$,
            this._store$.pipe(select(selectBookmarkFeatureState)),
          ]).pipe(first()),
        ),
        tap(([projectId, state]) => this._saveToLs(projectId, state)),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {}

  private _saveToLs(currentProjectId: string, bookmarkState: BookmarkState): void {
    if (currentProjectId) {
      this._persistenceService.bookmark.save(currentProjectId, bookmarkState, {
        isSyncModelChange: true,
      });
    } else {
      throw new Error('No current project id');
    }
  }
}
