import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { OperationLogHydratorService } from './operation-log-hydrator.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { MigratableStateCache } from './schema-migration.service';
import { OperationLogMigrationService } from './operation-log-migration.service';
import {
  SchemaMigrationService,
  CURRENT_SCHEMA_VERSION,
} from './schema-migration.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { SnackService } from '../../../snack/snack.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { RepairOperationService } from '../processing/repair-operation.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { Operation, OperationLogEntry, OpType } from '../operation.types';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';

describe('OperationLogHydratorService', () => {
  let service: OperationLogHydratorService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockMigrationService: jasmine.SpyObj<OperationLogMigrationService>;
  let mockSchemaMigrationService: jasmine.SpyObj<SchemaMigrationService>;
  let mockPfapiService: jasmine.SpyObj<PfapiService>;
  let mockStoreDelegateService: jasmine.SpyObj<PfapiStoreDelegateService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockValidateStateService: jasmine.SpyObj<ValidateStateService>;
  let mockRepairOperationService: jasmine.SpyObj<RepairOperationService>;
  let mockVectorClockService: jasmine.SpyObj<VectorClockService>;

  const mockState = {
    task: { entities: {}, ids: [] },
    project: { entities: {}, ids: [] },
    globalConfig: {},
  } as any;

  const createMockSnapshot = (
    overrides: Partial<MigratableStateCache> = {},
  ): MigratableStateCache => ({
    state: mockState,
    lastAppliedOpSeq: 10,
    vectorClock: { clientA: 5 },
    compactedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...overrides,
  });

  const createMockOperation = (
    id: string,
    opType: OpType = OpType.Update,
    overrides: Partial<Operation> = {},
  ): Operation => ({
    id,
    actionType: '[Task] Update Task',
    opType,
    entityType: 'TASK',
    entityId: 'task-123',
    payload: { title: 'Test' },
    clientId: 'testClient',
    vectorClock: { testClient: 1 },
    timestamp: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...overrides,
  });

  const createMockEntry = (seq: number, op: Operation): OperationLogEntry => ({
    seq,
    op,
    appliedAt: Date.now(),
    source: 'local',
  });

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'loadStateCache',
      'saveStateCache',
      'getOpsAfterSeq',
      'getLastSeq',
      'hasStateCacheBackup',
      'restoreStateCacheFromBackup',
      'saveStateCacheBackup',
      'clearStateCacheBackup',
      'append',
      'getPendingRemoteOps',
      'markApplied',
    ]);
    mockMigrationService = jasmine.createSpyObj('OperationLogMigrationService', [
      'checkAndMigrate',
    ]);
    mockSchemaMigrationService = jasmine.createSpyObj('SchemaMigrationService', [
      'needsMigration',
      'migrateStateIfNeeded',
      'operationNeedsMigration',
      'migrateOperations',
    ]);
    mockPfapiService = jasmine.createSpyObj('PfapiService', [], {
      pf: {
        metaModel: {
          loadClientId: jasmine
            .createSpy()
            .and.returnValue(Promise.resolve('test-client')),
          syncVectorClock: jasmine.createSpy().and.returnValue(Promise.resolve()),
        },
        getAllSyncModelDataFromModelCtrls: jasmine
          .createSpy()
          .and.returnValue(Promise.resolve({})),
      },
    });
    mockStoreDelegateService = jasmine.createSpyObj('PfapiStoreDelegateService', [
      'getAllSyncModelDataFromStore',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockValidateStateService = jasmine.createSpyObj('ValidateStateService', [
      'validateAndRepair',
    ]);
    mockRepairOperationService = jasmine.createSpyObj('RepairOperationService', [
      'createRepairOperation',
    ]);
    mockVectorClockService = jasmine.createSpyObj('VectorClockService', [
      'getCurrentVectorClock',
    ]);

    // Default mock implementations
    mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
    mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve([]));
    mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(0));
    mockOpLogStore.hasStateCacheBackup.and.returnValue(Promise.resolve(false));
    mockOpLogStore.saveStateCacheBackup.and.returnValue(Promise.resolve());
    mockOpLogStore.restoreStateCacheFromBackup.and.returnValue(Promise.resolve());
    mockOpLogStore.clearStateCacheBackup.and.returnValue(Promise.resolve());
    mockOpLogStore.saveStateCache.and.returnValue(Promise.resolve());
    mockOpLogStore.getPendingRemoteOps.and.returnValue(Promise.resolve([]));
    mockMigrationService.checkAndMigrate.and.returnValue(Promise.resolve());
    mockSchemaMigrationService.needsMigration.and.returnValue(false);
    mockSchemaMigrationService.operationNeedsMigration.and.returnValue(false);
    mockSchemaMigrationService.migrateOperations.and.callFake((ops) => ops);
    mockValidateStateService.validateAndRepair.and.returnValue({
      isValid: true,
      wasRepaired: false,
    });
    mockStoreDelegateService.getAllSyncModelDataFromStore.and.returnValue(
      Promise.resolve(mockState),
    );
    mockVectorClockService.getCurrentVectorClock.and.returnValue(
      Promise.resolve({ clientA: 5 }),
    );

    TestBed.configureTestingModule({
      providers: [
        OperationLogHydratorService,
        { provide: Store, useValue: mockStore },
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: OperationLogMigrationService, useValue: mockMigrationService },
        { provide: SchemaMigrationService, useValue: mockSchemaMigrationService },
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: PfapiStoreDelegateService, useValue: mockStoreDelegateService },
        { provide: SnackService, useValue: mockSnackService },
        { provide: ValidateStateService, useValue: mockValidateStateService },
        { provide: RepairOperationService, useValue: mockRepairOperationService },
        { provide: VectorClockService, useValue: mockVectorClockService },
      ],
    });

    service = TestBed.inject(OperationLogHydratorService);
  });

  describe('hydrateStore', () => {
    describe('fresh install', () => {
      it('should handle fresh install with no data', async () => {
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve([]));

        await service.hydrateStore();

        expect(mockStore.dispatch).not.toHaveBeenCalled();
      });

      it('should check for migration when no snapshot exists', async () => {
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve([]));

        await service.hydrateStore();

        expect(mockMigrationService.checkAndMigrate).toHaveBeenCalled();
      });
    });

    describe('snapshot loading', () => {
      it('should load snapshot and dispatch to store', async () => {
        const snapshot = createMockSnapshot();
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          loadAllData({ appDataComplete: mockState }),
        );
      });

      it('should validate snapshot state before dispatching', async () => {
        const snapshot = createMockSnapshot();
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockValidateStateService.validateAndRepair).toHaveBeenCalledWith(
          mockState,
        );
      });

      it('should dispatch repaired state if validation repairs it', async () => {
        const snapshot = createMockSnapshot();
        const repairedState = { ...mockState, repaired: true };
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockValidateStateService.validateAndRepair.and.returnValue({
          isValid: false,
          wasRepaired: true,
          repairedState,
          repairSummary: { entityStateFixed: 1 } as any,
        });

        await service.hydrateStore();

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          loadAllData({ appDataComplete: repairedState }),
        );
      });

      it('should create repair operation when state is repaired', async () => {
        const snapshot = createMockSnapshot();
        const repairedState = { ...mockState, repaired: true };
        const repairSummary = { entityStateFixed: 1 } as any;
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockValidateStateService.validateAndRepair.and.returnValue({
          isValid: false,
          wasRepaired: true,
          repairedState,
          repairSummary,
        });

        await service.hydrateStore();

        expect(mockRepairOperationService.createRepairOperation).toHaveBeenCalledWith(
          repairedState,
          repairSummary,
          'test-client',
        );
      });
    });

    describe('tail operation replay', () => {
      it('should replay tail operations after snapshot', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const tailOps = [
          createMockEntry(6, createMockOperation('op-6')),
          createMockEntry(7, createMockOperation('op-7')),
        ];
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));

        await service.hydrateStore();

        // First dispatch is snapshot, then 2 tail ops
        expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
      });

      it('should request ops after snapshot sequence', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 42 });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve([]));

        await service.hydrateStore();

        expect(mockOpLogStore.getOpsAfterSeq).toHaveBeenCalledWith(42);
      });

      it('should save new snapshot after replaying many ops', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const tailOps = Array.from({ length: 15 }, (_, i) =>
          createMockEntry(6 + i, createMockOperation(`op-${6 + i}`)),
        );
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));
        mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(20));

        await service.hydrateStore();

        expect(mockOpLogStore.saveStateCache).toHaveBeenCalled();
      });

      it('should not save snapshot after replaying few ops', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const tailOps = [
          createMockEntry(6, createMockOperation('op-6')),
          createMockEntry(7, createMockOperation('op-7')),
        ];
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));

        await service.hydrateStore();

        expect(mockOpLogStore.saveStateCache).not.toHaveBeenCalled();
      });
    });

    describe('full state operations optimization', () => {
      it('should load SyncImport operation directly without replay', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const syncImportPayload = { task: {}, project: {} };
        const syncImportOp = createMockOperation('sync-op', OpType.SyncImport, {
          payload: { appDataComplete: syncImportPayload },
          entityType: 'ALL',
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(
          Promise.resolve([createMockEntry(6, syncImportOp)]),
        );

        await service.hydrateStore();

        // Should dispatch snapshot first, then loadAllData with sync import
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          loadAllData({ appDataComplete: syncImportPayload as any }),
        );
      });

      it('should load Repair operation directly without replay', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const repairPayload = { task: {}, project: {} };
        const repairOp = createMockOperation('repair-op', OpType.Repair, {
          payload: { appDataComplete: repairPayload },
          entityType: 'ALL',
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(
          Promise.resolve([createMockEntry(6, repairOp)]),
        );

        await service.hydrateStore();

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          loadAllData({ appDataComplete: repairPayload as any }),
        );
      });
    });

    describe('schema migration', () => {
      it('should migrate snapshot if needed', async () => {
        const oldSnapshot = createMockSnapshot({ schemaVersion: 0 });
        const migratedSnapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(oldSnapshot));
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.returnValue(migratedSnapshot);

        await service.hydrateStore();

        expect(mockSchemaMigrationService.migrateStateIfNeeded).toHaveBeenCalledWith(
          oldSnapshot,
        );
      });

      it('should create backup before migration', async () => {
        const oldSnapshot = createMockSnapshot({ schemaVersion: 0 });
        const migratedSnapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(oldSnapshot));
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.returnValue(migratedSnapshot);

        await service.hydrateStore();

        expect(mockOpLogStore.saveStateCacheBackup).toHaveBeenCalled();
      });

      it('should clear backup after successful migration', async () => {
        const oldSnapshot = createMockSnapshot({ schemaVersion: 0 });
        const migratedSnapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(oldSnapshot));
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.returnValue(migratedSnapshot);

        await service.hydrateStore();

        expect(mockOpLogStore.clearStateCacheBackup).toHaveBeenCalled();
      });

      it('should restore backup if migration fails', async () => {
        const oldSnapshot = createMockSnapshot({ schemaVersion: 0 });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(oldSnapshot));
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.throwError(
          new Error('Migration failed'),
        );

        // hydrateStore catches migration error and attempts recovery
        // We verify that backup was restored before the error was re-thrown
        await service.hydrateStore();

        expect(mockOpLogStore.restoreStateCacheFromBackup).toHaveBeenCalled();
      });

      it('should migrate tail operations if needed', async () => {
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const tailOps = [
          createMockEntry(
            6,
            createMockOperation('op-6', OpType.Update, { schemaVersion: 0 }),
          ),
        ];
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));
        mockSchemaMigrationService.operationNeedsMigration.and.returnValue(true);

        await service.hydrateStore();

        expect(mockSchemaMigrationService.migrateOperations).toHaveBeenCalled();
      });
    });

    describe('backup recovery', () => {
      it('should restore from backup if backup exists', async () => {
        mockOpLogStore.hasStateCacheBackup.and.returnValue(Promise.resolve(true));
        const snapshot = createMockSnapshot();
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockOpLogStore.restoreStateCacheFromBackup).toHaveBeenCalled();
      });
    });

    describe('pending remote ops recovery', () => {
      it('should recover pending remote ops from crashed sync', async () => {
        const pendingOps = [
          createMockEntry(1, createMockOperation('op-1')),
          createMockEntry(2, createMockOperation('op-2')),
        ];
        mockOpLogStore.getPendingRemoteOps.and.returnValue(Promise.resolve(pendingOps));
        const snapshot = createMockSnapshot();
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockOpLogStore.markApplied).toHaveBeenCalledWith([1, 2]);
      });

      it('should not call markApplied if no pending ops', async () => {
        mockOpLogStore.getPendingRemoteOps.and.returnValue(Promise.resolve([]));
        const snapshot = createMockSnapshot();
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockOpLogStore.markApplied).not.toHaveBeenCalled();
      });
    });

    describe('invalid snapshot handling', () => {
      it('should attempt recovery if snapshot is missing required fields', async () => {
        const invalidSnapshot = { state: null, lastAppliedOpSeq: 5 } as any;
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(invalidSnapshot));
        (
          mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
        ).and.returnValue(Promise.resolve({}));

        await service.hydrateStore();

        expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
      });

      it('should attempt recovery if snapshot is missing core models', async () => {
        const invalidSnapshot = createMockSnapshot({
          state: { task: {} }, // Missing project and globalConfig
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(invalidSnapshot));
        (
          mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
        ).and.returnValue(Promise.resolve({}));

        await service.hydrateStore();

        expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
      });
    });

    describe('PFAPI vector clock sync', () => {
      it('should sync PFAPI vector clock after hydration', async () => {
        const snapshot = createMockSnapshot();
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockVectorClockService.getCurrentVectorClock.and.returnValue(
          Promise.resolve({ clientA: 10 }),
        );

        await service.hydrateStore();

        expect(mockPfapiService.pf.metaModel.syncVectorClock).toHaveBeenCalledWith({
          clientA: 10,
        });
      });

      it('should not sync PFAPI vector clock on fresh install', async () => {
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve([]));
        mockVectorClockService.getCurrentVectorClock.and.returnValue(Promise.resolve({}));

        await service.hydrateStore();

        expect(mockPfapiService.pf.metaModel.syncVectorClock).not.toHaveBeenCalled();
      });
    });

    describe('full replay (no snapshot)', () => {
      it('should replay all operations when no snapshot exists', async () => {
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        const allOps = [
          createMockEntry(1, createMockOperation('op-1')),
          createMockEntry(2, createMockOperation('op-2')),
          createMockEntry(3, createMockOperation('op-3')),
        ];
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(allOps));
        mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(3));

        await service.hydrateStore();

        // 3 operations replayed
        expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
      });

      it('should save snapshot after full replay', async () => {
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        const allOps = [
          createMockEntry(1, createMockOperation('op-1')),
          createMockEntry(2, createMockOperation('op-2')),
        ];
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(allOps));
        mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(2));

        await service.hydrateStore();

        expect(mockOpLogStore.saveStateCache).toHaveBeenCalled();
      });
    });
  });

  describe('hydrateFromRemoteSync', () => {
    it('should load synced data from pf database', async () => {
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));

      await service.hydrateFromRemoteSync();

      expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
    });

    it('should create SYNC_IMPORT operation', async () => {
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));

      await service.hydrateFromRemoteSync();

      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({
          opType: OpType.SyncImport,
          entityType: 'ALL',
          payload: syncedData,
        }),
        'remote',
      );
    });

    it('should save state cache after sync', async () => {
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(50));

      await service.hydrateFromRemoteSync();

      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({
          state: syncedData,
          lastAppliedOpSeq: 50,
        }),
      );
    });

    it('should dispatch loadAllData with synced data', async () => {
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));

      await service.hydrateFromRemoteSync();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        loadAllData({ appDataComplete: syncedData as any }),
      );
    });
  });
});
