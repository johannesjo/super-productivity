import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { setCurrentTask, updateTask } from '../../tasks/store/task.actions';
import { Store } from '@ngrx/store';
import { filter, map, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { GlobalConfigService } from '../../config/global-config.service';
import { androidInterface } from '../android-interface';
import { SyncWrapperService } from '../../../imex/sync/sync-wrapper.service';
import { TranslateService } from '@ngx-translate/core';
import { TaskCopy } from '../../tasks/task.model';
import { showAddTaskBar } from '../../../core-ui/layout/store/layout.actions';

// TODO send message to electron when current task changes here

@Injectable()
export class AndroidEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _globalConfigService = inject(GlobalConfigService);
  private _syncWrapperService = inject(SyncWrapperService);
  private _translateService = inject(TranslateService);

  markTaskAsDone$ = createEffect(() =>
    androidInterface.onMarkCurrentTaskAsDone$.pipe(
      withLatestFrom(this._store$.select(selectCurrentTask)),
      filter(([, currentTask]) => !!currentTask),
      map(([, currentTask]) =>
        updateTask({
          task: { id: (currentTask as TaskCopy).id, changes: { isDone: true } },
        }),
      ),
    ),
  );

  pauseTracking$ = createEffect(() =>
    androidInterface.onPauseCurrentTask$.pipe(
      withLatestFrom(this._store$.select(selectCurrentTask)),
      filter(([, currentTask]) => !!currentTask),
      map(([, currentTask]) => setCurrentTask({ id: null })),
    ),
  );

  showAddTaskBar$ = createEffect(() =>
    androidInterface.onAddNewTask$.pipe(map(() => showAddTaskBar())),
  );
}
