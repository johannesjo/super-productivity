import { deepEqual } from '@sp/sync-core';
import {
  ActionType,
  extractActionPayload,
  isLwwUpdatePayload,
  isMultiEntityPayload,
  Operation,
  OperationLogEntry,
  OpType,
} from '../core/operation.types';
import { OperationIntegrityError } from '../core/errors/sync-errors';
import type { OpLogDbAdapter, OpLogTx } from './op-log-db-adapter';
import { OPS_INDEXES, STORE_NAMES } from './db-keys.const';
import type { CompactOperation } from './compact/compact-operation.types';
import {
  decodeOperation,
  encodeOperation,
  isCompactOperation,
} from './compact/operation-codec.service';
import {
  CURRENT_SCHEMA_VERSION,
  migrateOperation,
  type OperationLike,
} from '@sp/shared-schema';
import { toLwwUpdateActionType } from '../core/lww-update-action-types';

export interface StoredOperationLogEntry {
  seq: number;
  op: Operation | CompactOperation;
  appliedAt: number;
  source: 'local' | 'remote';
  syncedAt?: number;
  rejectedAt?: number;
  reducerRejectedAt?: number;
  applicationStatus?: 'pending' | 'archive_pending' | 'applied' | 'failed';
  retryCount?: number;
}

export type StoredRemoteDuplicateHandler = (
  existing: OperationLogEntry,
  proposed: Operation,
) => void;

export type StoredOperationMetadata = Omit<OperationLogEntry, 'op'>;

