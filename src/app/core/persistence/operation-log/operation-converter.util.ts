import { Operation } from './operation.types';
import { PersistentAction } from './persistent-action.interface';

/**
 * Maps old/renamed action types to their current names.
 * When an action is renamed, add an entry here to ensure old operations
 * in the log can still be replayed correctly.
 *
 * Format: { 'old action type': 'current action type' }
 *
 * IMPORTANT: Never remove entries from this map - old operations may still
 * reference the old action type.
 */
export const ACTION_TYPE_ALIASES: Record<string, string> = {
  // Example: '[Task] Update Task': '[Task] Update',
};

export const convertOpToAction = (op: Operation): PersistentAction => {
  // Resolve any aliased action types to their current names
  const actionType = ACTION_TYPE_ALIASES[op.actionType] ?? op.actionType;

  return {
    type: actionType,
    ...(op.payload as object),
    meta: {
      isPersistent: true,
      entityType: op.entityType,
      entityId: op.entityId,
      entityIds: op.entityIds,
      opType: op.opType,
      isRemote: true, // Important to prevent re-logging during replay/sync
    },
  };
};
