import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { EMPTY, Observable, timer } from 'rxjs';
import { distinctUntilChanged, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectIsDominaModeConfig } from '../../config/store/global-config.reducer';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { speak } from '../../../util/speak';

@Injectable()
export class DominaModeEffects {
  dominaMode$: Observable<unknown> = createEffect(
    () =>
      this._store$.select(selectIsDominaModeConfig).pipe(
        distinctUntilChanged(),
        switchMap((cfg) =>
          cfg.isEnabled
            ? timer(1000, cfg.interval || 10000).pipe(
                withLatestFrom(this._store$.select(selectCurrentTask)),
                tap(([, currentTask]) => {
                  if (currentTask) {
                    let txt = cfg.text.replace('${currentTaskTitle}', currentTask.title);
                    if (txt.length <= 1) {
                      txt = currentTask.title;
                    }
                    speak(txt, cfg.volume);
                  }
                }),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  constructor(
    private actions$: Actions,
    private _store$: Store,
  ) {}
}
