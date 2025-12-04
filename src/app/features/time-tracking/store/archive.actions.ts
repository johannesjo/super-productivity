import { createAction } from '@ngrx/store';
import { PersistentActionMeta } from '../../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../../core/persistence/operation-log/operation.types';

/**
 * Persistent action to flush data from archiveYoung to archiveOld.
 * This action is dispatched when the local client determines it's time to flush,
 * and is synced to other clients to ensure deterministic archive state.
 *
 * When received remotely, the receiving client executes the same flush logic,
 * ensuring both clients have consistent archiveOld content without needing
 * to sync the large archiveOld files directly.
 *
 * Prerequisites:
 * - Vector clock ordering ensures this action is applied AFTER all preceding
 *   moveToArchive operations that populated archiveYoung.
 */
export const flushYoungToOld = createAction(
  '[Archive] Flush Young to Old',
  (actionProps: { timestamp: number }) => ({
    ...actionProps,
    meta: {
      isPersistent: true,
      entityType: 'ALL', // Affects multiple entity types (tasks, timeTracking)
      opType: OpType.Batch, // Bulk operation affecting multiple entities
    } as PersistentActionMeta,
  }),
);
