/**
 * @fileoverview Topological sort for operation dependencies
 * @status DORMANT - Not used in production (last reviewed: 2025-12)
 *
 * Kept for potential future use. See sortOperationsByDependency JSDoc for details.
 */
import { Operation, OpType } from '../operation.types';
import { OperationDependency } from '../sync/dependency-resolver.service';
import { OpLog } from '../../../log';

/**
 * Type for the dependency extractor function.
 * This allows the sorting to be decoupled from the DependencyResolverService.
 */
export type DependencyExtractor = (op: Operation) => OperationDependency[];

/**
 * Sorts operations topologically so that dependencies (parents) are applied
 * before dependents (children). Uses Kahn's algorithm with soft dependency tie-breaking.
 *
 * For operations within the same batch, this ensures that:
 * - CREATE operations for parent entities come before CREATE operations for children
 * - Operations are ordered such that any entity referenced by another operation
 *   is created first (within the batch)
 * - DELETE operations come AFTER any operations that reference the deleted entity
 *   (to allow tag/project updates to remove references before the entity is deleted)
 * - Soft dependencies (mustExist: false) are used as secondary sort preference to
 *   minimize temporary broken references
 *
 * Note: This only sorts within the batch. Dependencies on entities that already
 * exist in the store are handled by the retry mechanism.
 *
 * ---
 * CURRENTLY UNUSED: This utility is not currently used in production.
 *
 * Rationale for disabling:
 * 1. The sync server guarantees operations arrive in sequence order
 * 2. Delete operations are atomic via meta-reducers (they remove references
 *    from tags/projects in the same reducer pass, so no separate cleanup
 *    operations exist in the batch)
 *
 * When to re-enable:
 * - If operations start arriving out of order (e.g., parallel sync sources)
 * - If delete operations become non-atomic (separate cleanup operations)
 * - If any bugs appear related to operation ordering during sync
 *
 * See: operation-applier.service.ts for the original usage location
 * ---
 *
 * @param ops - Array of operations to sort
 * @param extractDependencies - Function to extract dependencies from an operation
 * @returns Sorted array of operations
 */
