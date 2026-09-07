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
  let stateSnapshotSpy: jasmine.SpyObj<StateSnapshotService>;

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
    stateSnapshotSpy = jasmine.createSpyObj('StateSnapshotService', ['getStateSnapshot']);
    opLogStoreSpy = jasmine.createSpyObj('OperationLogStoreService', [
      'loadStateCache',
      'getLastSeq',
      'hasSyncedOps',
      'getLatestFullStateOpEntry',
      'getFirstOpEntry',
      'getUnsynced',
    ]);
    // Defaults describe a legacy-migrated client that has never synced: the
    // genesis wrote a state cache and one op, nothing else happened since.
    opLogStoreSpy.loadStateCache.and.resolveTo({ state: {} } as unknown as StateCache);
    opLogStoreSpy.getLastSeq.and.resolveTo(1);
    opLogStoreSpy.hasSyncedOps.and.resolveTo(false);
    opLogStoreSpy.getLatestFullStateOpEntry.and.resolveTo(undefined);
    opLogStoreSpy.getFirstOpEntry.and.resolveTo(migrationGenesis);
    opLogStoreSpy.getUnsynced.and.resolveTo([]);

    TestBed.configureTestingModule({
      providers: [
        SyncLocalStateService,
        { provide: OperationLogStoreService, useValue: opLogStoreSpy },
        { provide: StateSnapshotService, useValue: stateSnapshotSpy },
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
      opLogStoreSpy.getFirstOpEntry.and.resolveTo(recoveryGenesis);
      expect(await service.isNeverSyncedGenesisClient()).toBe(true);
    });

    it('is false once real sync history exists', async () => {
      opLogStoreSpy.hasSyncedOps.and.resolveTo(true);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
      expect(opLogStoreSpy.getFirstOpEntry).not.toHaveBeenCalled();
    });

    it('is false once a local full-state op exists (state already ships as SYNC_IMPORT)', async () => {
      opLogStoreSpy.getLatestFullStateOpEntry.and.resolveTo(syncImport);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
      expect(opLogStoreSpy.getFirstOpEntry).not.toHaveBeenCalled();
    });

    it("is false when the first op is another client's genesis (raw rebuild from server history)", async () => {
      opLogStoreSpy.getFirstOpEntry.and.resolveTo(
        entry('MIGRATION', ActionType.MIGRATION_GENESIS_IMPORT, OpType.Batch, 'remote'),
      );
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
    });

    it('is false when the first op is a regular op', async () => {
      opLogStoreSpy.getFirstOpEntry.and.resolveTo(regularOp);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
    });

    it('is false for an empty log', async () => {
      opLogStoreSpy.getFirstOpEntry.and.resolveTo(undefined);
      expect(await service.isNeverSyncedGenesisClient()).toBe(false);
    });
  });

  describe('isFreshOrNeverSyncedGenesisClient', () => {
    it('is true for a wholly fresh client without reading the log', async () => {
      opLogStoreSpy.loadStateCache.and.resolveTo(null);
      opLogStoreSpy.getLastSeq.and.resolveTo(0);
      expect(await service.isFreshOrNeverSyncedGenesisClient([regularOp.op])).toBe(true);
      expect(opLogStoreSpy.getFirstOpEntry).not.toHaveBeenCalled();
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
      expect(opLogStoreSpy.getFirstOpEntry).not.toHaveBeenCalled();
    });

    it('is false for a client with ordinary history', async () => {
      opLogStoreSpy.getFirstOpEntry.and.resolveTo(regularOp);
      expect(await service.isFreshOrNeverSyncedGenesisClient([regularOp.op])).toBe(false);
    });
  });

  describe('hasNothingWorthUploading (#9256)', () => {
    const emptyStore = {
      task: { ids: [], entities: {} },
      project: { ids: [], entities: {} },
      tag: { ids: [], entities: {} },
      note: { ids: [], entities: {} },
    };

    const exampleTaskOp = (taskId: string): OperationLogEntry => ({
      seq: 2,
      op: {
        id: `op-${taskId}`,
        clientId: 'client-A',
        actionType: ActionType.TASK_SHARED_ADD,
        opType: OpType.Create,
        entityType: 'TASK',
        entityId: taskId,
        payload: {
          actionPayload: { task: { id: taskId }, isExampleTask: true },
          entityChanges: [],
        },
        vectorClock: { clientA: 2 },
        timestamp: Date.now(),
        schemaVersion: 1,
      },
      appliedAt: Date.now(),
      source: 'local',
    });

    it('is true for a never-synced client with an empty store', async () => {
      stateSnapshotSpy.getStateSnapshot.and.returnValue(emptyStore as never);

      expect(await service.hasNothingWorthUploading()).toBe(true);
    });

    it('is true when the only tasks are onboarding example tasks', async () => {
      // The #9256 shape: the initial sync failed, but afterInitialSyncDoneStrict$
      // fails open on a timer, so the example tasks exist anyway. They must not
      // make the device look like it holds the user's work.
      stateSnapshotSpy.getStateSnapshot.and.returnValue({
        ...emptyStore,
        // Only `ids` is read by hasMeaningfulStateData; an entity map here
        // would just be a second place for the ids to drift out of sync.
        task: { ids: ['ex-1', 'ex-2'], entities: {} },
      } as never);
      opLogStoreSpy.getUnsynced.and.resolveTo([
        exampleTaskOp('ex-1'),
        exampleTaskOp('ex-2'),
      ]);

      expect(await service.hasNothingWorthUploading()).toBe(true);
    });

    it('is false as soon as one real task exists alongside the example tasks', async () => {
      stateSnapshotSpy.getStateSnapshot.and.returnValue({
        ...emptyStore,
        task: { ids: ['ex-1', 'real-1'], entities: {} },
      } as never);
      opLogStoreSpy.getUnsynced.and.resolveTo([exampleTaskOp('ex-1')]);

      expect(await service.hasNothingWorthUploading()).toBe(false);
    });

    it('is false for a client that has synced before, even with an empty store', async () => {
      // Such a device may legitimately hold real data, and a deliberate reset
      // from the sync settings must keep working.
      opLogStoreSpy.hasSyncedOps.and.resolveTo(true);
      stateSnapshotSpy.getStateSnapshot.and.returnValue(emptyStore as never);

      expect(await service.hasNothingWorthUploading()).toBe(false);
      expect(stateSnapshotSpy.getStateSnapshot).not.toHaveBeenCalled();
    });

    it('refuses when the store is present but still at its initial values', async () => {
      // The reachable degraded shape: hydration failed or has not run, so the
      // slices exist but are empty. This is the case the guard has to catch,
      // and it is distinct from the unreachable undefined-snapshot one below.
      stateSnapshotSpy.getStateSnapshot.and.returnValue(emptyStore as never);
      opLogStoreSpy.getUnsynced.and.resolveTo([]);

      expect(await service.hasNothingWorthUploading()).toBe(true);
    });

    it('fails closed when the snapshot cannot be read at all', async () => {
      // DELIBERATE fail-closed direction: hasMeaningfulStoreData returns false
      // for an unreadable snapshot, so the guard reports "nothing to upload"
      // and REFUSES. Refusing can never destroy data; guessing "has data" and
      // letting the clean slate through can. Note getStateSnapshot() is typed
      // non-nullable, so this shape is defensive rather than reachable today.
      stateSnapshotSpy.getStateSnapshot.and.returnValue(undefined as never);

      expect(await service.hasNothingWorthUploading()).toBe(true);
    });
  });
});
