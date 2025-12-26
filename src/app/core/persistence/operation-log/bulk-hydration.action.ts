import { createAction, props } from '@ngrx/store';
import { Operation } from './operation.types';

/**
 * Action to bulk-apply operations during local hydration.
 * This allows 500+ operations to be applied in a single NgRx dispatch,
 * dramatically improving startup performance.
 */
export const bulkApplyHydrationOperations = createAction(
  '[OperationLog] Bulk Apply Hydration Operations',
  props<{ operations: Operation[] }>(),
);
