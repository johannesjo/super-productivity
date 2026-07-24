import { Operation, OperationLogEntry } from '../core/operation.types';
import { OperationIntegrityError } from '../core/errors/sync-errors';
import {
  MixedSourceWrittenOperation,
  StoredRemoteDuplicateHandler,
} from '../persistence/operation-log-store.service';

type OperationEquals = (left: unknown, right: unknown) => boolean;

const uniqueOperationsById = (
  operations: readonly Operation[],
  equals: OperationEquals,
): Operation[] => {
  const operationById = new Map<string, Operation>();
  const uniqueOperations: Operation[] = [];
  for (const operation of operations) {
    const duplicate = operationById.get(operation.id);
    if (duplicate && !equals(duplicate, operation)) {
      throw new OperationIntegrityError(
        `Operations queued with id ${operation.id} do not match`,
      );
    }
    if (!duplicate) {
      operationById.set(operation.id, operation);
      uniqueOperations.push(operation);
    }
  }
  return uniqueOperations;
};

export const assertQueuedOperationIdentity = (
  operations: readonly Operation[],
  equals: OperationEquals,
): void => {
  uniqueOperationsById(operations, equals);
};

export interface StoredOperationReplay {
  onStoredRemoteDuplicate: StoredRemoteDuplicateHandler;
  resolveReplayableOperations: (
    operations: readonly Operation[],
    source: 'local' | 'remote',
    written: readonly MixedSourceWrittenOperation[],
  ) => Array<{ op: Operation; seq: number }>;
}

export const createStoredOperationReplay = (
  equals: OperationEquals,
): StoredOperationReplay => {
  const storedRemoteEntryById = new Map<string, OperationLogEntry>();

  return {
    onStoredRemoteDuplicate: (existing) => {
      storedRemoteEntryById.set(existing.op.id, existing);
    },
    resolveReplayableOperations: (operations, source, written) => {
      const writtenByOpId = new Map(
        written
          .filter((entry) => entry.source === source)
          .map((entry) => [entry.op.id, entry]),
      );

      return uniqueOperationsById(operations, equals).flatMap((operation) => {
        const writtenEntry = writtenByOpId.get(operation.id);
        if (writtenEntry) {
          return [{ op: writtenEntry.op, seq: writtenEntry.seq }];
        }

        const existing = storedRemoteEntryById.get(operation.id);
        return existing?.source === source &&
          existing.applicationStatus === 'pending' &&
          existing.rejectedAt === undefined &&
          existing.reducerRejectedAt === undefined
          ? [{ op: existing.op, seq: existing.seq }]
          : [];
      });
    },
  };
};
