import { Action, ActionReducer } from '@ngrx/store';
import { RootState } from '../../../../root-store/root-state';
import { isPersistentAction, PersistentAction } from '../persistent-action.interface';
import { OperationCaptureService } from './operation-capture.service';
import { OpLog } from '../../../log';

/**
 * Reference to the consolidated service needed by the meta-reducer.
 * Set during app initialization via `setOperationCaptureService()`.
 *
 * We use this pattern because meta-reducers are pure functions and cannot
 * use Angular's dependency injection directly.
 */
let operationCaptureService: OperationCaptureService | null = null;

/**
 * Track consecutive capture failures to detect persistent issues.
 * If failures accumulate, something is seriously wrong with sync.
 */
let consecutiveCaptureFailures = 0;
const MAX_CONSECUTIVE_FAILURES_BEFORE_WARNING = 3;

/**
 * Sets the service instance for the meta-reducer.
 * Must be called during app initialization before any persistent actions are dispatched.
 */
export const setOperationCaptureService = (service: OperationCaptureService): void => {
  operationCaptureService = service;
  OpLog.normal('operationCaptureMetaReducer: Service initialized');
};

/**
 * Gets the current OperationCaptureService instance.
 */
export const getOperationCaptureService = (): OperationCaptureService | null => {
  return operationCaptureService;
};

/**
 * Meta-reducer that captures entity changes SYNCHRONOUSLY.
 *
 * This solves the race condition in the previous approach:
 * - OLD: Before-state captured in pre-reducer, after-state captured ASYNC in effect
 * - NEW: Both before and after captured SYNCHRONOUSLY in this meta-reducer
 *
 * Flow:
 * 1. Capture before-state (current state)
 * 2. Call inner reducer to get after-state
 * 3. Compute entity changes from diff and queue for effect
 *
 * The effect simply dequeues the pre-computed changes - no async state reads!
 *
 * CRITICAL: This meta-reducer MUST be registered FIRST (index 0) in the metaReducers
 * array in main.ts. NgRx composes meta-reducers from RIGHT-TO-LEFT using reduceRight,
 * so FIRST in array = OUTERMOST in call chain.
 *
 * Being OUTERMOST means this meta-reducer:
 * - Receives the ORIGINAL state BEFORE any other meta-reducer modifies it
 * - Gets the FINAL state AFTER all inner reducers complete
 *
 * If placed LAST (innermost), other meta-reducers like taskSharedCrudMetaReducer
 * would modify state BEFORE this runs, causing beforeState === afterState.
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
    if (isPersistentAction(action) && !(action as PersistentAction).meta.isRemote) {
      // Warn if service not initialized - this means we'll lose the operation
      if (!operationCaptureService) {
        OpLog.warn(
          'operationCaptureMetaReducer: Service not initialized - operation will not be captured!',
          { actionType: action.type },
        );
      } else if (!beforeState) {
        OpLog.warn(
          'operationCaptureMetaReducer: No before state - operation will not be captured!',
          { actionType: action.type },
        );
      } else {
        try {
          const persistentAction = action as PersistentAction;

          // Compute entity changes and queue in one step
          operationCaptureService.computeAndEnqueue(
            persistentAction,
            beforeState as unknown as RootState,
            afterState as unknown as RootState,
          );

          // Reset failure counter on success
          consecutiveCaptureFailures = 0;

          OpLog.verbose('operationCaptureMetaReducer: Captured operation synchronously', {
            actionType: persistentAction.type,
          });
        } catch (e) {
          consecutiveCaptureFailures++;

          // Log with increasing severity based on failure count
          if (consecutiveCaptureFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_WARNING) {
            OpLog.err(
              `operationCaptureMetaReducer: CRITICAL - ${consecutiveCaptureFailures} consecutive capture failures! ` +
                'Sync data may be inconsistent. Consider triggering a full sync.',
              { actionType: action.type, error: e },
            );
          } else {
            OpLog.err('operationCaptureMetaReducer: Failed to capture operation', {
              actionType: action.type,
              error: e,
              failureCount: consecutiveCaptureFailures,
            });
          }
          // Don't block the reducer - state change already happened.
          // Note: If capture fails, local state diverges from other clients until a
          // SYNC_IMPORT (full state sync) is triggered. This is a known limitation.
        }
      }
    }

    return afterState;
  };
};
