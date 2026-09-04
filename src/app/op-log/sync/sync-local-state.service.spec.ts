import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { SyncLocalStateService } from './sync-local-state.service';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { StateSnapshotService } from '../backup/state-snapshot.service';
import {
  ActionType,
  EntityType,
  OperationLogEntry,
  OpType,
} from '../core/operation.types';

type StateCache = NonNullable<
  Awaited<ReturnType<OperationLogStoreService['loadStateCache']>>
>;

describe('SyncLocalStateService', () => {
  let service: SyncLocalStateService;
  let opLogStoreSpy: jasmine.SpyObj<OperationLogStoreService>;

  const entry = (
    entityType: EntityType,
    actionType: ActionType,
    opType: OpType,
    source: 'local' | 'remote' = 'local',
  ): OperationLogEntry => ({
    seq: 1,
    op: {
      id: `op-${entityType}`,
      clientId: 'client-A',
      actionType,
      opType,
      entityType,
      entityId: 'SINGLETON',
      payload: {},
      vectorClock: { clientA: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
    },
    appliedAt: Date.now(),
    source,
  });

  const migrationGenesis = entry(
    'MIGRATION',
    ActionType.MIGRATION_GENESIS_IMPORT,
    OpType.Batch,
  );
  const recoveryGenesis = entry(
    'RECOVERY',
    ActionType.RECOVERY_DATA_IMPORT,
    OpType.Batch,
  );
  const regularOp = entry('TASK', '[Task] Add Task' as ActionType, OpType.Create);
  const syncImport = entry('ALL', ActionType.LOAD_ALL_DATA, OpType.SyncImport);

  beforeEach(() => {
    opLogStoreSpy = jasmine.createSpyObj('OperationLogStoreService', [
      'loadStateCache',
      'getLastSeq',
      'hasSyncedOps',
      'getLatestFullStateOpEntry',
      'getOpsAfterSeq',
    ]);
    // Defaults describe a legacy-migrated client that has never synced: the
    // genesis wrote a state cache and one op, nothing else happened since.
    opLogStoreSpy.loadStateCache.and.resolveTo({ state: {} } as unknown as StateCache);
    opLogStoreSpy.getLastSeq.and.resolveTo(1);
    opLogStoreSpy.hasSyncedOps.and.resolveTo(false);
    opLogStoreSpy.getLatestFullStateOpEntry.and.resolveTo(undefined);
    opLogStoreSpy.getOpsAfterSeq.and.resolveTo([migrationGenesis]);

    TestBed.configureTestingModule({
      providers: [
        SyncLocalStateService,
        { provide: OperationLogStoreService, useValue: opLogStoreSpy },
        {
          provide: StateSnapshotService,
          useValue: jasmine.createSpyObj('StateSnapshotService', ['getStateSnapshot']),
        },
        {
          provide: TranslateService,
          useValue: jasmine.createSpyObj('TranslateService', ['instant']),
        },
      ],
    });
    service = TestBed.inject(SyncLocalStateService);
  });

  describe('isNeverSyncedGenesisClient (#9863)', () => {
    it('is true when the log starts with a MIGRATION genesis and nothing was ever synced', async () => {
      expect(await service.isNeverSyncedGenesisClient()).toBe(true);
    });

    it('is true for a RECOVERY genesis as well', async () => {
      opLogStoreSpy.getOpsAfterSeq.and.resolveTo([recoveryGenesis]);
      expect(await service.isNeverSyncedGenesisClient()).toBe(true);
    });

    it('stays true when regular ops were captured after the genesis', async () => {
      // Post-migration edits ship normally, but the pre-migration state still
      // lives only inside the genesis payload.
      opLogStoreSpy.getOpsAfterSeq.and.resolveTo([migrationGenesis, regularOp]);
      expect(await service.isNeverSyncedGenesisClient()).toBe(true);
    });

    it('is false once real sync history exists', async () => {
      opLogStoreSpy.hasSyncedOps.and.resolveTo(true);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
      expect(opLogStoreSpy.getOpsAfterSeq).not.toHaveBeenCalled();
    });

    it('is false once a local full-state op exists (state already ships as SYNC_IMPORT)', async () => {
      opLogStoreSpy.getLatestFullStateOpEntry.and.resolveTo(syncImport);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
      expect(opLogStoreSpy.getOpsAfterSeq).not.toHaveBeenCalled();
    });

    it("is false when the first op is another client's genesis (raw rebuild from server history)", async () => {
      opLogStoreSpy.getOpsAfterSeq.and.resolveTo([
        entry('MIGRATION', ActionType.MIGRATION_GENESIS_IMPORT, OpType.Batch, 'remote'),
      ]);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
    });

    it('is false when the first op is a regular op', async () => {
      opLogStoreSpy.getOpsAfterSeq.and.resolveTo([regularOp]);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
    });

    it('is false for an empty log', async () => {
      opLogStoreSpy.getOpsAfterSeq.and.resolveTo([]);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
    });
  });

  describe('isFreshOrNeverSyncedGenesisClient', () => {
    it('is true for a wholly fresh client without reading the log', async () => {
      opLogStoreSpy.loadStateCache.and.resolveTo(null);
      opLogStoreSpy.getLastSeq.and.resolveTo(0);
      expect(await service.isFreshOrNeverSyncedGenesisClient([regularOp.op])).toBe(true);
      expect(opLogStoreSpy.getOpsAfterSeq).not.toHaveBeenCalled();
    });

    it('stays true for a wholly fresh client even when a full-state op is incoming', async () => {
      opLogStoreSpy.loadStateCache.and.resolveTo(null);
      opLogStoreSpy.getLastSeq.and.resolveTo(0);
      expect(await service.isFreshOrNeverSyncedGenesisClient([syncImport.op])).toBe(true);
    });

    it('is true for a never-synced genesis client receiving ordinary ops', async () => {
      expect(await service.isFreshOrNeverSyncedGenesisClient([regularOp.op])).toBe(true);
    });

    it('defers a genesis client to the incoming-import gate when a full-state op is incoming', async () => {
      expect(
        await service.isFreshOrNeverSyncedGenesisClient([regularOp.op, syncImport.op]),
      ).toBe(false);
      expect(opLogStoreSpy.getOpsAfterSeq).not.toHaveBeenCalled();
    });

    it('is false for a client with ordinary history', async () => {
      opLogStoreSpy.getOpsAfterSeq.and.resolveTo([regularOp]);
      expect(await service.isFreshOrNeverSyncedGenesisClient([regularOp.op])).toBe(false);
    });
  });
});