export const sortOperationsByDependency = (
  ops: Operation[],
  extractDependencies: DependencyExtractor,
): Operation[] => {
  if (ops.length <= 1) {
    return ops;
  }

  // Build a map of entityId -> operation that creates it (within this batch)
  const creatorMap = new Map<string, Operation>();
  // Build a map of entityId -> operation that deletes it (within this batch)
  const deleterMap = new Map<string, Operation>();
  for (const op of ops) {
    if (op.opType === OpType.Create && op.entityId) {
      creatorMap.set(op.entityId, op);
    }
    if (op.opType === OpType.Delete && op.entityId) {
      deleterMap.set(op.entityId, op);
    }
  }

  // Log DELETE operations for debugging
  if (deleterMap.size > 0) {
    OpLog.verbose(
      'sortOperationsByDependency: Batch contains DELETE operations:',
      Array.from(deleterMap.entries()).map(([entityId, op]) => ({
        entityId,
        opId: op.id,
        actionType: op.actionType,
      })),
    );
  }

  // Build dependency graph: opId -> set of opIds that must come before it (hard deps)
  // Also track soft dependencies for tie-breaking
  const hardDependencies = new Map<string, Set<string>>();
  const softDependsOn = new Map<string, Set<string>>(); // ops that soft-depend on this op
  const opById = new Map<string, Operation>();
  // Track delete-before relationships for debugging
  const deleteWaitsFor: Array<{
    deleteOpId: string;
    deleteEntityId: string;
    waitsForOpId: string;
    waitsForActionType: string;
    referencedEntityId: string;
  }> = [];

  for (const op of ops) {
    opById.set(op.id, op);
    hardDependencies.set(op.id, new Set());

    // Extract dependencies for this operation
    const deps = extractDependencies(op);

    for (const dep of deps) {
      // Check if this dependency is created by another operation in this batch
      const creatorOp = creatorMap.get(dep.entityId);
      if (creatorOp && creatorOp.id !== op.id) {
        if (dep.mustExist) {
          // Hard dependency - must be satisfied before this op
          hardDependencies.get(op.id)!.add(creatorOp.id);
        } else {
          // Soft dependency - use for tie-breaking (creatorOp should come first)
          if (!softDependsOn.has(creatorOp.id)) {
            softDependsOn.set(creatorOp.id, new Set());
          }
          softDependsOn.get(creatorOp.id)!.add(op.id);
        }
      }

      // IMPORTANT: If this operation references an entity that will be deleted,
      // the DELETE must come AFTER this operation. This ensures tag/project updates
      // that still reference a task can be applied before the task is deleted.
      const deleterOp = deleterMap.get(dep.entityId);
      if (deleterOp && deleterOp.id !== op.id) {
        // The delete operation depends on this operation completing first
        hardDependencies.get(deleterOp.id)!.add(op.id);
        deleteWaitsFor.push({
          deleteOpId: deleterOp.id,
          deleteEntityId: dep.entityId,
          waitsForOpId: op.id,
          waitsForActionType: op.actionType,
          referencedEntityId: dep.entityId,
        });
      }
    }
  }

  // Log delete ordering constraints
  if (deleteWaitsFor.length > 0) {
    OpLog.verbose(
      'sortOperationsByDependency: DELETE ordering constraints:',
      deleteWaitsFor,
    );
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>();
  for (const op of ops) {
    inDegree.set(op.id, hardDependencies.get(op.id)!.size);
  }

  // Queue of operations with no hard dependencies (in-degree = 0)
  const queue: Operation[] = [];
  for (const op of ops) {
    if (inDegree.get(op.id) === 0) {
      queue.push(op);
    }
  }

  const sorted: Operation[] = [];

  while (queue.length > 0) {
    // Sort queue to prioritize:
    // 1. CREATE ops first (they create entities others may reference)
    // 2. Ops that have soft dependents (other ops soft-depend on them)
    // 3. Earlier timestamp as final tie-breaker
    queue.sort((a, b) => {
      // CREATE ops first
      const aIsCreate = a.opType === OpType.Create ? 1 : 0;
      const bIsCreate = b.opType === OpType.Create ? 1 : 0;
      if (aIsCreate !== bIsCreate) {
        return bIsCreate - aIsCreate; // Higher (CREATE) first
      }

      // Ops with more soft dependents first (they unblock more ops)
      const aSoftDeps = softDependsOn.get(a.id)?.size ?? 0;
      const bSoftDeps = softDependsOn.get(b.id)?.size ?? 0;
      if (aSoftDeps !== bSoftDeps) {
        return bSoftDeps - aSoftDeps; // More soft dependents first
      }

      // Earlier timestamp first
      return a.timestamp - b.timestamp;
    });

    const op = queue.shift()!;
    sorted.push(op);

    // Reduce in-degree of operations that depend on this one
    for (const [depOpId, depSet] of hardDependencies) {
      if (depSet.has(op.id)) {
        depSet.delete(op.id);
        const newDegree = inDegree.get(depOpId)! - 1;
        inDegree.set(depOpId, newDegree);
        if (newDegree === 0) {
          queue.push(opById.get(depOpId)!);
        }
      }
    }
  }

  // If there are cycles (shouldn't happen normally), add remaining ops at the end
  if (sorted.length < ops.length) {
    const sortedIds = new Set(sorted.map((o) => o.id));
    const remaining = ops.filter((o) => !sortedIds.has(o.id));
    OpLog.warn(
      'sortOperationsByDependency: Detected cycle in operation dependencies. Adding remaining ops:',
      remaining.map((o) => o.id),
    );
    sorted.push(...remaining);
  }

  if (sorted.length !== ops.length) {
    OpLog.err('sortOperationsByDependency: Topological sort lost operations!', {
      input: ops.length,
      output: sorted.length,
    });
    return ops; // Fallback to original order
  }

  // Log if ordering changed, especially for DELETE operations
  if (deleterMap.size > 0) {
    const inputOrder = ops.map((o) => ({
      id: o.id.slice(-8),
      type: o.opType,
      action: o.actionType,
      entityId: o.entityId?.slice(-8),
    }));
    const outputOrder = sorted.map((o) => ({
      id: o.id.slice(-8),
      type: o.opType,
      action: o.actionType,
      entityId: o.entityId?.slice(-8),
    }));

    // Check if any reordering happened
    const orderChanged = ops.some((op, i) => op.id !== sorted[i].id);
    if (orderChanged) {
      OpLog.log('sortOperationsByDependency: Reordered operations for DELETE safety:', {
        inputOrder,
        outputOrder,
      });
    }
  }

  return sorted;
};
