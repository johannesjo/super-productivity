import { inject, Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { RecentlyDeletedService } from './recently-deleted.service';

/**
 * Records local deletes and undos in the device-local trash. Remote ones are
 * recorded via OperationApplierService, which has the op timestamps.
 */
@Injectable()
export class RecentlyDeletedEffects {
  private readonly _actions$ = inject(LOCAL_ACTIONS);
  private readonly _recentlyDeletedService = inject(RecentlyDeletedService);

  recordLocalDeleteAndRestore$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          TaskSharedActions.deleteTask,
          TaskSharedActions.deleteTasks,
          // The undo snack's restore. A local restoreTask from the trash is
          // removed by RecentlyDeletedService.restore() itself.
          TaskSharedActions.restoreDeletedTask,
        ),
        tap((action) => {
          void this._recentlyDeletedService.recordAction(action, Date.now());
        }),
      ),
    { dispatch: false },
  );
}
