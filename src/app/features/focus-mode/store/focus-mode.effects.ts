import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as FocusModeActions from './focus-mode.actions';

@Injectable()
export class FocusModeEffects {
  loadFocusModes$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(FocusModeActions.setFocusSessionRunning),
      // filter()
    );
  });

  constructor(private actions$: Actions) {}
}
