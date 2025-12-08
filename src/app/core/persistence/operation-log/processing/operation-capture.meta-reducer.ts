import { Action, ActionReducer } from '@ngrx/store';
import { RootState } from '../../../../root-store/root-state';
import { isPersistentAction, PersistentAction } from '../persistent-action.interface';
import { OperationQueueService } from './operation-queue.service';
import { StateChangeCaptureService } from './state-change-capture.service';
import { OpLog } from '../../../log';

/**
 * Reference to services needed by the meta-reducer.
 * Set during app initialization via `setOperationCaptureServices()`.
 *
 * We use this pattern because meta-reducers are pure functions and cannot
 * use Angular's dependency injection directly.
 */
let operationQueueService: OperationQueueService | null = null;
let stateChangeCaptureService: StateChangeCaptureService | null = null;

/**
 * Sets the service instances for the meta-reducer.
 * Must be called during app initialization before any persistent actions are dispatched.
 */
export const setOperationCaptureServices = (
  queueService: OperationQueueService,
  captureService: StateChangeCaptureService,
): void => {
  operationQueueService = queueService;
  stateChangeCaptureService = captureService;
};

/**
 * Gets the current OperationQueueService instance.
 */
export const getOperationQueueService = (): OperationQueueService | null => {
  return operationQueueService;
};

/**
 * Generates a unique capture ID for correlating meta-reducer and effect.
 * Uses action type + entity info + simple hash for uniqueness.
 */
const generateCaptureId = (action: PersistentAction): string => {
  const entityKey = action.meta.entityId || action.meta.entityIds?.join(',') || 'no-id';
  const actionHash = simpleHash(JSON.stringify(action));
  return `${action.type}:${entityKey}:${actionHash}`;
};

/**
 * Simple hash function for generating unique IDs.
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
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
 * 3. Compute entity changes from diff
 * 4. Queue changes for effect to persist
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
      operationQueueService &&
      stateChangeCaptureService &&
      isPersistentAction(action) &&
      !(action as PersistentAction).meta.isRemote
    ) {
      try {
        const persistentAction = action as PersistentAction;
        const captureId = generateCaptureId(persistentAction);

        // Compute entity changes synchronously using the existing diff logic
        // Note: We pass beforeState to captureBeforeState, then immediately compute
        // This is a transitional approach - eventually we can derive directly from action
        stateChangeCaptureService.captureBeforeState(
          persistentAction,
          beforeState as unknown as RootState,
        );

        const entityChanges = stateChangeCaptureService.computeEntityChanges(
          persistentAction,
          afterState as unknown as RootState,
        );

        // Queue the pre-computed changes for the effect
        operationQueueService.enqueue(captureId, entityChanges);

        OpLog.verbose('operationCaptureMetaReducer: Captured operation synchronously', {
          captureId,
          actionType: persistentAction.type,
          changeCount: entityChanges.length,
        });
      } catch (e) {
        OpLog.err('operationCaptureMetaReducer: Failed to capture operation', e);
        // Don't block the reducer - state change already happened
      }
    }

    return afterState;
  };
};
