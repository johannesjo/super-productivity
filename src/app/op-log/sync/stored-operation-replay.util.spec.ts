import { deepEqual } from '@sp/sync-core';
import {
  ActionType,
  type Operation,
  type OperationLogEntry,
  OpType,
} from '../core/operation.types';
import { createStoredOperationReplay } from './stored-operation-replay.util';

describe('stored operation replay', () => {
  const operation: Operation = {
    id: 'remote-op',
    actionType: ActionType.TASK_SHARED_UPDATE,
    opType: OpType.Update,
    entityType: 'TASK',
    entityId: 'task',
    payload: {
      actionPayload: {
        task: { id: 'task', changes: { title: 'Updated' } },
      },
      entityChanges: [],
    },
    clientId: 'remote',
    vectorClock: { remote: 1 },
    timestamp: 1,
    schemaVersion: 1,
  };

  it('returns one replay entry for identical duplicate queue entries', () => {
    const replay = createStoredOperationReplay(
      (left, right) => JSON.stringify(left) === JSON.stringify(right),
    );

    expect(
      replay.resolveReplayableOperations([operation, { ...operation }], 'remote', [
        { op: operation, seq: 1, source: 'remote' },
      ]),
    ).toEqual([{ op: operation, seq: 1 }]);
  });

  it('trusts canonical duplicate validation performed by the store', () => {
    const replay = createStoredOperationReplay(deepEqual);
    const proposed = { ...operation, entityIds: undefined };
    const existing: OperationLogEntry = {
      seq: 1,
      op: operation,
      appliedAt: 0,
      source: 'remote',
      applicationStatus: 'pending',
    };

    replay.onStoredRemoteDuplicate(existing, proposed);

    expect(replay.resolveReplayableOperations([proposed], 'remote', [])).toEqual([
      { op: operation, seq: 1 },
    ]);
  });
});
