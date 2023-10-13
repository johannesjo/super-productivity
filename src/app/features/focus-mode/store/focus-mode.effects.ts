import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as FocusModeActions from './focus-mode.actions';
import { showFocusOverlay } from './focus-mode.actions';
import { GlobalConfigService } from '../../config/global-config.service';
import { distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { EMPTY, of } from 'rxjs';
import { TaskService } from '../../tasks/task.service';

@Injectable()
export class FocusModeEffects {
  autoStartFocusMode$ = createEffect(() => {
    return this.globalConfigService.misc$.pipe(
      switchMap((misc) =>
        misc.isAlwaysUseFocusMode
          ? this.taskService.currentTaskId$.pipe(
              distinctUntilChanged(),
              tap(console.log),
              switchMap((currentTaskId) =>
                currentTaskId ? of(showFocusOverlay()) : EMPTY,
              ),
            )
          : EMPTY,
      ),
    );
  });
  loadFocusModes$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(FocusModeActions.setFocusSessionRunning),
      // filter()
    );
  });

  constructor(
    private actions$: Actions,
    private globalConfigService: GlobalConfigService,
    private taskService: TaskService,
  ) {}
}
