import { Action, ActionReducer } from '@ngrx/store';
import { RootState } from '../../../../root-store/root-state';
import { isPersistentAction, PersistentAction } from '../persistent-action.interface';
import { StateChangeCaptureService } from './state-change-capture.service';

/**
 * Reference to the StateChangeCaptureService instance.
 * This is set during app initialization via `setStateChangeCaptureService()`.
 *
 * We use this pattern because meta-reducers are pure functions and cannot
 * use Angular's dependency injection directly.
 */
let stateChangeCaptureService: StateChangeCaptureService | null = null;

/**
 * Sets the StateChangeCaptureService instance for the meta-reducer.
 * Must be called during app initialization before any persistent actions are dispatched.
 *
 * @param service The StateChangeCaptureService instance
 */
export const setStateChangeCaptureService = (
  service: StateChangeCaptureService,
): void => {
  stateChangeCaptureService = service;
};

/**
 * Gets the current StateChangeCaptureService instance.
 * Returns null if not yet initialized.
 */
export const getStateChangeCaptureService = (): StateChangeCaptureService | null => {
  return stateChangeCaptureService;
};

/**
 * Meta-reducer that captures state BEFORE persistent actions are processed.
 *
 * This is the first step in the multi-entity operation flow:
 * 1. [Meta-reducer] Capture before-state for persistent actions
 * 2. [Reducers] Process action and update state
 * 3. [Effect] Compute entity changes by diffing before/after state
 * 4. [Effect] Create operation with entityChanges array
 *
 * Why a meta-reducer?
 * - Meta-reducers run BEFORE the action reaches feature reducers
 * - This is the only place we can capture state BEFORE it changes
 * - Effects run AFTER reducers, so they only see the after-state
 *
 * Note: This meta-reducer should be registered LAST in the meta-reducer chain
 * so that it runs closest to the actual feature reducers.
 */
export const stateCaptureMetaReducer = <S, A extends Action = Action>(
  reducer: ActionReducer<S, A>,
): ActionReducer<S, A> => {
  return (state: S | undefined, action: A): S => {
    // Only capture for persistent, non-remote actions
    if (
      state &&
      stateChangeCaptureService &&
      isPersistentAction(action) &&
      !(action as PersistentAction).meta.isRemote
    ) {
      // Capture the before-state for this action
      // Cast to RootState since we know the app uses RootState
      stateChangeCaptureService.captureBeforeState(
        action as PersistentAction,
        state as unknown as RootState,
      );
    }

    // Pass to next reducer in chain
    return reducer(state, action);
  };
};