export const decodeStoredEntry = (stored: StoredOperationLogEntry): OperationLogEntry => {
  const op = isCompactOperation(stored.op) ? decodeOperation(stored.op) : stored.op;
  return {
    seq: stored.seq,
    op,
    appliedAt: stored.appliedAt,
    source: stored.source,
    syncedAt: stored.syncedAt,
    rejectedAt: stored.rejectedAt,
    reducerRejectedAt: stored.reducerRejectedAt,
    applicationStatus: stored.applicationStatus,
    retryCount: stored.retryCount,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const migrateForIdentityComparison = (operation: Operation): Operation | undefined => {
  const result = migrateOperation(
    {
      id: operation.id,
      opType: operation.opType,
      entityType: operation.entityType,
      entityId: operation.entityId,
      entityIds: operation.entityIds,
      payload: operation.payload,
      schemaVersion: operation.schemaVersion ?? 1,
    },
    CURRENT_SCHEMA_VERSION,
  );
  if (!result.success || !result.data || Array.isArray(result.data)) {
    return undefined;
  }
  const migrated = result.data as OperationLike;
  return {
    ...operation,
    id: migrated.id,
    opType: migrated.opType as Operation['opType'],
    entityType: migrated.entityType as Operation['entityType'],
    entityId: migrated.entityId,
    entityIds: migrated.entityIds,
    payload: migrated.payload,
    schemaVersion: migrated.schemaVersion,
  };
};

const extractIdentifiedUpdateChanges = (
  operation: Operation,
): Record<string, unknown> | undefined => {
  if (operation.opType !== OpType.Update || !operation.entityId) {
    return undefined;
  }
  const payload = operation.payload;
  const actionPayload = extractActionPayload(payload);
  if (isLwwUpdatePayload(payload)) {
    return actionPayload;
  }
  if (isMultiEntityPayload(payload)) {
    const matchingChange = payload.entityChanges.find(
      (change) =>
        change.entityType === operation.entityType &&
        change.entityId === operation.entityId &&
        change.opType === OpType.Update &&
        isRecord(change.changes),
    );
    if (matchingChange && isRecord(matchingChange.changes)) {
      return matchingChange.changes;
    }
  }

  const candidates = [
    actionPayload,
    ...Object.values(actionPayload).flatMap((value) =>
      Array.isArray(value) ? value : [value],
    ),
  ];
  for (const candidate of candidates) {
    if (!isRecord(candidate) || candidate['id'] !== operation.entityId) {
      continue;
    }
    if (isRecord(candidate['changes'])) {
      return candidate['changes'];
    }
    const changes = { ...candidate };
    delete changes['id'];
    return changes;
  }
  return undefined;
};

/**
 * Conflict resolution can durably replace a winning remote UPDATE with the
 * same operation id and causal metadata, but an authenticated LWW snapshot
 * payload. A retry still carries the original wire UPDATE. Accept that one
 * known receiver-side transformation only when every incoming change is
 * represented by the stored snapshot.
 */
const isCompatibleStoredLwwRecreation = (
  existing: Operation,
  proposed: Operation,
): boolean => {
  if (
    existing.actionType !== toLwwUpdateActionType(proposed.entityType) ||
    existing.opType !== OpType.Update ||
    proposed.opType !== OpType.Update ||
    proposed.actionType === ActionType.TASK_SHARED_MOVE_TO_ARCHIVE ||
    proposed.actionType === ActionType.TASK_SHARED_RESTORE ||
    !isLwwUpdatePayload(existing.payload) ||
    existing.payload.lwwUpdateMode !== 'replace' ||
    existing.payload.recreatesEntityAfterDelete !== true
  ) {
    return false;
  }
  const toCausalIdentity = (operation: Operation): Omit<CompactOperation, 'a' | 'p'> => {
    const compact = encodeOperation(operation);
    return {
      id: compact.id,
      o: compact.o,
      e: compact.e,
      d: compact.d,
      ds: compact.ds,
      c: compact.c,
      v: compact.v,
      t: compact.t,
      s: compact.s,
      r: compact.r,
      b: compact.b,
    };
  };
  const existingIdentity = toCausalIdentity(existing);
  const proposedIdentity = toCausalIdentity(proposed);
  if (!deepEqual(existingIdentity, proposedIdentity)) {
    return false;
  }

  const proposedChanges = extractIdentifiedUpdateChanges(proposed);
  const storedSnapshot = extractActionPayload(existing.payload);
  return (
    proposedChanges !== undefined &&
    Object.entries(proposedChanges).every(([key, value]) =>
      deepEqual(storedSnapshot[key], value),
    )
  );
};

export const storedOperationsHaveSameIdentity = (
  existing: Operation,
  proposed: Operation,
): boolean => {
  const comparableExisting = migrateForIdentityComparison(existing) ?? existing;
  const comparableProposed = migrateForIdentityComparison(proposed) ?? proposed;
  return (
    deepEqual(encodeOperation(comparableExisting), encodeOperation(comparableProposed)) ||
    isCompatibleStoredLwwRecreation(comparableExisting, comparableProposed)
  );
};

const assertStoredOperationIdentity = (
  existing: Operation,
  proposed: Operation,
): void => {
  if (!storedOperationsHaveSameIdentity(existing, proposed)) {
    throw new OperationIntegrityError(
      `Stored operation ${proposed.id} does not match the proposed remote operation`,
    );
  }
};

export const inspectStoredOperations = async (
  adapter: OpLogDbAdapter,
  operations: readonly Operation[],
): Promise<ReadonlyMap<string, StoredOperationMetadata>> => {
  const proposedById = new Map<string, Operation>();
  for (const operation of operations) {
    const duplicate = proposedById.get(operation.id);
    if (duplicate) {
      assertStoredOperationIdentity(duplicate, operation);
    } else {
      proposedById.set(operation.id, operation);
    }
  }
  if (proposedById.size === 0) {
    return new Map();
  }

  return adapter.transaction([STORE_NAMES.OPS], 'readonly', async (tx) => {
    const metadataById = new Map<string, StoredOperationMetadata>();
    for (const [operationId, proposed] of proposedById) {
      const stored = await tx.getFromIndex<StoredOperationLogEntry>(
        STORE_NAMES.OPS,
        OPS_INDEXES.BY_ID,
        operationId,
      );
      if (!stored) {
        continue;
      }
      const existing = decodeStoredEntry(stored);
      assertStoredOperationIdentity(existing.op, proposed);
      metadataById.set(operationId, {
        seq: existing.seq,
        appliedAt: existing.appliedAt,
        source: existing.source,
        syncedAt: existing.syncedAt,
        rejectedAt: existing.rejectedAt,
        reducerRejectedAt: existing.reducerRejectedAt,
        applicationStatus: existing.applicationStatus,
        retryCount: existing.retryCount,
      });
    }
    return metadataById;
  });
};

export const getStoredDuplicateSeq = async (
  tx: OpLogTx,
  proposed: Operation,
  source: 'local' | 'remote',
  onStoredRemoteDuplicate?: StoredRemoteDuplicateHandler,
): Promise<number | undefined> => {
  const existingKey = await tx.getKeyFromIndex(
    STORE_NAMES.OPS,
    OPS_INDEXES.BY_ID,
    proposed.id,
  );
  if (existingKey === undefined) {
    return undefined;
  }
  if (typeof existingKey !== 'number') {
    throw new Error('Operation sequence key is not numeric');
  }
  if (source === 'remote') {
    const stored = await tx.getFromIndex<StoredOperationLogEntry>(
      STORE_NAMES.OPS,
      OPS_INDEXES.BY_ID,
      proposed.id,
    );
    if (!stored) {
      throw new Error(`Stored operation ${proposed.id} disappeared during validation`);
    }
    const existing = decodeStoredEntry(stored);
    assertStoredOperationIdentity(existing.op, proposed);
    onStoredRemoteDuplicate?.(existing, proposed);
  }
  return existingKey;
};
