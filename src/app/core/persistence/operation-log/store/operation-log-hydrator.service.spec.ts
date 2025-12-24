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
import { OperationApplierService } from '../processing/operation-applier.service';
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
  let mockOperationApplierService: jasmine.SpyObj<OperationApplierService>;

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
      'getFailedRemoteOps',
      'markFailed',
      'getVectorClock',
      'setVectorClock',
      'mergeRemoteOpClocks',
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
          load: jasmine.createSpy().and.returnValue(Promise.resolve({ vectorClock: {} })),
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
    mockOperationApplierService = jasmine.createSpyObj('OperationApplierService', [
      'applyOperations',
    ]);

    // Default mock implementations
    mockOpLogStore.getVectorClock.and.returnValue(Promise.resolve(null));
    mockOpLogStore.setVectorClock.and.returnValue(Promise.resolve());
    mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
    mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve([]));
    mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(0));
    mockOpLogStore.hasStateCacheBackup.and.returnValue(Promise.resolve(false));
    mockOpLogStore.saveStateCacheBackup.and.returnValue(Promise.resolve());
    mockOpLogStore.restoreStateCacheFromBackup.and.returnValue(Promise.resolve());
    mockOpLogStore.clearStateCacheBackup.and.returnValue(Promise.resolve());
    mockOpLogStore.saveStateCache.and.returnValue(Promise.resolve());
    mockOpLogStore.getPendingRemoteOps.and.returnValue(Promise.resolve([]));
    mockOpLogStore.getFailedRemoteOps.and.returnValue(Promise.resolve([]));
    mockOpLogStore.markApplied.and.returnValue(Promise.resolve());
    mockOpLogStore.markFailed.and.returnValue(Promise.resolve());
    mockOpLogStore.mergeRemoteOpClocks.and.returnValue(Promise.resolve());
    mockOperationApplierService.applyOperations.and.returnValue(
      Promise.resolve({ appliedOps: [] }),
    );
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
        { provide: OperationApplierService, useValue: mockOperationApplierService },
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

      it('should skip synchronous validation when schema version matches (trust optimization)', async () => {
        // With schema-version trust, we skip sync validation when versions match
        const snapshot = createMockSnapshot({ schemaVersion: CURRENT_SCHEMA_VERSION });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        // Should NOT call validateAndRepair synchronously (trusted snapshot)
        expect(mockValidateStateService.validateAndRepair).not.toHaveBeenCalled();
      });

      it('should validate snapshot state when schema version is missing', async () => {
        // When schema version is missing/undefined, we must validate
        const snapshot = createMockSnapshot({ schemaVersion: undefined });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockValidateStateService.validateAndRepair).toHaveBeenCalledWith(
          mockState,
        );
      });

      it('should validate snapshot state when schema version mismatches', async () => {
        // When schema version differs from current, we must validate
        const snapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION - 1,
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        // Mark that migration ran
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.returnValue({
          ...snapshot,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        });

        await service.hydrateStore();

        expect(mockValidateStateService.validateAndRepair).toHaveBeenCalled();
      });

      it('should dispatch repaired state if validation repairs it', async () => {
        // Use mismatched schema version to trigger validation
        const snapshot = createMockSnapshot({ schemaVersion: undefined });
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
        // Use mismatched schema version to trigger validation
        const snapshot = createMockSnapshot({ schemaVersion: undefined });
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

      it('should restore vector clock from snapshot to vector clock store', async () => {
        // This test verifies the fix for the bug where vector clock was not restored
        // from snapshot during hydration, causing new ops to have incomplete clocks
        const snapshotClock = { clientA: 5, clientB: 3 };
        const snapshot = createMockSnapshot({ vectorClock: snapshotClock });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockOpLogStore.setVectorClock).toHaveBeenCalledWith(snapshotClock);
      });

      it('should not restore empty vector clock from snapshot', async () => {
        const snapshot = createMockSnapshot({ vectorClock: {} });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));

        await service.hydrateStore();

        expect(mockOpLogStore.setVectorClock).not.toHaveBeenCalled();
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

        // First dispatch is snapshot
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
        // Then tail ops are replayed via applier service with isLocalHydration=true
        expect(mockOperationApplierService.applyOperations).toHaveBeenCalledWith(
          tailOps.map((e) => e.op),
          { isLocalHydration: true },
        );
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

      it('should merge tail ops clocks into local clock after replay', async () => {
        // This test verifies that tail ops' clocks are merged into local clock
        // after replay to ensure subsequent ops have clocks that dominate them
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const op1 = createMockOperation('op-6', OpType.Update, {
          vectorClock: { clientA: 6 },
        });
        const op2 = createMockOperation('op-7', OpType.Update, {
          vectorClock: { clientA: 6, clientB: 2 },
        });
        const tailOps = [createMockEntry(6, op1), createMockEntry(7, op2)];
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));

        await service.hydrateStore();

        expect(mockOpLogStore.mergeRemoteOpClocks).toHaveBeenCalledWith([op1, op2]);
      });

      it('should validate state BEFORE saving snapshot (regression test)', async () => {
        // This tests the fix for the bug where snapshot was saved before validation.
        // If validation repairs the state, saving snapshot first would persist corrupted state.
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const tailOps = Array.from({ length: 15 }, (_, i) =>
          createMockEntry(6 + i, createMockOperation(`op-${6 + i}`)),
        );
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));
        mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(20));

        // Track order of operations
        const callOrder: string[] = [];
        mockValidateStateService.validateAndRepair.and.callFake(() => {
          callOrder.push('validate');
          return { isValid: true, wasRepaired: false };
        });
        mockOpLogStore.saveStateCache.and.callFake(() => {
          callOrder.push('saveSnapshot');
          return Promise.resolve();
        });

        await service.hydrateStore();

        // Validate should be called before saveStateCache
        const validateIndex = callOrder.indexOf('validate');
        const saveIndex = callOrder.indexOf('saveSnapshot');
        expect(validateIndex).toBeGreaterThanOrEqual(0);
        expect(saveIndex).toBeGreaterThanOrEqual(0);
        expect(validateIndex).toBeLessThan(saveIndex);
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

      it('should merge full-state op clock into local clock after direct load', async () => {
        // When loading a SyncImport directly, its clock should be merged
        // to ensure subsequent ops have clocks that dominate it
        const snapshot = createMockSnapshot({ lastAppliedOpSeq: 5 });
        const syncImportPayload = { task: {}, project: {} };
        const syncClock = { clientA: 10, clientB: 5 };
        const syncImportOp = createMockOperation('sync-op', OpType.SyncImport, {
          payload: { appDataComplete: syncImportPayload },
          entityType: 'ALL',
          vectorClock: syncClock,
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(
          Promise.resolve([createMockEntry(6, syncImportOp)]),
        );

        await service.hydrateStore();

        expect(mockOpLogStore.mergeRemoteOpClocks).toHaveBeenCalledWith([syncImportOp]);
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

      // Additional version mismatch tests

      it('should handle snapshot with version newer than current (future version)', async () => {
        // This scenario can happen if a user downgrades the app
        const futureSnapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION + 5, // Future version
        });
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(futureSnapshot));
        // Future version doesn't need migration (migration is only for older versions)
        mockSchemaMigrationService.needsMigration.and.returnValue(false);

        // Should not throw, just load the data
        await service.hydrateStore();

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          loadAllData({ appDataComplete: mockState }),
        );
      });

      it('should migrate snapshot and operations together when both need migration', async () => {
        // Both snapshot and tail operations have old schema version
        const oldSnapshot = createMockSnapshot({
          schemaVersion: 0,
          lastAppliedOpSeq: 5,
        });
        const migratedSnapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          lastAppliedOpSeq: 5,
        });

        const tailOps = [
          createMockEntry(
            6,
            createMockOperation('op-6', OpType.Update, { schemaVersion: 0 }),
          ),
          createMockEntry(
            7,
            createMockOperation('op-7', OpType.Update, { schemaVersion: 0 }),
          ),
        ];

        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(oldSnapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.returnValue(migratedSnapshot);
        mockSchemaMigrationService.operationNeedsMigration.and.returnValue(true);

        const migratedOps = tailOps.map((e) => ({
          ...e.op,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        }));
        mockSchemaMigrationService.migrateOperations.and.returnValue(migratedOps);

        await service.hydrateStore();

        // Both snapshot and operations should be migrated
        expect(mockSchemaMigrationService.migrateStateIfNeeded).toHaveBeenCalled();
        expect(mockSchemaMigrationService.migrateOperations).toHaveBeenCalled();
        // Operations should be applied via applier service
        expect(mockOperationApplierService.applyOperations).toHaveBeenCalled();
      });

      it('should handle mixed schema versions in tail operations', async () => {
        // Some tail ops are old version, some are current
        const snapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          lastAppliedOpSeq: 5,
        });

        const tailOps = [
          createMockEntry(
            6,
            createMockOperation('op-6', OpType.Update, { schemaVersion: 0 }), // Old
          ),
          createMockEntry(
            7,
            createMockOperation('op-7', OpType.Update, {
              schemaVersion: CURRENT_SCHEMA_VERSION,
            }), // Current
          ),
          createMockEntry(
            8,
            createMockOperation('op-8', OpType.Update, { schemaVersion: 0 }), // Old
          ),
        ];

        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));
        mockSchemaMigrationService.needsMigration.and.returnValue(false);
        // At least one operation needs migration
        mockSchemaMigrationService.operationNeedsMigration.and.callFake(
          (op: Operation) => op.schemaVersion === 0,
        );

        await service.hydrateStore();

        // migrateOperations should be called since some ops need migration
        expect(mockSchemaMigrationService.migrateOperations).toHaveBeenCalled();
      });

      it('should not migrate operations if none need migration', async () => {
        const snapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          lastAppliedOpSeq: 5,
        });

        const tailOps = [
          createMockEntry(
            6,
            createMockOperation('op-6', OpType.Update, {
              schemaVersion: CURRENT_SCHEMA_VERSION,
            }),
          ),
        ];

        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(snapshot));
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(tailOps));
        mockSchemaMigrationService.needsMigration.and.returnValue(false);
        mockSchemaMigrationService.operationNeedsMigration.and.returnValue(false);

        await service.hydrateStore();

        // migrateOperations should NOT be called
        expect(mockSchemaMigrationService.migrateOperations).not.toHaveBeenCalled();
      });

      it('should handle undefined schemaVersion in snapshot (legacy data)', async () => {
        // Legacy data from before schema versioning was introduced
        const legacySnapshot = createMockSnapshot({ schemaVersion: undefined });
        const migratedSnapshot = createMockSnapshot({
          schemaVersion: CURRENT_SCHEMA_VERSION,
        });

        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(legacySnapshot));
        mockSchemaMigrationService.needsMigration.and.returnValue(true);
        mockSchemaMigrationService.migrateStateIfNeeded.and.returnValue(migratedSnapshot);

        await service.hydrateStore();

        // Should call migration for legacy (undefined version) snapshot
        expect(mockSchemaMigrationService.migrateStateIfNeeded).toHaveBeenCalledWith(
          legacySnapshot,
        );
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

        // No snapshot dispatch
        expect(mockStore.dispatch).not.toHaveBeenCalled();
        // Replay all ops via applier service with isLocalHydration=true
        expect(mockOperationApplierService.applyOperations).toHaveBeenCalledWith(
          allOps.map((e) => e.op),
          { isLocalHydration: true },
        );
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

      it('should validate state BEFORE saving snapshot in full replay (regression test)', async () => {
        // Similar to tail replay test - validation must happen before snapshot save
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        const allOps = [
          createMockEntry(1, createMockOperation('op-1')),
          createMockEntry(2, createMockOperation('op-2')),
        ];
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(allOps));
        mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(2));

        // Track order of operations
        const callOrder: string[] = [];
        mockValidateStateService.validateAndRepair.and.callFake(() => {
          callOrder.push('validate');
          return { isValid: true, wasRepaired: false };
        });
        mockOpLogStore.saveStateCache.and.callFake(() => {
          callOrder.push('saveSnapshot');
          return Promise.resolve();
        });

        await service.hydrateStore();

        // Validate should be called before saveStateCache
        const validateIndex = callOrder.indexOf('validate');
        const saveIndex = callOrder.indexOf('saveSnapshot');
        expect(validateIndex).toBeGreaterThanOrEqual(0);
        expect(saveIndex).toBeGreaterThanOrEqual(0);
        expect(validateIndex).toBeLessThan(saveIndex);
      });

      it('should merge ops clocks into local clock in full replay', async () => {
        // Full replay case: merge all ops' clocks into local clock
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        const op1 = createMockOperation('op-1', OpType.Update, {
          vectorClock: { clientA: 1 },
        });
        const op2 = createMockOperation('op-2', OpType.Update, {
          vectorClock: { clientA: 2 },
        });
        const allOps = [createMockEntry(1, op1), createMockEntry(2, op2)];
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(allOps));
        mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(2));

        await service.hydrateStore();

        expect(mockOpLogStore.mergeRemoteOpClocks).toHaveBeenCalledWith([op1, op2]);
      });

      it('should merge full-state op clock in full replay when last op is SyncImport', async () => {
        mockOpLogStore.loadStateCache.and.returnValue(Promise.resolve(null));
        const syncClock = { clientA: 10 };
        const syncImportOp = createMockOperation('sync-op', OpType.SyncImport, {
          payload: { appDataComplete: { task: {} } },
          entityType: 'ALL',
          vectorClock: syncClock,
        });
        const allOps = [createMockEntry(1, syncImportOp)];
        mockOpLogStore.getOpsAfterSeq.and.returnValue(Promise.resolve(allOps));

        await service.hydrateStore();

        expect(mockOpLogStore.mergeRemoteOpClocks).toHaveBeenCalledWith([syncImportOp]);
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

    it('should validate and repair synced data before dispatching', async () => {
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));

      await service.hydrateFromRemoteSync();

      expect(mockValidateStateService.validateAndRepair).toHaveBeenCalled();
    });

    it('should dispatch repaired data if validation repairs it', async () => {
      const syncedData = { task: { entities: {}, ids: [] } } as any;
      const repairedData = { task: { entities: {}, ids: [] }, repaired: true } as any;
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));
      mockValidateStateService.validateAndRepair.and.returnValue({
        isValid: false,
        wasRepaired: true,
        repairedState: repairedData,
        repairSummary: { entityStateFixed: 1 } as any,
      });

      await service.hydrateFromRemoteSync();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        loadAllData({ appDataComplete: repairedData }),
      );
    });

    it('should save repaired state to cache if validation repairs it', async () => {
      const syncedData = { task: { entities: {}, ids: [] } } as any;
      const repairedData = { task: { entities: {}, ids: [] }, repaired: true } as any;
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(50));
      mockValidateStateService.validateAndRepair.and.returnValue({
        isValid: false,
        wasRepaired: true,
        repairedState: repairedData,
        repairSummary: { entityStateFixed: 1 } as any,
      });

      await service.hydrateFromRemoteSync();

      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({
          state: repairedData,
          lastAppliedOpSeq: 50,
        }),
      );
    });

    it('should strip syncProvider from remote sync data to preserve local setting', async () => {
      // Simulate remote data with a syncProvider that should NOT overwrite local
      const syncedDataWithProvider = {
        task: { entities: {}, ids: [] },
        project: { entities: {}, ids: [] },
        globalConfig: {
          sync: {
            syncProvider: 'Dropbox', // Remote has Dropbox
            isEnabled: true,
          },
          misc: { someOtherSetting: true },
        },
      } as any;

      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedDataWithProvider));
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(100));

      await service.hydrateFromRemoteSync();

      // Verify the dispatched data has syncProvider nulled out
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        loadAllData({
          appDataComplete: jasmine.objectContaining({
            globalConfig: jasmine.objectContaining({
              sync: jasmine.objectContaining({
                syncProvider: null, // Should be null, not 'Dropbox'
                isEnabled: true, // Other sync settings preserved
              }),
            }),
          }) as any,
        }),
      );

      // Verify the state cache also has syncProvider nulled out
      expect(mockOpLogStore.saveStateCache).toHaveBeenCalledWith(
        jasmine.objectContaining({
          state: jasmine.objectContaining({
            globalConfig: jasmine.objectContaining({
              sync: jasmine.objectContaining({
                syncProvider: null,
              }),
            }),
          }),
        }),
      );
    });

    it('should handle remote sync data without globalConfig', async () => {
      const syncedDataWithoutConfig = {
        task: { entities: {}, ids: [] },
        project: { entities: {}, ids: [] },
      } as any;

      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedDataWithoutConfig));

      await service.hydrateFromRemoteSync();

      // Should not throw and should dispatch the data as-is
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        loadAllData({ appDataComplete: syncedDataWithoutConfig }),
      );
    });

    it('should update vector clock store after sync', async () => {
      // This test verifies that the vector clock store is updated after hydrateFromRemoteSync
      // to ensure new ops created in the same session have the correct clock
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));
      mockVectorClockService.getCurrentVectorClock.and.returnValue(
        Promise.resolve({ clientA: 5 }),
      );
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(50));

      await service.hydrateFromRemoteSync();

      // setVectorClock should be called (the clock is incremented by the client ID)
      expect(mockOpLogStore.setVectorClock).toHaveBeenCalled();
      // Verify the clock was called with a clock that includes the client ID
      const setClock = mockOpLogStore.setVectorClock.calls.mostRecent().args[0];
      expect(setClock).toBeDefined();
      // Client 'test-client' should have been incremented
      expect(setClock['test-client']).toBe(1);
    });

    it('should update vector clock store after saving state cache', async () => {
      // Verify order: save state cache, then update vector clock store
      const syncedData = { task: { entities: {}, ids: [] } };
      (
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls as jasmine.Spy
      ).and.returnValue(Promise.resolve(syncedData));
      mockOpLogStore.getLastSeq.and.returnValue(Promise.resolve(50));

      const callOrder: string[] = [];
      mockOpLogStore.saveStateCache.and.callFake(() => {
        callOrder.push('saveStateCache');
        return Promise.resolve();
      });
      mockOpLogStore.setVectorClock.and.callFake(() => {
        callOrder.push('setVectorClock');
        return Promise.resolve();
      });

      await service.hydrateFromRemoteSync();

      expect(callOrder).toEqual(['saveStateCache', 'setVectorClock']);
    });
  });

  // ===========================================================================
  // retryFailedRemoteOps: Retry failed remote operations
  // ===========================================================================
  // These tests verify the retry mechanism for failed remote operations.
  describe('retryFailedRemoteOps', () => {
    it('should call markApplied for successfully retried failed ops', async () => {
      const failedOp = createMockOperation('failed-op-1');
      const failedEntry: OperationLogEntry = {
        seq: 42,
        op: failedOp,
        appliedAt: Date.now(),
        source: 'remote',
        applicationStatus: 'failed',
        retryCount: 1,
      };

      mockOpLogStore.getFailedRemoteOps.and.returnValue(Promise.resolve([failedEntry]));
      mockOperationApplierService.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await service.retryFailedRemoteOps();

      // Verify markApplied was called with the sequence number
      expect(mockOpLogStore.markApplied).toHaveBeenCalledWith([42]);
    });

    it('should clear failed status after successful retry (markApplied handles failed status)', async () => {
      // Verify that markApplied is called with the correct sequence number
      // after a successful retry. The actual status transition is tested
      // in operation-log-store.service.spec.ts.

      const failedOp = createMockOperation('failed-op-1');
      const failedEntry: OperationLogEntry = {
        seq: 42,
        op: failedOp,
        appliedAt: Date.now(),
        source: 'remote',
        applicationStatus: 'failed',
        retryCount: 1,
      };

      let markAppliedCalledWithSeqs: number[] = [];
      mockOpLogStore.markApplied.and.callFake((seqs: number[]) => {
        markAppliedCalledWithSeqs = seqs;
        return Promise.resolve();
      });

      mockOpLogStore.getFailedRemoteOps.and.returnValue(Promise.resolve([failedEntry]));
      mockOperationApplierService.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await service.retryFailedRemoteOps();

      // markApplied should be called with the failed op's sequence number
      expect(markAppliedCalledWithSeqs).toEqual([42]);
    });

    it('should call markFailed for ops that still fail after retry', async () => {
      const failedOp = createMockOperation('still-failing-op');
      const failedEntry: OperationLogEntry = {
        seq: 99,
        op: failedOp,
        appliedAt: Date.now(),
        source: 'remote',
        applicationStatus: 'failed',
        retryCount: 1,
      };

      mockOpLogStore.getFailedRemoteOps.and.returnValue(Promise.resolve([failedEntry]));
      mockOperationApplierService.applyOperations.and.returnValue(
        Promise.resolve({
          appliedOps: [],
          failedOp: {
            op: failedOp,
            error: new Error('Still failing'),
          },
        }),
      );

      await service.retryFailedRemoteOps();

      // markFailed should be called with the op ID
      expect(mockOpLogStore.markFailed).toHaveBeenCalledWith(
        ['still-failing-op'],
        jasmine.any(Number),
      );
    });
  });
});
