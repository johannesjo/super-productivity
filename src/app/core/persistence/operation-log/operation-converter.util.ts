import { isMultiEntityPayload, Operation } from './operation.types';
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

/**
 * Extracts the action payload from an operation.
 * Handles both multi-entity payloads (new format) and legacy payloads.
 */
const extractActionPayload = (payload: unknown): Record<string, unknown> => {
  if (isMultiEntityPayload(payload)) {
    // Multi-entity payload: extract the original action payload
    return payload.actionPayload;
  }
  // Legacy format: payload is directly the action payload
  return payload as Record<string, unknown>;
};

/**
 * Converts an Operation from the operation log back into a PersistentAction.
 * Used during sync replay and recovery to re-dispatch operations.
 *
 * For multi-entity operations, this extracts the actionPayload and uses that
 * to reconstruct the original action. The meta-reducers will then apply all
 * the entity changes atomically.
 */
export const convertOpToAction = (op: Operation): PersistentAction => {
  // Resolve any aliased action types to their current names
  const actionType = ACTION_TYPE_ALIASES[op.actionType] ?? op.actionType;

  // Extract the action payload (handles both multi-entity and legacy formats)
  const actionPayload = extractActionPayload(op.payload);

  return {
    type: actionType,
    ...actionPayload,
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
