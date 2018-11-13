import { Injectable } from '@angular/core';
import { Actions, Effect } from '@ngrx/effects';

@Injectable()
export class BookmarkEffects {

  // @Effect()
  // loadBookmarks$ = this.actions$.pipe(ofType(BookmarkActionTypes.LoadBookmarks));

  constructor(private actions$: Actions) {
  }
}
