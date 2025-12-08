import { Action, ActionReducer } from '@ngrx/store';
import { RootState } from '../../../../root-store/root-state';
import { isPersistentAction, PersistentAction } from '../persistent-action.interface';
import { OperationCaptureService } from './operation-capture.service';
import { OpLog } from '../../../log';
import { generateCaptureId } from './operation-capture.util';

/**
 * Reference to the consolidated service needed by the meta-reducer.
 * Set during app initialization via `setOperationCaptureService()`.
 *
 * We use this pattern because meta-reducers are pure functions and cannot
 * use Angular's dependency injection directly.
 */
let operationCaptureService: OperationCaptureService | null = null;

/**
 * Sets the service instance for the meta-reducer.
 * Must be called during app initialization before any persistent actions are dispatched.
 */
export const setOperationCaptureService = (service: OperationCaptureService): void => {
  operationCaptureService = service;
};

/**
 * Gets the current OperationCaptureService instance.
 */
export const getOperationCaptureService = (): OperationCaptureService | null => {
  return operationCaptureService;
};

/**
 * Post-reducer meta-reducer that captures entity changes SYNCHRONOUSLY.
 *
 * This solves the race condition in the previous approach:
 * - OLD: Before-state captured in pre-reducer, after-state captured ASYNC in effect
 * - NEW: Both before and after captured SYNCHRONOUSLY in this post-reducer
 *
 * Flow:
 * 1. Capture before-state (current state)
 * 2. Call inner reducer to get after-state
 * 3. Compute entity changes from diff and queue for effect
 *
 * The effect simply dequeues the pre-computed changes - no async state reads!
 *
 * Note: This meta-reducer should be registered LAST in the chain so that
 * it wraps all other reducers and sees the final state changes.
 */
export const operationCaptureMetaReducer = <S, A extends Action = Action>(
  reducer: ActionReducer<S, A>,
): ActionReducer<S, A> => {
  return (state: S | undefined, action: A): S => {
    // Capture before-state BEFORE calling reducer
    const beforeState = state;

    // Call inner reducer to get after-state
    const afterState = reducer(state, action);

    // Only process persistent, non-remote actions
    if (
      beforeState &&
      operationCaptureService &&
      isPersistentAction(action) &&
      !(action as PersistentAction).meta.isRemote
    ) {
      try {
        const persistentAction = action as PersistentAction;
        const captureId = generateCaptureId(persistentAction);

        // Compute entity changes and queue in one step
        operationCaptureService.computeAndEnqueue(
          captureId,
          persistentAction,
          beforeState as unknown as RootState,
          afterState as unknown as RootState,
        );

        OpLog.verbose('operationCaptureMetaReducer: Captured operation synchronously', {
          captureId,
          actionType: persistentAction.type,
        });
      } catch (e) {
        OpLog.err('operationCaptureMetaReducer: Failed to capture operation', e);
        // Don't block the reducer - state change already happened
      }
    }

    return afterState;
  };
};
