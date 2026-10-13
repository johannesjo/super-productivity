import { describe, expect, it } from 'vitest';
import {
  planRegularOpsAfterFullStateUpload,
  planUploadLastServerSeqUpdate,
} from '../src/upload-planning';
import type { Operation, OperationLogEntry } from '../src';

const createOperation = (id: string): Operation<string> => ({
  id,
  actionType: '[Test] Action',
  opType: 'UPD',
  entityType: 'TASK',
  entityId: id,
  payload: {},
  clientId: 'client-1',
  vectorClock: { client1: 1 },
  timestamp: 1,
  schemaVersion: 1,
});

const createEntry = (seq: number, id: string): OperationLogEntry<Operation<string>> => ({
  seq,
  op: createOperation(id),
  appliedAt: 1,
  source: 'local',
});

describe('planRegularOpsAfterFullStateUpload', () => {
  it('keeps all regular ops pending when no full-state op was uploaded', () => {
    const entries = [createEntry(1, '001'), createEntry(2, '002')];

    expect(
      planRegularOpsAfterFullStateUpload({
        regularOps: entries,
        lastUploadedFullStateOpSeq: undefined,
      }),
    ).toEqual({
      opsIncludedInSnapshot: [],
      opsAfterSnapshot: entries,
    });
  });

  it('splits regular ops before and after the uploaded full-state op seq', () => {
    const before = createEntry(1, '001');
    const same = createEntry(2, '010');
    const after = createEntry(3, '011');

    expect(
      planRegularOpsAfterFullStateUpload({
        regularOps: [before, same, after],
        lastUploadedFullStateOpSeq: 2,
      }),
    ).toEqual({
      opsIncludedInSnapshot: [before],
      opsAfterSnapshot: [same, after],
    });
  });

  it('uploads an op created after the snapshot even when its id sorts before the full-state op id (clock rollback)', () => {
    // Wall-clock rollback: the post-snapshot op got a lexically SMALLER UUIDv7
    // id than the full-state op. Local seq order must win — the op is NOT in
    // the frozen snapshot payload and must be uploaded, not marked synced.
    const afterSnapshotWithSmallerId = createEntry(5, '001');

    expect(
      planRegularOpsAfterFullStateUpload({
        regularOps: [afterSnapshotWithSmallerId],
        lastUploadedFullStateOpSeq: 4,
      }),
    ).toEqual({
      opsIncludedInSnapshot: [],
      opsAfterSnapshot: [afterSnapshotWithSmallerId],
    });
  });
});

describe('planUploadLastServerSeqUpdate', () => {
  it('uses latest seq while preventing regression when piggyback is complete', () => {
    expect(
      planUploadLastServerSeqUpdate({
        currentHighestReceivedSeq: 100,
        responseLatestSeq: 90,
        hasMorePiggyback: false,
        piggybackServerSeqs: [],
      }),
    ).toEqual({
      seqToStore: 100,
      highestReceivedSeq: 100,
      hasMorePiggyback: false,
      reason: 'complete',
    });
  });

  it('stores the highest received piggyback seq when more piggybacked ops remain', () => {
    expect(
      planUploadLastServerSeqUpdate({
        currentHighestReceivedSeq: 40,
        responseLatestSeq: 100,
        hasMorePiggyback: true,
        piggybackServerSeqs: [45, 50, 47],
      }),
    ).toEqual({
      seqToStore: 50,
      highestReceivedSeq: 50,
      hasMorePiggyback: true,
      reason: 'has-more-with-piggyback',
    });
  });

  it('keeps the previous highest seq when server reports more piggyback without returning ops', () => {
    expect(
      planUploadLastServerSeqUpdate({
        currentHighestReceivedSeq: 40,
        responseLatestSeq: 100,
        hasMorePiggyback: true,
        piggybackServerSeqs: [],
      }),
    ).toEqual({
      seqToStore: 40,
      highestReceivedSeq: 40,
      hasMorePiggyback: true,
      reason: 'has-more-empty',
    });
  });
});
