import { Action, ActionReducer } from '@ngrx/store';
import { isPersistentAction, PersistentAction } from '../persistent-action.interface';
import { OperationCaptureService } from './operation-capture.service';
import { OpLog } from '../../../log';

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURAL DEBT: Module-Level State for Meta-Reducer Service Injection
// ═══════════════════════════════════════════════════════════════════════════
//
// Meta-reducers in NgRx are pure functions that cannot use Angular's dependency
// injection directly. To enable the capture service to be called from within
// the meta-reducer, we use module-level mutable state.
//
// This pattern has tradeoffs:
// PROS:
// - Works with NgRx's pure function requirement
// - Service is initialized once, used synchronously
// - Simple to understand and debug
//
// CONS:
// - Breaks pure function convention (hidden side effect)
// - Requires explicit initialization in app bootstrap
// - Test setup must call setOperationCaptureService()
// - If actions dispatch before init, operations are lost (with warning logged)
//
// POTENTIAL REFACTORING APPROACHES:
// 1. Use NgRx's META_REDUCERS token with a factory provider that creates a
//    closure over the injected service. This would require structural changes
//    to how metaReducers are registered in StoreModule.forRoot().
// 2. Use Angular's APP_INITIALIZER to guarantee service is set before any
//    actions dispatch (currently done, but coupling is implicit).
// 3. Store before-state in action metadata instead of capturing in meta-reducer
//    (would require changes to all persistent actions).
//
// Current implementation is stable and well-tested. Refactoring should be
// considered only if significant architectural changes are planned.
// ═══════════════════════════════════════════════════════════════════════════

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
 * Counter for total operations enqueued.
 * Used for high-volume sync debugging to track operation flow.
 */
let totalEnqueueCount = 0;

/**
 * Flag indicating whether remote operations are currently being applied.
 * When true, local user interactions should NOT be captured as new operations.
 *
 * This prevents the "slow device cascade" problem where:
 * 1. User syncs after a long time, many operations need to be applied
 * 2. User interacts with the app during sync (creates a task, clicks done, etc.)
 * 3. These interactions are captured as local operations with stale vector clocks
 * 4. When uploaded, these ops conflict with the remote ops just downloaded
 *
 * Set by HydrationStateService via setIsApplyingRemoteOps().
 */
let isApplyingRemoteOps = false;

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
 * Sets the flag indicating whether remote operations are being applied.
 * Called by HydrationStateService.startApplyingRemoteOps() and endApplyingRemoteOps().
 *
 * When true, local user interactions will not be captured as operations.
 * This prevents stale vector clocks and conflicts during sync.
 */
export const setIsApplyingRemoteOps = (value: boolean): void => {
  isApplyingRemoteOps = value;
};

/**
 * Gets the current state of the isApplyingRemoteOps flag.
 */
export const getIsApplyingRemoteOps = (): boolean => {
  return isApplyingRemoteOps;
};

/**
 * Meta-reducer that enqueues actions for operation logging.
 *
 * PERFORMANCE OPTIMIZATION: This meta-reducer no longer performs state diffing.
 * It simply enqueues the action for the effect to process.
 *
 * Flow:
 * 1. Call inner reducer to get after-state
 * 2. Enqueue action for effect processing (no expensive diffing)
 *
 * The effect dequeues and creates operations from action payloads.
 *
 * Note: This meta-reducer can be registered at any position in the metaReducers
 * array since it no longer needs before/after state comparison.
 */
export const operationCaptureMetaReducer = <S, A extends Action = Action>(
  reducer: ActionReducer<S, A>,
): ActionReducer<S, A> => {
  return (state: S | undefined, action: A): S => {
    // Call inner reducer first
    const afterState = reducer(state, action);

    // Only process persistent, non-remote actions
    // Also skip if remote operations are being applied (prevents stale vector clocks)
    if (isPersistentAction(action) && !(action as PersistentAction).meta.isRemote) {
      // Skip capturing if remote operations are being applied (sync in progress)
      // This prevents user interactions during sync from creating operations with stale clocks
      if (isApplyingRemoteOps) {
        OpLog.verbose(
          'operationCaptureMetaReducer: Skipping capture during remote op application',
          { actionType: action.type },
        );
        return afterState;
      }

      // Warn if service not initialized - this means we'll lose the operation
      if (!operationCaptureService) {
        OpLog.warn(
          'operationCaptureMetaReducer: Service not initialized - operation will not be captured!',
          { actionType: action.type },
        );
      } else {
        try {
          const persistentAction = action as PersistentAction;

          // Enqueue action for effect processing (no state diffing needed)
          operationCaptureService.enqueue(persistentAction);

          // Reset failure counter on success
          consecutiveCaptureFailures = 0;

          // Track enqueue count for high-volume debugging
          totalEnqueueCount++;
          if (totalEnqueueCount % 50 === 0) {
            OpLog.normal(
              `operationCaptureMetaReducer: Enqueued ${totalEnqueueCount} operations total`,
            );
          }

          OpLog.verbose(
            'operationCaptureMetaReducer: Enqueued action for operation capture',
            {
              actionType: persistentAction.type,
            },
          );
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
