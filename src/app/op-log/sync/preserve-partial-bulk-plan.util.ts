import { uuidv7 } from '../../util/uuid-v7';
import {
  incrementVectorClock,
  mergeVectorClocks,
  VectorClock,
} from '../../core/util/vector-clock';
import { CURRENT_SCHEMA_VERSION } from '../persistence/schema-migration.service';
import {
  ActionType,
  extractActionPayload,
  isMultiEntityPayload,
  Operation,
} from '../core/operation.types';
import { getOpEntityIds } from '../util/get-op-entity-ids.util';

/**
 * The multi-entity UPDATE actions whose atomic local rows are preserved by a
 * scoped replacement when a conflict rejects them (#9426, #9405). Both are
 * dispatched by the automatic day-rollover with every matching task id
 * (`TaskDueEffects`), their reducers' per-task effect is a pure scheduling
 * fold over `taskIds` (no cross-task invariant), and a narrowed row is a
 * payload shape every released client replays natively — single-task
 * `planTasksForToday` dispatchers ship in production (`TaskService.addToToday`,
 * TaskComponent's add-to-my-day).
 */
export const SCOPED_PLAN_MULTI_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>([
  ActionType.TASK_SHARED_PLAN_FOR_TODAY,
  ActionType.TASK_SHARED_PLAN_DEADLINE_FOR_TODAY,
]);

interface ConflictLike {
  entityId: string;
  localOps: Operation[];
  remoteOps: Operation[];
}

interface ResolutionLike {
  winner: 'local' | 'remote';
  localWinOp?: Operation;
  conflict: ConflictLike;
}

interface BulkPlanResolutionGroup {
  planOp: Operation;
  resolutions: ResolutionLike[];
  decidedTargetIds: Set<string>;
}

const mergeAndIncrementClocks = (
  clocks: VectorClock[],
  clientId: string,
): VectorClock => {
  let merged: VectorClock = {};
  for (const clock of clocks) {
    merged = mergeVectorClocks(merged, clock);
  }
  return incrementVectorClock(merged, clientId);
};

/**
 * #9426: a `planTasksForToday` bulk row is atomic, so any conflict rejects the
 * whole row even though the surviving siblings' plan intent (dueDay set to the
 * plan day, reminders cleared) is already applied locally and would otherwise
 * never upload. Mirror of the bulk-delete preserve
 * (`ConflictResolutionService._preservePartiallyRejectedLocalBulkDeletes`):
 * replace each affected row with ONE narrowed copy that
 *
 * - drops every COVERED conflict target id — remote winners are owned by the
 *   newer remote op, and local winners are carried by their whole-state
 *   `localWinOp` snapshot (a second op would ride an equal clock). A local win
 *   WITHOUT a covering snapshot (`localWinOp` undefined: the entity is absent
 *   from the live store, e.g. archive-sibling shapes) keeps its id instead —
 *   the reducers skip unknown task ids, so retaining it is at worst a replay
 *   no-op and can never silently drop the target's plan intent,
 * - keeps every other id with the original action payload and timestamp, and
 * - dominates every conflict clock involving the original row.
 *
 * When several plan rows are grouped in one batch (the multi-day compounding
 * case: a wedged client mints a new day-rollover op every day), replacements
 * are emitted in ascending original-timestamp order. Their proposed clocks may
 * be identical (same merge base), which would be CONCURRENT on the shared task
 * ids — but every local append is rebased onto the durable running clock in
 * `appendMixedSourceBatchSkipDuplicates` (#8939), so the WRITTEN rows are
 * strictly ordered. Pinned by the multi-day case in
 * `today-plan-conflict-resolution.integration.spec.ts`, which fails if that
 * rebase is ever bypassed.
 */
export const buildScopedBulkPlanReplacements = (
  resolutions: ResolutionLike[],
  clientId: string,
): Operation[] => {
  const groups = new Map<string, BulkPlanResolutionGroup>();
  for (const resolution of resolutions) {
    for (const localOp of resolution.conflict.localOps) {
      if (
        !SCOPED_PLAN_MULTI_ACTIONS.has(localOp.actionType) ||
        getOpEntityIds(localOp).length <= 1
      ) {
        continue;
      }
      const group = groups.get(localOp.id) ?? {
        planOp: localOp,
        resolutions: [],
        decidedTargetIds: new Set<string>(),
      };
      group.resolutions.push(resolution);
      const targetIsCovered =
        resolution.winner === 'remote' || resolution.localWinOp !== undefined;
      if (targetIsCovered) {
        group.decidedTargetIds.add(resolution.conflict.entityId);
      }
      groups.set(localOp.id, group);
    }
  }

  const orderedGroups = [...groups.values()].sort(
    (a, b) => a.planOp.timestamp - b.planOp.timestamp,
  );
  const replacements: Operation[] = [];
  for (const group of orderedGroups) {
    const retainedEntityIds = getOpEntityIds(group.planOp).filter(
      (entityId) => !group.decidedTargetIds.has(entityId),
    );
    if (retainedEntityIds.length === 0) {
      continue;
    }
    const allClocks = group.resolutions.flatMap(({ conflict }) => [
      ...conflict.localOps.map((op) => op.vectorClock),
      ...conflict.remoteOps.map((op) => op.vectorClock),
    ]);
    const newClock = mergeAndIncrementClocks(allClocks, clientId);

    const retainedSet = new Set(retainedEntityIds);
    const originalActionPayload = extractActionPayload(group.planOp.payload);
    const scopedActionPayload: Record<string, unknown> = {
      ...originalActionPayload,
      taskIds: retainedEntityIds,
    };
    const parentTaskMap = originalActionPayload['parentTaskMap'];
    if (parentTaskMap && typeof parentTaskMap === 'object') {
      scopedActionPayload['parentTaskMap'] = Object.fromEntries(
        Object.entries(parentTaskMap as Record<string, unknown>).filter(([taskId]) =>
          retainedSet.has(taskId),
        ),
      );
    }
    const scopedPayload = isMultiEntityPayload(group.planOp.payload)
      ? {
          ...group.planOp.payload,
          actionPayload: scopedActionPayload,
          entityChanges: group.planOp.payload.entityChanges.filter((change) =>
            retainedSet.has(change.entityId),
          ),
        }
      : scopedActionPayload;

    replacements.push({
      ...group.planOp,
      id: uuidv7(),
      entityId: retainedEntityIds[0],
      entityIds: retainedEntityIds,
      payload: scopedPayload,
      clientId,
      vectorClock: newClock,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  }
  return replacements;
};
