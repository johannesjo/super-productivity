import { Action, ActionReducer } from '@ngrx/store';
import { bulkApplyHydrationOperations } from './bulk-hydration.action';
import { convertOpToAction } from './operation-converter.util';

/**
 * Meta-reducer that applies multiple operations in a single reducer pass.
 *
 * This is used during local hydration to apply tail operations (operations
 * recorded after the last snapshot). Instead of dispatching 500 individual
 * actions (which causes 500 store updates), this meta-reducer applies all
 * operations in one dispatch, dramatically improving startup performance.
 *
 * The approach works because:
 * 1. Each operation is converted to its NgRx action via convertOpToAction()
 * 2. Each action goes through the full reducer chain (including meta-reducers)
 * 3. Final state is returned after all operations are applied
 *
 * Performance impact: 500 dispatches → 1 dispatch = ~10-50x faster hydration
 *
 * IMPORTANT considerations:
 * - Meta-reducer order is critical: this MUST be positioned FIRST in the
 *   metaReducers array (see main.ts) so downstream meta-reducers process
 *   each operation's converted action correctly.
 * - The synchronous loop could block the main thread for 10,000+ operations.
 *   Not tested at that scale. If needed, consider chunking with requestIdleCallback.
 */
export const bulkHydrationMetaReducer = <T>(
  reducer: ActionReducer<T>,
): ActionReducer<T> => {
  return (state: T | undefined, action: Action): T => {
    if (action.type === bulkApplyHydrationOperations.type) {
      const { operations } = action as ReturnType<typeof bulkApplyHydrationOperations>;

      let currentState = state;
      for (const op of operations) {
        const opAction = convertOpToAction(op);
        currentState = reducer(currentState, opAction);
      }
      return currentState as T;
    }
    return reducer(state, action);
  };
};
