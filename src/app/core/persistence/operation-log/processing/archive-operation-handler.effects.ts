import { inject, Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { LOCAL_ACTIONS } from '../../../../util/local-actions.token';
import { concatMap, filter } from 'rxjs/operators';
import {
  ArchiveOperationHandler,
  isArchiveAffectingAction,
} from './archive-operation-handler.service';
import { devError } from '../../../../util/dev-error';

/**
 * Unified effect for all archive-affecting operations.
 *
 * This effect routes all local archive-affecting actions through ArchiveOperationHandler,
 * making it the SINGLE SOURCE OF TRUTH for archive storage operations.
 *
 * ## How It Works
 *
 * - Uses LOCAL_ACTIONS to only process local user actions (not remote sync operations)
 * - Filters actions using isArchiveAffectingAction() helper
 * - Delegates all archive logic to ArchiveOperationHandler.handleOperation()
 *
 * ## Why This Architecture
 *
 * Previously, archive operations were scattered across multiple effect files:
 * - archive.effects.ts - flushYoungToOld, restoreTask
 * - project.effects.ts - deleteProject archive cleanup
 * - tag.effects.ts - deleteTag/deleteTags archive cleanup
 * - task-repeat-cfg.effects.ts - deleteTaskRepeatCfg archive cleanup
 * - unlink-all-tasks-on-provider-deletion.effects.ts - deleteIssueProvider cleanup
 *
 * This unified effect consolidates all archive handling to eliminate duplicate code
 * between local effects and remote operation handling (OperationApplierService).
 *
 * ## Operation Flow
 *
 * LOCAL OPERATIONS:
 * Action dispatched -> Reducers -> This effect -> ArchiveOperationHandler.handleOperation()
 *
 * REMOTE OPERATIONS:
 * OperationApplierService -> dispatch() -> Reducers -> ArchiveOperationHandler.handleOperation()
 *                                                              ^
 *                                                   (explicit call, bypasses this effect)
 *
 * @see ArchiveOperationHandler for list of supported archive-affecting actions
 * @see isArchiveAffectingAction for the action filtering logic
 */
@Injectable()
export class ArchiveOperationHandlerEffects {
  private _actions$ = inject(LOCAL_ACTIONS);
  private _archiveOperationHandler = inject(ArchiveOperationHandler);

  /**
   * Processes all archive-affecting local actions through the central handler.
   *
   * Uses concatMap to ensure operations are processed sequentially, which is
   * important for archive consistency (e.g., deleteProject shouldn't overlap
   * with other archive writes).
   */
  handleArchiveOperations$ = createEffect(
    () =>
      this._actions$.pipe(
        filter(isArchiveAffectingAction),
        concatMap(async (action) => {
          try {
            await this._archiveOperationHandler.handleOperation(action);
          } catch (e) {
            // Archive operations failing is serious but not critical to app function.
            // Log the error but don't crash the effect stream.
            devError(e);
          }
        }),
      ),
    { dispatch: false },
  );
}
