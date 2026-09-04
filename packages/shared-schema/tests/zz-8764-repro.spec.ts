import { describe, expect, it } from 'vitest';
import {
  SUPER_SYNC_OP_TYPES,
  SuperSyncDownloadOpsResponseSchema,
  SuperSyncRestorePointsResponseSchema,
  SuperSyncUploadOpsRequestSchema,
  SuperSyncUploadSnapshotRequestSchema,
} from '../src/supersync-http-contract';

const op = (overrides: Record<string, unknown> = {}) => ({
  id: 'op-1',
  clientId: 'client_1',
  actionType: '[Task] Add',
  opType: 'CRT',
  entityType: 'TASK',
  entityId: 't1',
  payload: {},
  vectorClock: { client_1: 1 },
  timestamp: 1,
  schemaVersion: 4,
  ...overrides,
});

const download = (ops: unknown[]) => ({
  ops: ops.map((o, i) => ({ serverSeq: i + 1, op: o, receivedAt: 1 })),
  hasMore: false,
  latestSeq: ops.length,
});

describe('#8764 repro — shared-schema wire contract', () => {
  it('download response: one op with an unknown opType rejects the WHOLE page', () => {
    const r = SuperSyncDownloadOpsResponseSchema.safeParse(
      download([
        op(),
        op({ id: 'op-2', opType: 'FUTURE_OP', schemaVersion: 99 }),
        op({ id: 'op-3' }),
      ]),
    );
    console.log('opType issues:', JSON.stringify(r.success ? [] : r.error.issues));
    expect(r.success).toBe(false);
  });

  it('download response: unknown syncImportReason rejects the page', () => {
    const r = SuperSyncDownloadOpsResponseSchema.safeParse(
      download([op({ opType: 'SYNC_IMPORT', syncImportReason: 'FUTURE_REASON' })]),
    );
    expect(r.success).toBe(false);
  });

  it('download response: unknown extra FIELD on an op is tolerated (passthrough)', () => {
    const r = SuperSyncDownloadOpsResponseSchema.safeParse(
      download([op({ futureField: 1 })]),
    );
    expect(r.success).toBe(true);
  });

  it('restore points: unknown type rejects the whole list', () => {
    const r = SuperSyncRestorePointsResponseSchema.safeParse({
      restorePoints: [
        { serverSeq: 1, timestamp: 1, type: 'SYNC_IMPORT', clientId: 'c' },
        { serverSeq: 2, timestamp: 2, type: 'FUTURE_SNAPSHOT', clientId: 'c' },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('upload request: unknown opType passes transport (per-op validation) — already fixed', () => {
    const r = SuperSyncUploadOpsRequestSchema.safeParse({
      ops: [op({ opType: 'FUTURE_OP' })],
      clientId: 'client_1',
    });
    expect(r.success).toBe(true);
  });

  it('upload request: unknown syncImportReason still 400s the WHOLE batch', () => {
    const r = SuperSyncUploadOpsRequestSchema.safeParse({
      ops: [
        op(),
        op({ id: 'op-2', opType: 'SYNC_IMPORT', syncImportReason: 'FUTURE_REASON' }),
      ],
      clientId: 'client_1',
    });
    expect(r.success).toBe(false);
  });

  it('snapshot upload request: unknown snapshotOpType / syncImportReason 400', () => {
    const base = {
      state: {},
      clientId: 'client_1',
      reason: 'initial',
      vectorClock: { client_1: 1 },
    };
    expect(
      SuperSyncUploadSnapshotRequestSchema.safeParse({
        ...base,
        snapshotOpType: 'FUTURE',
      }).success,
    ).toBe(false);
    expect(
      SuperSyncUploadSnapshotRequestSchema.safeParse({
        ...base,
        syncImportReason: 'FUTURE',
      }).success,
    ).toBe(false);
  });

  it('documents the current vocabulary', () => {
    console.log('SUPER_SYNC_OP_TYPES:', SUPER_SYNC_OP_TYPES.join(','));
  });
});

describe('#8764 repro — the one capability seam that exists is itself brittle', () => {
  const base = { ops: [], hasMore: false, latestSeq: 0 };
  it('capabilities.causalRepairSnapshots: false rejects the whole download page', () => {
    const r = SuperSyncDownloadOpsResponseSchema.safeParse({
      ...base,
      capabilities: { causalRepairSnapshots: false },
    });
    console.log(
      'capabilities=false issues:',
      JSON.stringify(r.success ? [] : r.error.issues),
    );
    expect(r.success).toBe(false);
  });
  it('an unknown capability key is tolerated (stripped)', () => {
    const r = SuperSyncDownloadOpsResponseSchema.safeParse({
      ...base,
      capabilities: { causalRepairSnapshots: true, futureCapability: true },
    });
    expect(r.success).toBe(true);
  });
});
