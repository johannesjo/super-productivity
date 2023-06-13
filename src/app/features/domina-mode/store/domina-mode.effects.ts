import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { EMPTY, Observable, timer } from 'rxjs';
import { distinctUntilChanged, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectIsDominaModeEnabled } from '../../config/store/global-config.reducer';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { speak } from '../../../util/speak';

@Injectable()
export class DominaModeEffects {
  _timer$: Observable<number> = timer(1000, 10 * 1000);

  dominaMode$: Observable<unknown> = createEffect(
    () =>
      this._store$.select(selectIsDominaModeEnabled).pipe(
        distinctUntilChanged(),
        switchMap((isEnabled) =>
          isEnabled
            ? this._timer$.pipe(
                withLatestFrom(this._store$.select(selectCurrentTask)),
                tap(([, currentTask]) => currentTask && speak(currentTask.title)),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  constructor(private actions$: Actions, private _store$: Store) {}
}
