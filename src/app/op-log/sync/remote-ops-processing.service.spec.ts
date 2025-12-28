import { TestBed } from '@angular/core/testing';
import { RemoteOpsProcessingService } from './remote-ops-processing.service';
import {
  SchemaMigrationService,
  MAX_VERSION_SKIP,
} from '../store/schema-migration.service';
import { SnackService } from '../../core/snack/snack.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { VectorClockService } from './vector-clock.service';
import { OperationApplierService } from '../apply/operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from '../validation/validate-state.service';
import { LockService } from './lock.service';
import { OperationLogCompactionService } from '../store/operation-log-compaction.service';
import { SyncImportFilterService } from './sync-import-filter.service';
import {
  ActionType,
  EntityConflict,
  Operation,
  OpType,
  VectorClock,
} from '../core/operation.types';
import {
  compareVectorClocks,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../core/util/vector-clock';
import { toEntityKey } from '../util/entity-key.util';
import { T } from '../../t.const';

describe('RemoteOpsProcessingService', () => {
  let service: RemoteOpsProcessingService;
  let schemaMigrationServiceSpy: jasmine.SpyObj<SchemaMigrationService>;
  let snackServiceSpy: jasmine.SpyObj<SnackService>;
  let opLogStoreSpy: jasmine.SpyObj<OperationLogStoreService>;
  let vectorClockServiceSpy: jasmine.SpyObj<VectorClockService>;
  let operationApplierServiceSpy: jasmine.SpyObj<OperationApplierService>;
  let conflictResolutionServiceSpy: jasmine.SpyObj<ConflictResolutionService>;
  let validateStateServiceSpy: jasmine.SpyObj<ValidateStateService>;
  let lockServiceSpy: jasmine.SpyObj<LockService>;
  let compactionServiceSpy: jasmine.SpyObj<OperationLogCompactionService>;
  let syncImportFilterServiceSpy: jasmine.SpyObj<SyncImportFilterService>;

  beforeEach(() => {
    schemaMigrationServiceSpy = jasmine.createSpyObj('SchemaMigrationService', [
      'getCurrentVersion',
      'migrateOperation',
    ]);
    snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);
    opLogStoreSpy = jasmine.createSpyObj('OperationLogStoreService', [
      'getUnsynced',
      'hasOp',
      'append',
      'appendWithVectorClockUpdate',
      'markApplied',
      'markFailed',
      'mergeRemoteOpClocks',
      'getUnsyncedByEntity',
      'getOpsAfterSeq',
      'filterNewOps',
      'getLatestFullStateOp',
      'getOpById',
      'markRejected',
    ]);
    // By default, treat all ops as new (return them as-is)
    opLogStoreSpy.filterNewOps.and.callFake((ops: any[]) => Promise.resolve(ops));
    // By default, no full-state ops in store
    opLogStoreSpy.getLatestFullStateOp.and.returnValue(Promise.resolve(undefined));
    // By default, mergeRemoteOpClocks succeeds
    opLogStoreSpy.mergeRemoteOpClocks.and.resolveTo();
    vectorClockServiceSpy = jasmine.createSpyObj('VectorClockService', [
      'getEntityFrontier',
      'getSnapshotVectorClock',
      'getSnapshotEntityKeys',
      'getCurrentVectorClock',
    ]);
    operationApplierServiceSpy = jasmine.createSpyObj('OperationApplierService', [
      'applyOperations',
    ]);
    conflictResolutionServiceSpy = jasmine.createSpyObj('ConflictResolutionService', [
      'autoResolveConflictsLWW',
      'checkOpForConflicts',
    ]);
    // Intelligent mock that implements the actual conflict detection logic
    conflictResolutionServiceSpy.checkOpForConflicts.and.callFake(
      (
        remoteOp: Operation,
        ctx: {
          localPendingOpsByEntity: Map<string, Operation[]>;
          appliedFrontierByEntity: Map<string, VectorClock>;
          snapshotVectorClock: VectorClock | undefined;
          snapshotEntityKeys: Set<string> | undefined;
          hasNoSnapshotClock: boolean;
        },
      ): { isStaleOrDuplicate: boolean; conflict: EntityConflict | null } => {
        const entityIdsToCheck =
          remoteOp.entityIds || (remoteOp.entityId ? [remoteOp.entityId] : []);

        for (const entityId of entityIdsToCheck) {
          const entityKey = toEntityKey(remoteOp.entityType, entityId);
          const localOpsForEntity = ctx.localPendingOpsByEntity.get(entityKey) || [];
          const appliedFrontier = ctx.appliedFrontierByEntity.get(entityKey);

          // Build local frontier
          const entityExistedAtSnapshot =
            ctx.snapshotEntityKeys === undefined || ctx.snapshotEntityKeys.has(entityKey);
          const fallbackClock = entityExistedAtSnapshot ? ctx.snapshotVectorClock : {};
          const baselineClock = appliedFrontier || fallbackClock || {};
          const allClocks = [
            baselineClock,
            ...localOpsForEntity.map((op) => op.vectorClock),
          ];
          const localFrontier = allClocks.reduce(
            (acc, clock) => mergeVectorClocks(acc, clock || {}),
            {},
          );
          const localFrontierIsEmpty = Object.keys(localFrontier).length === 0;

          // FAST PATH: No local state means remote is newer by default
          if (localOpsForEntity.length === 0 && localFrontierIsEmpty) {
            continue;
          }

          const vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

          // Skip stale operations (local already has newer state)
          if (vcComparison === VectorClockComparison.GREATER_THAN) {
            return { isStaleOrDuplicate: true, conflict: null };
          }

          // Skip duplicate operations (already applied)
          if (vcComparison === VectorClockComparison.EQUAL) {
            return { isStaleOrDuplicate: true, conflict: null };
          }

          // No pending ops = no conflict possible
          if (localOpsForEntity.length === 0) {
            continue;
          }

          // CONCURRENT = true conflict
          if (vcComparison === VectorClockComparison.CONCURRENT) {
            return {
              isStaleOrDuplicate: false,
              conflict: {
                entityType: remoteOp.entityType,
                entityId,
                localOps: localOpsForEntity,
                remoteOps: [remoteOp],
                suggestedResolution: 'manual',
              },
            };
          }
        }

        return { isStaleOrDuplicate: false, conflict: null };
      },
    );
    validateStateServiceSpy = jasmine.createSpyObj('ValidateStateService', [
      'validateAndRepair',
      'validateAndRepairCurrentState',
    ]);
    lockServiceSpy = jasmine.createSpyObj('LockService', ['request']);
    // Default: execute callback immediately (simulating lock acquisition)
    lockServiceSpy.request.and.callFake(
      async (_name: string, callback: () => Promise<void>) => {
        await callback();
      },
    );
    compactionServiceSpy = jasmine.createSpyObj('OperationLogCompactionService', [
      'compact',
    ]);
    compactionServiceSpy.compact.and.resolveTo();
    syncImportFilterServiceSpy = jasmine.createSpyObj('SyncImportFilterService', [
      'filterOpsInvalidatedBySyncImport',
    ]);
    // Default: return all ops as valid (no filtering)
    syncImportFilterServiceSpy.filterOpsInvalidatedBySyncImport.and.callFake(
      (ops: any[]) => Promise.resolve({ validOps: ops, invalidatedOps: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        RemoteOpsProcessingService,
        { provide: SchemaMigrationService, useValue: schemaMigrationServiceSpy },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: OperationLogStoreService, useValue: opLogStoreSpy },
        { provide: VectorClockService, useValue: vectorClockServiceSpy },
        { provide: OperationApplierService, useValue: operationApplierServiceSpy },
        { provide: ConflictResolutionService, useValue: conflictResolutionServiceSpy },
        { provide: ValidateStateService, useValue: validateStateServiceSpy },
        { provide: LockService, useValue: lockServiceSpy },
        { provide: OperationLogCompactionService, useValue: compactionServiceSpy },
        { provide: SyncImportFilterService, useValue: syncImportFilterServiceSpy },
      ],
    });

    service = TestBed.inject(RemoteOpsProcessingService);
    schemaMigrationServiceSpy.getCurrentVersion.and.returnValue(1);
    // Default migration: return op as is
    schemaMigrationServiceSpy.migrateOperation.and.callFake((op) => op);
    // Default validation: valid
    validateStateServiceSpy.validateAndRepair.and.returnValue({
      isValid: true,
      wasRepaired: false,
    } as any);
    validateStateServiceSpy.validateAndRepairCurrentState.and.resolveTo(true);
    // Default: return empty Set for snapshotEntityKeys (avoids triggering compaction branch)
    vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
      Promise.resolve(new Set()),
    );
    // Default: return empty clock for getCurrentVectorClock
    vectorClockServiceSpy.getCurrentVectorClock.and.returnValue(Promise.resolve({}));
    // Default: no local ops to replay after SYNC_IMPORT
    opLogStoreSpy.getOpsAfterSeq.and.returnValue(Promise.resolve([]));
    // Default: successful operation application
    operationApplierServiceSpy.applyOperations.and.returnValue(
      Promise.resolve({ appliedOps: [] }),
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('processRemoteOps', () => {
    it('should call migrateOperation for each remote op', async () => {
      const remoteOps: Operation[] = [
        { id: 'op1', schemaVersion: 1 } as Operation,
        { id: 'op2', schemaVersion: 1 } as Operation,
      ];
      // Assume fresh client to keep test simple
      opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));
      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));

      await service.processRemoteOps(remoteOps);

      expect(schemaMigrationServiceSpy.migrateOperation).toHaveBeenCalledTimes(2);
      expect(schemaMigrationServiceSpy.migrateOperation).toHaveBeenCalledWith(
        remoteOps[0],
      );
      expect(schemaMigrationServiceSpy.migrateOperation).toHaveBeenCalledWith(
        remoteOps[1],
      );
    });

    it('should acquire lock before conflict detection to ensure write consistency', async () => {
      const remoteOps: Operation[] = [{ id: 'op1', schemaVersion: 1 } as Operation];

      // Setup for a normal (non-full-state) operation flow
      opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));
      vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
        Promise.resolve(new Set()),
      );
      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [remoteOps[0]] }),
      );

      // Track call order
      const callOrder: string[] = [];
      lockServiceSpy.request.and.callFake(
        async (_name: string, callback: () => Promise<void>) => {
          callOrder.push('lockAcquired');
          await callback();
        },
      );
      spyOn(service, 'detectConflicts').and.callFake(async () => {
        callOrder.push('detectConflicts');
        return { nonConflicting: remoteOps, conflicts: [] };
      });

      await service.processRemoteOps(remoteOps);

      // Verify lock was acquired
      expect(lockServiceSpy.request).toHaveBeenCalledWith(
        'sp_op_log',
        jasmine.any(Function),
      );

      // Verify lock was acquired BEFORE detectConflicts
      expect(callOrder).toEqual(['lockAcquired', 'detectConflicts']);
    });

    it('should drop operations if migrateOperation returns null', async () => {
      const remoteOps: Operation[] = [
        { id: 'op1', schemaVersion: 1 } as Operation,
        { id: 'dropped', schemaVersion: 1 } as Operation,
      ];

      schemaMigrationServiceSpy.migrateOperation.and.callFake((op) => {
        if (op.id === 'dropped') return null;
        return op;
      });

      // Assume fresh client
      opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));
      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));

      await service.processRemoteOps(remoteOps);

      // Only op1 should be applied
      expect(opLogStoreSpy.append).toHaveBeenCalledTimes(1);
      expect(opLogStoreSpy.append).toHaveBeenCalledWith(remoteOps[0], 'remote', {
        pendingApply: true,
      });
    });

    it('should show error snackbar and abort if version is too new', async () => {
      const remoteOps: Operation[] = [
        { id: 'op1', schemaVersion: 1 + MAX_VERSION_SKIP + 1 } as Operation,
      ];

      await service.processRemoteOps(remoteOps);

      expect(snackServiceSpy.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'ERROR',
          msg: T.F.SYNC.S.VERSION_TOO_OLD,
        }),
      );

      // Should not proceed to apply ops
      expect(opLogStoreSpy.getUnsynced).not.toHaveBeenCalled();
    });

    it('should use migrated ops for conflict detection', async () => {
      const remoteOp: Operation = { id: 'op1', schemaVersion: 1 } as Operation;
      const migratedOp: Operation = { ...remoteOp, schemaVersion: 2 };

      schemaMigrationServiceSpy.migrateOperation.and.returnValue(migratedOp);

      // Setup
      opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));

      // Spy on detectConflicts to verify it's called with migrated ops
      spyOn(service, 'detectConflicts').and.callThrough();

      await service.processRemoteOps([remoteOp]);

      expect(service.detectConflicts).toHaveBeenCalledWith(
        [migratedOp],
        jasmine.any(Map),
      );
    });

    it('should skip conflict detection when SYNC_IMPORT is in remote ops', async () => {
      const syncImportOp: Operation = {
        id: 'sync-import-1',
        opType: OpType.SyncImport,
        actionType: '[All] Load All Data' as ActionType,
        entityType: 'ALL',
        payload: {},
        clientId: 'client-1',
        vectorClock: { client1: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [syncImportOp] }),
      );

      // Spy on detectConflicts - it should NOT be called
      spyOn(service, 'detectConflicts').and.callThrough();

      await service.processRemoteOps([syncImportOp]);

      expect(service.detectConflicts).not.toHaveBeenCalled();
    });

    it('should skip conflict detection when BACKUP_IMPORT is in remote ops', async () => {
      const backupImportOp: Operation = {
        id: 'backup-import-1',
        opType: OpType.BackupImport,
        actionType: '[All] Load All Data' as ActionType,
        entityType: 'ALL',
        payload: {},
        clientId: 'client-1',
        vectorClock: { client1: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [backupImportOp] }),
      );

      // Spy on detectConflicts - it should NOT be called
      spyOn(service, 'detectConflicts').and.callThrough();

      await service.processRemoteOps([backupImportOp]);

      expect(service.detectConflicts).not.toHaveBeenCalled();
    });
  });

  describe('detectConflicts', () => {
    const createOp = (partial: Partial<Operation>): Operation => ({
      id: 'op-1',
      actionType: '[Test] Action' as ActionType,
      opType: OpType.Update,
      entityType: 'TASK',
      entityId: 'entity-1',
      payload: {},
      clientId: 'client-1',
      vectorClock: { client1: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
      ...partial,
    });

    it('should NOT flag remote TASK ops as conflicts when fresh client has only GLOBAL_CONFIG pending ops', async () => {
      // Scenario: Fresh client configured sync (creating GLOBAL_CONFIG op) but hasn't synced yet
      // Remote TASK ops should NOT be conflicts - they should be applied directly

      // Setup: GLOBAL_CONFIG has a pending local op, but TASK:task-1 has none
      const pendingByEntity = new Map<string, Operation[]>();
      pendingByEntity.set('GLOBAL_CONFIG:sync', [
        createOp({
          id: 'local-config-op',
          entityType: 'GLOBAL_CONFIG',
          entityId: 'sync',
          opType: OpType.Update,
          vectorClock: { localClient: 1 },
        }),
      ]);
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(pendingByEntity));

      // No snapshot (fresh client)
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve(undefined),
      );

      // No entity frontier for TASK (it's a fresh client)
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));

      // Remote TASK operation from another client
      const remoteTaskOps: Operation[] = [
        createOp({
          id: 'remote-task-op',
          entityType: 'TASK',
          entityId: 'task-1',
          opType: OpType.Create,
          vectorClock: { otherClient: 1 },
        }),
      ];

      const result = await service.detectConflicts(remoteTaskOps, new Map());

      // TASK op should be non-conflicting (not a conflict!)
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('remote-task-op');
      expect(result.conflicts.length).toBe(0);
    });

    it('should detect conflicts when same entity has concurrent local and remote ops', async () => {
      // Setup: TASK:task-1 has a pending local op
      const localOp = createOp({
        id: 'local-task-op',
        entityType: 'TASK',
        entityId: 'task-1',
        opType: OpType.Update,
        vectorClock: { localClient: 1 },
      });
      const pendingByEntity = new Map<string, Operation[]>();
      pendingByEntity.set('TASK:task-1', [localOp]);
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(pendingByEntity));

      // No snapshot
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve(undefined),
      );

      // Remote TASK operation from another client (concurrent - different client)
      const remoteOps: Operation[] = [
        createOp({
          id: 'remote-task-op',
          entityType: 'TASK',
          entityId: 'task-1',
          opType: OpType.Update,
          vectorClock: { otherClient: 1 },
        }),
      ];

      const result = await service.detectConflicts(remoteOps, new Map());

      // Should be detected as conflict (concurrent modifications to same entity)
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].entityId).toBe('task-1');
      expect(result.nonConflicting.length).toBe(0);
    });

    it('should skip stale remote ops (local is newer)', async () => {
      // Setup: local has newer clock
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ localClient: 5 }),
      );
      // Entity exists in snapshot (so snapshot clock is used as fallback)
      vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
        Promise.resolve(new Set(['TASK:task-1'])),
      );
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Remote op with older clock
      const remoteOps: Operation[] = [
        createOp({
          id: 'stale-op',
          entityType: 'TASK',
          entityId: 'task-1',
          vectorClock: { localClient: 3 }, // Older than local's clock of 5
        }),
      ];

      const result = await service.detectConflicts(remoteOps, new Map());

      // Should be skipped (stale)
      expect(result.nonConflicting.length).toBe(0);
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('applyNonConflictingOps', () => {
    const createFullOp = (partial: Partial<Operation>): Operation => ({
      id: 'op-1',
      actionType: '[Test] Action' as ActionType,
      opType: OpType.Update,
      entityType: 'TASK',
      entityId: 'entity-1',
      payload: {},
      clientId: 'client-1',
      vectorClock: { client1: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
      ...partial,
    });

    it('should merge remote ops clocks after applying', async () => {
      const remoteOps: Operation[] = [
        createFullOp({ id: 'remote-1', vectorClock: { remoteClient: 1 } }),
      ];

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: remoteOps }),
      );

      await service.applyNonConflictingOps(remoteOps);

      expect(opLogStoreSpy.mergeRemoteOpClocks).toHaveBeenCalledWith(remoteOps);
    });

    it('should NOT call mergeRemoteOpClocks when no ops are applied', async () => {
      const remoteOps: Operation[] = [
        createFullOp({ id: 'remote-1', vectorClock: { remoteClient: 1 } }),
      ];

      // All ops are duplicates
      opLogStoreSpy.filterNewOps.and.returnValue(Promise.resolve([]));

      await service.applyNonConflictingOps(remoteOps);

      expect(opLogStoreSpy.mergeRemoteOpClocks).not.toHaveBeenCalled();
    });

    it('should mark failed ops and run validation on partial failure', async () => {
      const remoteOps: Operation[] = [
        createFullOp({ id: 'op-1' }),
        createFullOp({ id: 'op-2' }),
        createFullOp({ id: 'op-3' }),
      ];

      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      opLogStoreSpy.markFailed.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({
          appliedOps: [remoteOps[0]],
          failedOp: { op: remoteOps[1], error: new Error('Test error') },
        }),
      );

      await expectAsync(service.applyNonConflictingOps(remoteOps)).toBeRejected();

      // Should mark op-2 and op-3 as failed
      expect(opLogStoreSpy.markFailed).toHaveBeenCalledWith(['op-2', 'op-3']);
      // Should run validation after partial failure
      expect(validateStateServiceSpy.validateAndRepairCurrentState).toHaveBeenCalledWith(
        'partial-apply-failure',
        { callerHoldsLock: false },
      );
    });
  });

  describe('validateAfterSync', () => {
    it('should call validateAndRepairCurrentState with sync context', async () => {
      await service.validateAfterSync();

      expect(validateStateServiceSpy.validateAndRepairCurrentState).toHaveBeenCalledWith(
        'sync',
        { callerHoldsLock: false },
      );
    });

    it('should pass callerHoldsLock when specified', async () => {
      await service.validateAfterSync(true);

      expect(validateStateServiceSpy.validateAndRepairCurrentState).toHaveBeenCalledWith(
        'sync',
        { callerHoldsLock: true },
      );
    });
  });
});
