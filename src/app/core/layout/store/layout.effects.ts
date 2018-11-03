import { Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class LayoutEffects {

  // @Effect()
  // loadFoos$ = this.actions$.pipe(ofType(LayoutActionTypes.LoadLayouts));
  //
  constructor(private actions$: Actions) {
  }
}
