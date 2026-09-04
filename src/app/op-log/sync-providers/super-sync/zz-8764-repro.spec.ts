/**
 * Reproduction for #8764: strict enum parsing of SuperSync DOWNLOAD responses
 * rejects an entire page when a single op carries a value this client does
 * not know, before the schema-version "update your app" UX can fire.
 */
import { SUPER_SYNC_OP_TYPES } from '@sp/shared-schema';
import { OpType } from '../../core/operation.types';
import { InvalidDataSPError } from '../../core/errors/sync-errors';
import {
  validateOpDownloadResponse,
  validateRestorePointsResponse,
} from './response-validators';

const op = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
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

const page = (ops: Record<string, unknown>[]): unknown => ({
  ops: ops.map((o, i) => ({ serverSeq: i + 1, op: o, receivedAt: 1 })),
  hasMore: false,
  latestSeq: ops.length,
});

describe('#8764 repro — app-side SuperSync response validators', () => {
  it('rejects the WHOLE download page when one op has an unknown opType (even with a newer schemaVersion the version guard would have caught)', () => {
    const raw = page([
      op(),
      op({ id: 'op-2', opType: 'FUTURE_OP', schemaVersion: 99 }),
      op({ id: 'op-3' }),
    ]);
    let caught: unknown;
    try {
      validateOpDownloadResponse(raw);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(InvalidDataSPError);
    // The message the user ends up seeing in the generic sync-wrapper snack:
    expect((caught as Error).message).toContain('OpDownloadResponse.ops.1.op.opType');
    console.log('[8764] user-facing message:', (caught as Error).message);
  });

  it('rejects the page for an unknown syncImportReason', () => {
    expect(() =>
      validateOpDownloadResponse(
        page([op({ opType: 'SYNC_IMPORT', syncImportReason: 'FUTURE_REASON' })]),
      ),
    ).toThrowError(InvalidDataSPError);
  });

  it('rejects the restore-point list for an unknown type', () => {
    expect(() =>
      validateRestorePointsResponse({
        restorePoints: [
          { serverSeq: 1, timestamp: 1, type: 'SYNC_IMPORT', clientId: 'c' },
          { serverSeq: 2, timestamp: 2, type: 'FUTURE_SNAPSHOT', clientId: 'c' },
        ],
      }),
    ).toThrowError(InvalidDataSPError);
  });

  it('tolerates an unknown extra FIELD on an op (passthrough) — the asymmetry the issue describes', () => {
    expect(() =>
      validateOpDownloadResponse(page([op({ futureField: 1 })])),
    ).not.toThrow();
  });

  it('sync-core OpType and shared-schema SUPER_SYNC_OP_TYPES currently agree (no test enforced this before)', () => {
    expect((Object.values(OpType) as string[]).sort()).toEqual(
      ([...SUPER_SYNC_OP_TYPES] as string[]).sort(),
    );
  });
});
