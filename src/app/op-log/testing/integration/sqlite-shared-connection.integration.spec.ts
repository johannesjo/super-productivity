import { TestBed } from '@angular/core/testing';
import { Provider } from '@angular/core';
import { ActionType, EntityType, Operation, OpType } from '../../core/operation.types';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { ArchiveStoreService } from '../../persistence/archive-store.service';
import { CLIENT_ID_PROVIDER, ClientIdProvider } from '../../util/client-id.provider';
import { OP_LOG_DB_ADAPTER_FACTORY } from '../../persistence/op-log-db-adapter.token';
import { SqliteDb, SqliteOpLogAdapter } from '../../persistence/sqlite-op-log-adapter';
import { IndexedDbOpLogAdapter } from '../../persistence/indexed-db-op-log-adapter';
import { OpLogDbAdapter } from '../../persistence/op-log-db-adapter';
import { createSqlJsDb } from '../../persistence/sql-js-db.test-helper';
import { STORE_NAMES, OPS_INDEXES } from '../../persistence/db-keys.const';
import { ArchiveModel } from '../../../features/archive/archive.model';

/**
 * Reproductions for #8746 (SQLite adapter on a shared connection — Android
 * rollout gate) and the gaps cross-linked from it (#8312, #8313, compound-range
 * semantics). Every scenario runs against BOTH backends so a divergence shows
 * up as "passes on IndexedDB, fails on sql.js".
 *
 * Scenario 1 is the issue's headline failure and is now guarded (the adapter
 * serializes every operation on a per-connection FIFO queue). It is exercised
 * here at the STORE level — the exact B3 topology, two services holding two
 * adapters over one physical connection, with the archive writer bypassing the
 * OPERATION_LOG web lock — not just at the adapter level as in
 * `sqlite-op-log-adapter.spec.ts`.
 *
 * Scenarios 2–4 were the gaps cross-linked from the issue (#8312, #8313, and
 * compound-range semantics); all are now guarded on both backends.
 */

const mockClientIdProvider: ClientIdProvider = {
  loadClientId: () => Promise.resolve('testClient'),
  getOrGenerateClientId: () => Promise.resolve('testClient'),
  clearCache: () => {},
};

const makeOp = (id: string, overrides: Partial<Operation> = {}): Operation => ({
  id,
  actionType: '[Task] Update' as ActionType,
  opType: OpType.Update,
  entityType: 'TASK' as EntityType,
  entityId: id,
  payload: {},
  clientId: 'testClient',
  vectorClock: { testClient: 1 },
  timestamp: 1,
  schemaVersion: 1,
  ...overrides,
});

const archiveModel = (taskIds: string[]): ArchiveModel =>
  ({
    task: {
      ids: taskIds,
      entities: Object.fromEntries(
        taskIds.map((id) => [id, { id, title: `Archived ${id}`, isDone: true }]),
      ),
    },
    timeTracking: { project: {}, tag: {} },
    lastTimeTrackingFlush: 0,
  }) as unknown as ArchiveModel;

/** A SqliteDb that counts the rows every `query` hands back over the "bridge". */
const withRowCounter = (db: SqliteDb): SqliteDb & { rowsReturned: number } => {
  const counting = {
    rowsReturned: 0,
    run: (sql: string, params?: unknown[]) => db.run(sql, params),
    query: async (sql: string, params?: unknown[]) => {
      const rows = await db.query(sql, params);
      counting.rowsReturned += rows.length;
      return rows;
    },
  };
  return counting;
};

interface Backend {
  label: string;
  providers: () => Promise<Provider[]>;
  /** A standalone adapter over a fresh/cleared store, for adapter-level checks. */
  adapter: () => Promise<OpLogDbAdapter>;
  /** Row counter for the sql.js backend; undefined on IndexedDB. */
  counter?: () => (SqliteDb & { rowsReturned: number }) | undefined;
}

const defineRepro = (backend: Backend): void => {
  describe(`SQLite shared-connection reproductions (${backend.label})`, () => {
    let opLogStore: OperationLogStoreService;
    let archiveStore: ArchiveStoreService;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          OperationLogStoreService,
          ArchiveStoreService,
          { provide: CLIENT_ID_PROVIDER, useValue: mockClientIdProvider },
          ...(await backend.providers()),
        ],
      });
      opLogStore = TestBed.inject(OperationLogStoreService);
      archiveStore = TestBed.inject(ArchiveStoreService);
      await opLogStore.init();
      await opLogStore._clearAllDataForTesting();
      await archiveStore._clearAllDataForTesting();
    });

    // ── 1. #8746 headline: op-write tx racing an archive flush ─────────────────

    it('op-log appends racing archive flushes on one connection all land (no lost ops)', async () => {
      // Fire everything WITHOUT awaiting in between — on a single SQLite
      // connection with no serialization this either throws "cannot start a
      // transaction within a transaction" or lets a bare `add` join the
      // archive's BEGIN…ROLLBACK and vanish.
      const work: Promise<unknown>[] = [];
      for (let i = 0; i < 10; i++) {
        work.push(
          opLogStore.appendBatch([makeOp(`batch-${i}-a`), makeOp(`batch-${i}-b`)]),
        );
        work.push(
          archiveStore.saveArchivesAtomic(archiveModel([`y${i}`]), archiveModel([])),
        );
        work.push(opLogStore.append(makeOp(`single-${i}`)));
      }
      await Promise.all(work);

      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(30);
      const young = await archiveStore.loadArchiveYoung();
      expect(young?.task.ids).toEqual(['y9']);
    });

    it('a failing archive transaction does not roll back a concurrent op append', async () => {
      // A cyclic archiveOld makes the SECOND tx.put throw mid-transaction on the
      // sql.js backend (JSON.stringify rejects cycles), forcing a ROLLBACK while
      // the append below is in flight. Structured clone accepts cycles, so on
      // IndexedDB the save simply succeeds — either way only 'survivor' may be
      // in the ops store afterwards.
      const cyclic: Record<string, unknown> = {};
      cyclic['self'] = cyclic;
      const failing = archiveStore
        .saveArchivesAtomic(archiveModel(['y']), cyclic as unknown as ArchiveModel)
        .catch(() => 'rolled-back' as const);
      const append = opLogStore.append(makeOp('survivor'));
      const [outcome] = await Promise.all([failing, append]);
      expect(outcome === 'rolled-back' || outcome === undefined).toBeTrue();
      expect((await opLogStore.getOpsAfterSeq(0)).map((e) => e.op.id)).toEqual([
        'survivor',
      ]);
    });

    // ── 2. #8312: NULL-key rows leak into index scans ──────────────────────────

    it('hasSyncedOps() is false on a never-synced client with only local ops (#8312)', async () => {
      await opLogStore.append(makeOp('local-only'), 'local');
      // IndexedDB: a record without `syncedAt` is absent from the bySyncedAt
      // index. SQLite stores NULL `synced_at`, which sorts first in an
      // unbounded `ORDER BY synced_at ASC` scan — the adapter must exclude it.
      expect(await opLogStore.hasSyncedOps()).toBeFalse();
      // …and still true once a real remote op has been synced.
      await opLogStore.append(makeOp('remote-op', { clientId: 'other' }), 'remote');
      expect(await opLogStore.hasSyncedOps()).toBeTrue();
    });

    // ── 3. #8313: getLastSeq() is a full-table transfer ────────────────────────

    it('getLastSeq() does not transfer the whole ops table (#8313)', async () => {
      const counter = backend.counter?.();
      if (!counter) {
        pending('row-transfer accounting only applies to the SQLite backend');
        return;
      }
      await opLogStore.appendBatch(
        Array.from({ length: 50 }, (_, i) => makeOp(`op-${i}`)),
      );
      counter.rowsReturned = 0;
      expect(await opLogStore.getLastSeq()).toBe(50);
      // One row is all the visitor ever looks at (`direction: 'prev'` + 'stop').
      expect(counter.rowsReturned).toBeLessThanOrEqual(1);
    });
  });

  // ── 4. Compound-index range semantics ────────────────────────────────────────

  describe(`compound index ranges (${backend.label})`, () => {
    let adapter: OpLogDbAdapter;

    beforeEach(async () => {
      adapter = await backend.adapter();
      await adapter.clear(STORE_NAMES.OPS);
    });

    afterEach(() => adapter.close());

    const entry = (
      id: string,
      source: 'local' | 'remote',
      applicationStatus: 'pending' | 'applied',
    ): Record<string, unknown> => ({
      op: { id },
      appliedAt: 1,
      source,
      applicationStatus,
    });

    it('degenerate (equality) compound ranges agree — the only shape the store uses today', async () => {
      await adapter.add(STORE_NAMES.OPS, entry('lp', 'local', 'pending'));
      await adapter.add(STORE_NAMES.OPS, entry('rp', 'remote', 'pending'));
      await adapter.add(STORE_NAMES.OPS, entry('ra', 'remote', 'applied'));
      const rows = await adapter.getAllFromIndex<{ op: { id: string } }>(
        STORE_NAMES.OPS,
        OPS_INDEXES.BY_SOURCE_AND_STATUS,
        { lower: ['remote', 'pending'], upper: ['remote', 'pending'] },
      );
      expect(rows.map((r) => r.op.id)).toEqual(['rp']);
    });

    it('a genuine (non-exact) compound range is rejected on both backends', async () => {
      await adapter.add(STORE_NAMES.OPS, entry('la', 'local', 'applied'));
      await adapter.add(STORE_NAMES.OPS, entry('lp', 'local', 'pending'));
      await adapter.add(STORE_NAMES.OPS, entry('ra', 'remote', 'applied'));
      // Tuple order would include [local,pending]; per-column AND (the SQLite
      // translation) would not. Rather than diverge silently, the port
      // contract forbids non-exact compound ranges and both adapters enforce it.
      await expectAsync(
        adapter.getAllFromIndex(STORE_NAMES.OPS, OPS_INDEXES.BY_SOURCE_AND_STATUS, {
          lower: ['local', 'applied'],
          upper: ['remote', 'applied'],
        }),
      ).toBeRejectedWithError(/compound-index ranges must be exact-match/);
    });
  });
};

defineRepro({
  label: 'IndexedDB',
  providers: async () => [],
  adapter: async () => {
    const a = new IndexedDbOpLogAdapter();
    await a.init();
    return a;
  },
});

let sqlCounter: (SqliteDb & { rowsReturned: number }) | undefined;
defineRepro({
  label: 'sql.js (real SQLite)',
  providers: async () => {
    // ONE physical connection, TWO adapters (one per service) — the B3 topology.
    sqlCounter = withRowCounter(await createSqlJsDb());
    const db = sqlCounter;
    return [
      { provide: OP_LOG_DB_ADAPTER_FACTORY, useValue: () => new SqliteOpLogAdapter(db) },
    ];
  },
  adapter: async () => {
    const a = new SqliteOpLogAdapter(await createSqlJsDb());
    await a.init();
    return a;
  },
  counter: () => sqlCounter,
});
