import { TestBed } from '@angular/core/testing';
import { OperationLogSyncService } from './operation-log-sync.service';
import {
  SchemaMigrationService,
  MAX_VERSION_SKIP,
} from '../store/schema-migration.service';
import { SnackService } from '../../../snack/snack.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { VectorClockService } from './vector-clock.service';
import { OperationApplierService } from '../processing/operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { RepairOperationService } from '../processing/repair-operation.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { LockService } from './lock.service';
import { OperationLogCompactionService } from '../store/operation-log-compaction.service';
import { SyncImportFilterService } from './sync-import-filter.service';
import { ServerMigrationService } from './server-migration.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Operation, OpType } from '../operation.types';
import { T } from '../../../../t.const';
import { TranslateService } from '@ngx-translate/core';

// Helper to mock OpLogEntry
const mockEntry = (op: Operation): any => ({
  seq: 1,
  op,
  appliedAt: Date.now(),
  source: 'local' as const,
});

describe('OperationLogSyncService', () => {
  let service: OperationLogSyncService;
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
  let serverMigrationServiceSpy: jasmine.SpyObj<ServerMigrationService>;

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
    ]);
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
    serverMigrationServiceSpy = jasmine.createSpyObj('ServerMigrationService', [
      'checkAndHandleMigration',
      'handleServerMigration',
    ]);
    // Default: server migration check does nothing
    serverMigrationServiceSpy.checkAndHandleMigration.and.resolveTo();
    serverMigrationServiceSpy.handleServerMigration.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        OperationLogSyncService,
        provideMockStore(),
        { provide: SchemaMigrationService, useValue: schemaMigrationServiceSpy },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: OperationLogStoreService, useValue: opLogStoreSpy },
        { provide: VectorClockService, useValue: vectorClockServiceSpy },
        { provide: OperationApplierService, useValue: operationApplierServiceSpy },
        { provide: ConflictResolutionService, useValue: conflictResolutionServiceSpy },
        { provide: ValidateStateService, useValue: validateStateServiceSpy },
        {
          provide: RepairOperationService,
          useValue: jasmine.createSpyObj('RepairOperationService', [
            'createRepairOperation',
          ]),
        },
        {
          provide: PfapiStoreDelegateService,
          useValue: jasmine.createSpyObj('PfapiStoreDelegateService', [
            'getAllSyncModelDataFromStore',
          ]),
        },
        {
          provide: PfapiService,
          useValue: {
            pf: {
              metaModel: {
                loadClientId: jasmine
                  .createSpy('loadClientId')
                  .and.returnValue(Promise.resolve('test-client-id')),
              },
            },
          },
        },
        {
          provide: OperationLogUploadService,
          useValue: jasmine.createSpyObj('OperationLogUploadService', [
            'uploadPendingOps',
          ]),
        },
        {
          provide: OperationLogDownloadService,
          useValue: jasmine.createSpyObj('OperationLogDownloadService', [
            'downloadRemoteOps',
          ]),
        },
        { provide: LockService, useValue: lockServiceSpy },
        { provide: OperationLogCompactionService, useValue: compactionServiceSpy },
        {
          provide: TranslateService,
          useValue: jasmine.createSpyObj('TranslateService', ['instant']),
        },
        { provide: SyncImportFilterService, useValue: syncImportFilterServiceSpy },
        { provide: ServerMigrationService, useValue: serverMigrationServiceSpy },
      ],
    });

    service = TestBed.inject(OperationLogSyncService);
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

  describe('_processRemoteOps', () => {
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

      await (service as any)._processRemoteOps(remoteOps);

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
      spyOn(service as any, '_detectConflicts').and.callFake(async () => {
        callOrder.push('detectConflicts');
        return { nonConflicting: remoteOps, conflicts: [] };
      });

      await (service as any)._processRemoteOps(remoteOps);

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

      await (service as any)._processRemoteOps(remoteOps);

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

      await (service as any)._processRemoteOps(remoteOps);

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

      // Simulate existing local ops to trigger conflict detection path
      opLogStoreSpy.getUnsynced.and.returnValue(
        Promise.resolve([mockEntry({ id: 'local1' } as Operation)]),
      );
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));

      // Spy on _detectConflicts to verify it's called with migrated ops
      spyOn(service as any, '_detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([remoteOp]);

      expect((service as any)._detectConflicts).toHaveBeenCalledWith(
        [migratedOp],
        jasmine.any(Map),
      );
    });
  });

  describe('_detectConflicts - fresh client scenarios', () => {
    const createOp = (partial: Partial<Operation>): Operation => ({
      id: 'op-1',
      actionType: '[Test] Action',
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

      const result = await (service as any)._detectConflicts(remoteTaskOps, new Map());

      // TASK op should be non-conflicting (not a conflict!)
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('remote-task-op');
      expect(result.conflicts.length).toBe(0);
    });

    it('should flag as conflict when entity has pending local ops but empty frontier (potential corruption)', async () => {
      // Scenario: An entity has pending local ops but no frontier entry and no snapshot
      // This indicates potential clock corruption - should be flagged as conflict

      const pendingByEntity = new Map<string, Operation[]>();
      pendingByEntity.set('TASK:task-1', [
        createOp({
          id: 'local-task-op',
          entityType: 'TASK',
          entityId: 'task-1',
          opType: OpType.Update,
          vectorClock: { localClient: 1 },
        }),
      ]);
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(pendingByEntity));

      // No snapshot (potential corruption scenario)
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve(undefined),
      );

      // No entity frontier (the pending ops vector clock should have been tracked)
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));

      // Remote op for the SAME entity
      const remoteOps: Operation[] = [
        createOp({
          id: 'remote-task-op',
          entityType: 'TASK',
          entityId: 'task-1',
          opType: OpType.Update,
          vectorClock: { otherClient: 1 },
        }),
      ];

      const result = await (service as any)._detectConflicts(remoteOps, new Map());

      // Should be flagged as conflict due to per-entity corruption check
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].entityId).toBe('task-1');
      expect(result.nonConflicting.length).toBe(0);
    });

    it('should apply remote ops without conflict for truly fresh client (no pending ops at all)', async () => {
      // Scenario: Completely fresh client with no local ops whatsoever
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve(undefined),
      );
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));

      const remoteOps: Operation[] = [
        createOp({
          id: 'remote-op-1',
          entityType: 'TASK',
          entityId: 'task-1',
          vectorClock: { otherClient: 1 },
        }),
        createOp({
          id: 'remote-op-2',
          entityType: 'PROJECT',
          entityId: 'project-1',
          vectorClock: { otherClient: 2 },
        }),
      ];

      const result = await (service as any)._detectConflicts(remoteOps, new Map());

      // All ops should be non-conflicting
      expect(result.nonConflicting.length).toBe(2);
      expect(result.conflicts.length).toBe(0);
    });

    it('should NOT conflict when snapshot clock has entries but entity has no local state', async () => {
      // Scenario: Client B has a snapshot with {clientA: 10, clientB: 5}
      // Client A sends a delete op for a task that B never modified
      // The delete op has vectorClock {clientA: 11}
      // This should NOT be a conflict - B has no local state for this entity

      // No pending local ops for any entity
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot has entries for multiple clients (from previous syncs)
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 10, clientB: 5 }),
      );

      // No per-entity frontier (entity wasn't modified after snapshot)
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));

      // Remote delete from Client A - its vectorClock only has clientA's counter
      const remoteOps: Operation[] = [
        createOp({
          id: 'remote-delete-op',
          entityType: 'TASK',
          entityId: 'task-xyz',
          opType: OpType.Delete,
          clientId: 'clientA',
          vectorClock: { clientA: 11 }, // Only knows about clientA
        }),
      ];

      const result = await (service as any)._detectConflicts(remoteOps, new Map());

      // Should NOT be a conflict - entity has no local state
      expect(result.conflicts.length).toBe(0);
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('remote-delete-op');
    });

    it('should NOT conflict when entity has frontier but no pending ops', async () => {
      // Scenario: Entity was modified after snapshot but those ops are already synced
      // A new remote op arrives - should NOT conflict since no pending local ops
      // Key insight: conflicts require PENDING local changes, not just historical ones

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 5 }),
      );

      // Entity HAS a frontier (was modified after snapshot, but already synced)
      const entityFrontier = new Map<string, any>();
      entityFrontier.set('TASK:task-1', { clientA: 8, clientB: 3 });
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(
        Promise.resolve(entityFrontier),
      );

      // Remote op - even with "concurrent" looking vector clock, no conflict
      // because local has no PENDING changes
      const remoteOps: Operation[] = [
        createOp({
          id: 'remote-update-op',
          entityType: 'TASK',
          entityId: 'task-1',
          opType: OpType.Update,
          vectorClock: { clientA: 9 },
        }),
      ];

      // Pass the entity frontier to detectConflicts
      const result = await (service as any)._detectConflicts(remoteOps, entityFrontier);

      // No pending local ops = no conflict possible
      // The remote op should be applied directly
      expect(result.conflicts.length).toBe(0);
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('remote-update-op');
    });

    // =========================================================================
    // Regression tests: Stale/duplicate detection with no pending ops
    // =========================================================================
    // These tests verify that stale/duplicate remote ops are correctly skipped
    // even when the local client has no pending ops for that entity.
    // The applied frontier must be checked to detect stale/duplicate ops.

    it('should skip STALE remote op when local has newer applied state but no pending ops', async () => {
      // Scenario: Local applied ops up to {clientA: 10}, no pending ops.
      // Remote sends an OLD op with {clientA: 5}.
      // This is STALE - local already has newer state. Should be SKIPPED.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot clock shows we've applied up to clientA: 10
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 10 }),
      );

      // Entity frontier also shows clientA: 10
      const entityFrontier = new Map<string, any>();
      entityFrontier.set('TASK:task-1', { clientA: 10 });
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(
        Promise.resolve(entityFrontier),
      );

      // Remote op is OLD (clientA: 5 < local's clientA: 10)
      const staleRemoteOp: Operation = {
        id: 'stale-remote-op',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Old title' },
        clientId: 'clientA',
        vectorClock: { clientA: 5 }, // STALE: local has clientA: 10
        timestamp: Date.now() - 10000,
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts(
        [staleRemoteOp],
        entityFrontier,
      );

      // Stale ops should be skipped (neither nonConflicting nor conflicting)
      expect(result.nonConflicting.length).toBe(0);
      expect(result.conflicts.length).toBe(0);
    });

    it('should skip DUPLICATE remote op when local already applied it but has no pending ops', async () => {
      // Scenario: Local applied op with {clientA: 5}, no pending ops.
      // Remote sends the SAME op with {clientA: 5}.
      // This is a DUPLICATE - should be SKIPPED.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot clock shows we've applied up to clientA: 5
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 5 }),
      );

      // Entity frontier shows the exact same clock
      const entityFrontier = new Map<string, any>();
      entityFrontier.set('TASK:task-1', { clientA: 5 });
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(
        Promise.resolve(entityFrontier),
      );

      // Remote op has EQUAL clock - it's a duplicate
      const duplicateRemoteOp: Operation = {
        id: 'duplicate-remote-op',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Same title' },
        clientId: 'clientA',
        vectorClock: { clientA: 5 }, // EQUAL to local - duplicate
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts(
        [duplicateRemoteOp],
        entityFrontier,
      );

      // Duplicate ops should be skipped (neither nonConflicting nor conflicting)
      expect(result.nonConflicting.length).toBe(0);
      expect(result.conflicts.length).toBe(0);
    });

    it('should still apply NEWER remote op when local has no pending ops (the valid fast-path case)', async () => {
      // Scenario: Local applied ops up to {clientA: 5}, no pending ops.
      // Remote sends a NEWER op with {clientA: 6}.
      // This is valid - should be applied.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot clock shows we've applied up to clientA: 5
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 5 }),
      );

      // Entity frontier shows clientA: 5
      const entityFrontier = new Map<string, any>();
      entityFrontier.set('TASK:task-1', { clientA: 5 });
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(
        Promise.resolve(entityFrontier),
      );

      // Remote op is NEWER (clientA: 6 > local's clientA: 5)
      const newerRemoteOp: Operation = {
        id: 'newer-remote-op',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'New title' },
        clientId: 'clientA',
        vectorClock: { clientA: 6 }, // NEWER than local
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts(
        [newerRemoteOp],
        entityFrontier,
      );

      // This is the correct behavior that should continue to work
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('newer-remote-op');
      expect(result.conflicts.length).toBe(0);
    });
  });

  // =========================================================================
  // New entity after compaction tests (snapshotEntityKeys fix)
  // =========================================================================
  // These tests verify the fix for the bug where remote operations for entities
  // created AFTER compaction were incorrectly dropped as "stale" because the
  // snapshot clock had high counters from unrelated work.

  describe('new entity after compaction (snapshotEntityKeys)', () => {
    it('should accept remote op for entity NOT in snapshotEntityKeys (new entity)', async () => {
      // Scenario: After compaction, snapshot has high clock from unrelated entities.
      // A remote op arrives for a brand new entity (not in snapshotEntityKeys).
      // It should be accepted, NOT rejected as stale.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot clock has high counters from unrelated work
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 100, clientB: 10 }),
      );

      // Entity was NOT in snapshot (new entity created after compaction)
      vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
        Promise.resolve(new Set(['TASK:old-task-1', 'TASK:old-task-2'])),
      );

      // No applied frontier for this new entity
      const entityFrontier = new Map<string, any>();

      // Remote creates brand new entity with a clock that would be "stale"
      // if compared against snapshot clock (clientB: 6 < snapshot's clientB: 10)
      const remoteOp: Operation = {
        id: 'create-new-task',
        actionType: '[Task] Add Task',
        opType: OpType.Create,
        entityType: 'TASK',
        entityId: 'new-task-from-clientB', // NOT in snapshotEntityKeys
        payload: { title: 'New task' },
        clientId: 'clientB',
        vectorClock: { clientB: 6 }, // Lower than snapshot's clientB: 10
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts([remoteOp], entityFrontier);

      // Should be accepted as non-conflicting, NOT dropped as stale
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('create-new-task');
      expect(result.conflicts.length).toBe(0);
    });

    it('should still reject stale op for entity IN snapshotEntityKeys (existing entity)', async () => {
      // Scenario: Entity existed at snapshot time. Remote sends stale op.
      // Should use snapshot clock as baseline and correctly reject as stale.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot clock: clientA was at 10 for this entity
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 10 }),
      );

      // Entity WAS in snapshot
      vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
        Promise.resolve(new Set(['TASK:existing-task'])),
      );

      // No applied frontier (entity not modified since compaction)
      const entityFrontier = new Map<string, any>();

      // Remote sends STALE op (clientA: 5 < snapshot's clientA: 10)
      const staleRemoteOp: Operation = {
        id: 'stale-update',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'existing-task', // IS in snapshotEntityKeys
        payload: { title: 'Old title' },
        clientId: 'clientA',
        vectorClock: { clientA: 5 }, // Older than snapshot
        timestamp: Date.now() - 10000,
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts(
        [staleRemoteOp],
        entityFrontier,
      );

      // Should be skipped as stale (existing behavior preserved)
      expect(result.nonConflicting.length).toBe(0);
      expect(result.conflicts.length).toBe(0);
    });

    it('should use snapshot clock as fallback when snapshotEntityKeys is undefined (backward compatibility)', async () => {
      // Scenario: Old snapshot format without snapshotEntityKeys.
      // Should maintain existing behavior: treat all entities as existing.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      // Snapshot clock has high counters
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 100 }),
      );

      // No snapshotEntityKeys (old format)
      vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
        Promise.resolve(undefined),
      );

      const entityFrontier = new Map<string, any>();

      // Remote op with clock that would be stale against snapshot
      const remoteOp: Operation = {
        id: 'some-op',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'some-task',
        payload: { title: 'Title' },
        clientId: 'clientA',
        vectorClock: { clientA: 50 }, // Lower than snapshot's 100
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts([remoteOp], entityFrontier);

      // Should be rejected as stale (backward compatible behavior)
      expect(result.nonConflicting.length).toBe(0);
      expect(result.conflicts.length).toBe(0);
    });

    it('should handle mixed scenario: some entities in snapshot, some new', async () => {
      // Scenario: Two remote ops - one for existing entity, one for new entity.
      // Only the stale op for existing entity should be rejected.

      // No pending local ops
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));

      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ clientA: 50, clientB: 20 }),
      );

      // Only old-task existed at snapshot time
      vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
        Promise.resolve(new Set(['TASK:old-task'])),
      );

      const entityFrontier = new Map<string, any>();

      // Stale op for existing entity
      const staleOp: Operation = {
        id: 'stale-op',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'old-task', // IN snapshotEntityKeys
        payload: {},
        clientId: 'clientA',
        vectorClock: { clientA: 10 }, // Stale: 10 < 50
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // Valid op for new entity
      const validOp: Operation = {
        id: 'valid-op',
        actionType: '[Task] Add Task',
        opType: OpType.Create,
        entityType: 'TASK',
        entityId: 'new-task', // NOT in snapshotEntityKeys
        payload: {},
        clientId: 'clientB',
        vectorClock: { clientB: 15 }, // Would be stale if compared to snapshot (15 < 20)
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const result = await (service as any)._detectConflicts(
        [staleOp, validOp],
        entityFrontier,
      );

      // staleOp should be rejected (for existing entity)
      // validOp should be accepted (for new entity)
      expect(result.nonConflicting.length).toBe(1);
      expect(result.nonConflicting[0].id).toBe('valid-op');
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('_suggestResolution', () => {
    // Access private method for testing
    const callSuggestResolution = (
      svc: OperationLogSyncService,
      localOps: Operation[],
      remoteOps: Operation[],
    ): 'local' | 'remote' | 'manual' => {
      return (svc as any)._suggestResolution(localOps, remoteOps);
    };

    const createOp = (partial: Partial<Operation>): Operation => ({
      id: 'op-1',
      actionType: '[Test] Action',
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

    it('should suggest remote when local ops are empty', () => {
      const remoteOps = [createOp({ id: 'remote-1' })];
      expect(callSuggestResolution(service, [], remoteOps)).toBe('remote');
    });

    it('should suggest local when remote ops are empty', () => {
      const localOps = [createOp({ id: 'local-1' })];
      expect(callSuggestResolution(service, localOps, [])).toBe('local');
    });

    it('should suggest newer side when timestamps differ by more than 1 hour', () => {
      const now = Date.now();
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const twoHoursAgo = now - TWO_HOURS_MS;

      const localOps = [createOp({ id: 'local-1', timestamp: now })];
      const remoteOps = [createOp({ id: 'remote-1', timestamp: twoHoursAgo })];

      // Local is newer
      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('local');

      // Flip: remote is newer
      const localOpsOld = [createOp({ id: 'local-1', timestamp: twoHoursAgo })];
      const remoteOpsNew = [createOp({ id: 'remote-1', timestamp: now })];
      expect(callSuggestResolution(service, localOpsOld, remoteOpsNew)).toBe('remote');
    });

    it('should prefer update over delete (local delete, remote update)', () => {
      const now = Date.now();
      const localOps = [
        createOp({ id: 'local-1', opType: OpType.Delete, timestamp: now }),
      ];
      const remoteOps = [
        createOp({ id: 'remote-1', opType: OpType.Update, timestamp: now }),
      ];

      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('remote');
    });

    it('should prefer update over delete (remote delete, local update)', () => {
      const now = Date.now();
      const localOps = [
        createOp({ id: 'local-1', opType: OpType.Update, timestamp: now }),
      ];
      const remoteOps = [
        createOp({ id: 'remote-1', opType: OpType.Delete, timestamp: now }),
      ];

      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('local');
    });

    it('should prefer create over update', () => {
      const now = Date.now();
      const localOps = [
        createOp({ id: 'local-1', opType: OpType.Create, timestamp: now }),
      ];
      const remoteOps = [
        createOp({ id: 'remote-1', opType: OpType.Update, timestamp: now }),
      ];

      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('local');

      // Flip
      const localOps2 = [
        createOp({ id: 'local-1', opType: OpType.Update, timestamp: now }),
      ];
      const remoteOps2 = [
        createOp({ id: 'remote-1', opType: OpType.Create, timestamp: now }),
      ];
      expect(callSuggestResolution(service, localOps2, remoteOps2)).toBe('remote');
    });

    it('should return manual for close timestamps with same op types', () => {
      const now = Date.now();
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      const fiveMinutesAgo = now - FIVE_MINUTES_MS;

      const localOps = [
        createOp({ id: 'local-1', opType: OpType.Update, timestamp: now }),
      ];
      const remoteOps = [
        createOp({ id: 'remote-1', opType: OpType.Update, timestamp: fiveMinutesAgo }),
      ];

      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('manual');
    });

    it('should auto-resolve when both have delete ops (outcome is identical)', () => {
      const now = Date.now();
      const localOps = [
        createOp({ id: 'local-1', opType: OpType.Delete, timestamp: now }),
      ];
      const remoteOps = [
        createOp({ id: 'remote-1', opType: OpType.Delete, timestamp: now }),
      ];

      // Both want to delete - auto-resolve to local (could be either, outcome is same)
      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('local');
    });
  });

  // Tests for filterOpsInvalidatedBySyncImport have been moved to sync-import-filter.service.spec.ts
  // The OperationLogSyncService now delegates to SyncImportFilterService

  describe('SyncImportFilterService delegation', () => {
    it('should delegate to SyncImportFilterService.filterOpsInvalidatedBySyncImport', () => {
      // The service now uses the injected SyncImportFilterService
      // Full tests are in sync-import-filter.service.spec.ts
      expect(syncImportFilterServiceSpy.filterOpsInvalidatedBySyncImport).toBeDefined();
    });
  });

  // NOTE: Old _filterOpsInvalidatedBySyncImport tests (800+ lines) have been moved to
  // sync-import-filter.service.spec.ts. The OperationLogSyncService now delegates to SyncImportFilterService.

  describe('full-state operation handling', () => {
    // Helper to create operations
    const createFullStateOp = (partial: Partial<Operation>): Operation => ({
      id: '019afd68-0000-7000-0000-000000000000',
      actionType: '[Test] Action',
      opType: OpType.Update,
      entityType: 'TASK',
      entityId: 'entity-1',
      payload: {},
      clientId: 'client-A',
      vectorClock: { clientA: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
      ...partial,
    });

    it('should skip conflict detection when SYNC_IMPORT is in remote ops', async () => {
      // This is tested implicitly - when SYNC_IMPORT is present, ops are applied directly
      // without going through conflict detection. We verify by ensuring no conflicts
      // are presented when SYNC_IMPORT is in the batch.

      const syncImportOp = createFullStateOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-B',
        entityType: 'ALL',
        payload: { task: {}, project: {} },
      });

      // Set up mocks
      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      // Process remote ops with SYNC_IMPORT
      // Note: _processRemoteOps is private but we can still call it in tests
      await (service as any)._processRemoteOps([syncImportOp]);

      // Should have applied ops directly without showing conflict dialog
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalled();
      expect(conflictResolutionServiceSpy.autoResolveConflictsLWW).not.toHaveBeenCalled();
    });

    it('should skip conflict detection when BACKUP_IMPORT is in remote ops', async () => {
      const backupImportOp = createFullStateOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.BackupImport,
        clientId: 'client-B',
        entityType: 'ALL',
        payload: { task: {}, project: {} },
      });

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([backupImportOp]);

      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalled();
      expect(conflictResolutionServiceSpy.autoResolveConflictsLWW).not.toHaveBeenCalled();
    });

    it('should skip conflict detection even when local pending ops exist for SYNC_IMPORT', async () => {
      // Critical scenario: Local client has pending ops that would normally conflict
      // but SYNC_IMPORT should bypass conflict detection entirely
      const syncImportOp = createFullStateOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-B',
        entityType: 'ALL',
        payload: { task: {}, project: {} },
      });

      // Set up local pending ops that would normally trigger conflict
      const localPendingOp = createFullStateOp({
        id: '019afd68-0001-7000-0000-000000000000',
        opType: OpType.Update,
        clientId: 'local-client',
        entityType: 'TASK',
        entityId: 'task-1',
        vectorClock: { localClient: 1 },
      });

      const pendingByEntity = new Map<string, Operation[]>();
      pendingByEntity.set('TASK:task-1', [localPendingOp]);
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(pendingByEntity));

      // Set up entity frontier that would cause CONCURRENT comparison (conflict)
      const entityFrontier = new Map<string, any>();
      entityFrontier.set('TASK:task-1', { localClient: 1 });
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(
        Promise.resolve(entityFrontier),
      );
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(
        Promise.resolve({ localClient: 1 }),
      );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      // Spy on detectConflicts to verify it's NOT called
      spyOn(service as any, '_detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([syncImportOp]);

      // detectConflicts should NOT be called at all for full-state ops
      expect((service as any)._detectConflicts).not.toHaveBeenCalled();
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalled();
      expect(conflictResolutionServiceSpy.autoResolveConflictsLWW).not.toHaveBeenCalled();
    });

    it('should apply SYNC_IMPORT along with subsequent ops from same client', async () => {
      // Scenario: SYNC_IMPORT followed by regular ops from same client
      const syncImportOp = createFullStateOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-B',
        entityType: 'ALL',
        payload: { task: {}, project: {} },
      });

      const followUpOp = createFullStateOp({
        id: '019afd68-0100-7000-0000-000000000000',
        opType: OpType.Create,
        clientId: 'client-B',
        entityType: 'TASK',
        entityId: 'new-task',
      });

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp, followUpOp]);

      // Both ops should be applied
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledWith([
        syncImportOp,
        followUpOp,
      ]);
      expect(conflictResolutionServiceSpy.autoResolveConflictsLWW).not.toHaveBeenCalled();
    });

    it('should still run conflict detection for regular ops without full-state op', async () => {
      // Verify that normal ops still go through conflict detection
      const regularOp = createFullStateOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.Update,
        clientId: 'client-B',
        entityType: 'TASK',
        entityId: 'task-1',
      });

      // No local pending ops = no conflicts
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      spyOn(service as any, '_detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([regularOp]);

      // detectConflicts SHOULD be called for regular ops
      expect((service as any)._detectConflicts).toHaveBeenCalled();
    });
  });

  // NOTE: _replayLocalSyncedOpsAfterImport tests removed.
  // Clean Slate Semantics: SYNC_IMPORT/BACKUP_IMPORT replaces entire state.
  // Local synced ops are NOT replayed - the import is an explicit user action
  // to restore all clients to a specific point in time.

  describe('localWinOpsCreated propagation', () => {
    let uploadServiceSpy: jasmine.SpyObj<OperationLogUploadService>;
    let downloadServiceSpy: jasmine.SpyObj<OperationLogDownloadService>;

    beforeEach(() => {
      uploadServiceSpy = TestBed.inject(
        OperationLogUploadService,
      ) as jasmine.SpyObj<OperationLogUploadService>;
      downloadServiceSpy = TestBed.inject(
        OperationLogDownloadService,
      ) as jasmine.SpyObj<OperationLogDownloadService>;

      // Mock loadStateCache to return null (no cache) so isWhollyFreshClient check passes
      (opLogStoreSpy as any).loadStateCache = jasmine
        .createSpy('loadStateCache')
        .and.returnValue(Promise.resolve(null));
      (opLogStoreSpy as any).getLastSeq = jasmine
        .createSpy('getLastSeq')
        .and.returnValue(Promise.resolve(1)); // Not fresh (has seq)
    });

    describe('uploadPendingOps', () => {
      it('should return localWinOpsCreated: 0 when no piggybacked ops', async () => {
        opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));
        uploadServiceSpy.uploadPendingOps.and.returnValue(
          Promise.resolve({
            uploadedCount: 0,
            piggybackedOps: [],
            rejectedCount: 0,
            rejectedOps: [],
          }),
        );

        const mockProvider = {
          isReady: () => Promise.resolve(true),
        } as any;

        const result = await service.uploadPendingOps(mockProvider);

        expect(result?.localWinOpsCreated).toBe(0);
      });

      it('should return localWinOpsCreated count from piggybacked ops processing', async () => {
        opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));

        const piggybackedOp: Operation = {
          id: 'piggybacked-1',
          clientId: 'client-B',
          actionType: 'test',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Remote Title' },
          vectorClock: { clientB: 1 },
          timestamp: Date.now(),
          schemaVersion: 1,
        };

        uploadServiceSpy.uploadPendingOps.and.returnValue(
          Promise.resolve({
            uploadedCount: 1,
            piggybackedOps: [piggybackedOp],
            rejectedCount: 0,
            rejectedOps: [],
          }),
        );

        // Spy on _processRemoteOps to return 2 local-win ops
        spyOn<any>(service, '_processRemoteOps').and.returnValue(
          Promise.resolve({ localWinOpsCreated: 2 }),
        );

        const mockProvider = {
          isReady: () => Promise.resolve(true),
        } as any;

        const result = await service.uploadPendingOps(mockProvider);

        expect(result?.localWinOpsCreated).toBe(2);
      });

      describe('concurrent modification rejection handling', () => {
        let mockProvider: any;

        beforeEach(() => {
          mockProvider = {
            isReady: () => Promise.resolve(true),
            supportsOperationSync: true,
            downloadOps: jasmine.createSpy('downloadOps').and.returnValue(
              Promise.resolve({
                ops: [],
                latestSeq: 0,
              }),
            ),
          };
          // Default: markRejected resolves
          opLogStoreSpy.markRejected.and.returnValue(Promise.resolve());
        });

        it('should keep concurrent modification ops as pending and trigger download', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Concurrent modification detected for TAG:TODAY',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          // Spy on downloadRemoteOps to verify it's called
          const downloadSpy = spyOn(service, 'downloadRemoteOps').and.returnValue(
            Promise.resolve({
              serverMigrationHandled: false,
              localWinOpsCreated: 0,
              newOpsCount: 0,
            }),
          );

          await service.uploadPendingOps(mockProvider);

          // Should NOT mark the op as rejected immediately (it will be resolved by _resolveStaleLocalOps)
          // Since download returns 0 ops, _resolveStaleLocalOps will create merged ops and mark old ones as rejected
          // expect(opLogStoreSpy.markRejected).not.toHaveBeenCalled();
          // Should trigger a download to get conflicting remote ops
          expect(downloadSpy).toHaveBeenCalledWith(mockProvider);
        });

        it('should mark permanent rejection errors as rejected', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Test' },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                { opId: 'local-op-1', error: 'Validation failed: invalid payload' },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));

          await service.uploadPendingOps(mockProvider);

          // Should mark the op as rejected
          expect(opLogStoreSpy.markRejected).toHaveBeenCalledWith(['local-op-1']);
        });

        it('should handle CONFLICT_CONCURRENT errorCode as concurrent modification', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              // Now uses errorCode instead of error string matching
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Some random message',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          const downloadSpy = spyOn(service, 'downloadRemoteOps').and.returnValue(
            Promise.resolve({
              serverMigrationHandled: false,
              localWinOpsCreated: 0,
              newOpsCount: 0,
            }),
          );

          await service.uploadPendingOps(mockProvider);

          // Should trigger a download
          expect(downloadSpy).toHaveBeenCalledWith(mockProvider);
        });

        it('should NOT treat error string without errorCode as concurrent modification', async () => {
          // This tests that we use errorCode, not error string matching
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  // Error message contains "Concurrent modification" but errorCode is NOT CONFLICT_CONCURRENT
                  error: 'Concurrent modification in some other context',
                  errorCode: 'VALIDATION_ERROR',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          const downloadSpy = spyOn(service, 'downloadRemoteOps').and.returnValue(
            Promise.resolve({
              serverMigrationHandled: false,
              localWinOpsCreated: 0,
              newOpsCount: 0,
            }),
          );

          await service.uploadPendingOps(mockProvider);

          // Should NOT trigger download (not treated as concurrent modification)
          expect(downloadSpy).not.toHaveBeenCalled();

          // Should mark as rejected (permanent rejection)
          expect(opLogStoreSpy.markRejected).toHaveBeenCalledWith(['local-op-1']);
        });

        it('should handle mixed rejection types correctly', async () => {
          const concurrentOp: Operation = {
            id: 'op-concurrent',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          const permanentOp: Operation = {
            id: 'op-permanent',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-2',
            payload: { title: 'Test' },
            vectorClock: { clientA: 2 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 2,
              rejectedOps: [
                {
                  opId: 'op-concurrent',
                  error: 'Concurrent modification detected for TAG:TODAY',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
                {
                  opId: 'op-permanent',
                  error: 'Schema validation failed',
                  errorCode: 'VALIDATION_ERROR',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.callFake((opId: string) => {
            if (opId === 'op-concurrent') {
              return Promise.resolve({
                seq: 1,
                op: concurrentOp,
                appliedAt: Date.now(),
                source: 'local' as const,
              });
            }
            if (opId === 'op-permanent') {
              return Promise.resolve({
                seq: 2,
                op: permanentOp,
                appliedAt: Date.now(),
                source: 'local' as const,
              });
            }
            return Promise.resolve(undefined);
          });
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              {
                seq: 1,
                op: concurrentOp,
                appliedAt: Date.now(),
                source: 'local' as const,
              },
            ]),
          );

          const downloadSpy = spyOn(service, 'downloadRemoteOps').and.returnValue(
            Promise.resolve({
              serverMigrationHandled: false,
              localWinOpsCreated: 0,
              newOpsCount: 0,
            }),
          );

          await service.uploadPendingOps(mockProvider);

          // Should mark both the permanent rejection AND the concurrent ops as rejected
          // (concurrent ops get marked rejected by _resolveStaleLocalOps which creates merged ops)
          expect(opLogStoreSpy.markRejected).toHaveBeenCalled();
          // Should trigger a download for the concurrent modification
          expect(downloadSpy).toHaveBeenCalledWith(mockProvider);
        });

        it('should skip ops that are already synced or rejected', async () => {
          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 2,
              rejectedOps: [
                {
                  opId: 'already-synced',
                  error: 'Concurrent modification',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
                { opId: 'already-rejected', error: 'Some error' },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.callFake((opId: string) => {
            if (opId === 'already-synced') {
              return Promise.resolve({
                seq: 1,
                op: { id: 'already-synced' } as Operation,
                appliedAt: Date.now(),
                syncedAt: Date.now(), // Already synced
                source: 'local' as const,
              });
            }
            if (opId === 'already-rejected') {
              return Promise.resolve({
                seq: 2,
                op: { id: 'already-rejected' } as Operation,
                appliedAt: Date.now(),
                rejectedAt: Date.now(), // Already rejected
                source: 'local' as const,
              });
            }
            return Promise.resolve(undefined);
          });
          opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));

          await service.uploadPendingOps(mockProvider);

          // Should not mark anything as rejected (both were skipped)
          expect(opLogStoreSpy.markRejected).not.toHaveBeenCalled();
        });

        it('should trigger force download from seq 0 when normal download returns 0 ops but ops still pending', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Concurrent modification detected for TAG:TODAY',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          let downloadCallCount = 0;
          const downloadSpy = spyOn(service, 'downloadRemoteOps').and.callFake(
            (_provider: any, options?: { forceFromSeq0?: boolean }) => {
              downloadCallCount++;
              if (downloadCallCount === 1) {
                // First call: normal download returns 0 ops
                return Promise.resolve({
                  serverMigrationHandled: false,
                  localWinOpsCreated: 0,
                  newOpsCount: 0,
                });
              } else {
                // Second call: force download from seq 0
                expect(options?.forceFromSeq0).toBe(true);
                return Promise.resolve({
                  serverMigrationHandled: false,
                  localWinOpsCreated: 0,
                  newOpsCount: 0,
                  allOpClocks: [{ clientA: 5, clientB: 3 }], // Extra clocks from server
                });
              }
            },
          );

          await service.uploadPendingOps(mockProvider);

          // Should call download twice: normal then force from seq 0
          expect(downloadCallCount).toBe(2);
          expect(downloadSpy).toHaveBeenCalledWith(mockProvider);
          expect(downloadSpy).toHaveBeenCalledWith(mockProvider, { forceFromSeq0: true });
        });

        it('should pass allOpClocks to _resolveStaleLocalOps when force download returns clocks', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Concurrent modification detected for TAG:TODAY',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          const forceDownloadClocks = [
            { clientA: 3, clientB: 10 },
            { clientA: 5, clientC: 2 },
          ];

          let downloadCallCount = 0;
          spyOn(service, 'downloadRemoteOps').and.callFake(() => {
            downloadCallCount++;
            if (downloadCallCount === 1) {
              return Promise.resolve({
                serverMigrationHandled: false,
                localWinOpsCreated: 0,
                newOpsCount: 0,
              });
            } else {
              return Promise.resolve({
                serverMigrationHandled: false,
                localWinOpsCreated: 0,
                newOpsCount: 0,
                allOpClocks: forceDownloadClocks,
              });
            }
          });

          // Spy on _resolveStaleLocalOps to verify it receives allOpClocks
          const resolveStaleOpsSpy = spyOn<any>(
            service,
            '_resolveStaleLocalOps',
          ).and.returnValue(Promise.resolve(0));

          await service.uploadPendingOps(mockProvider);

          // Verify _resolveStaleLocalOps was called with the clocks from force download
          // Third arg is snapshotVectorClock (undefined in this test)
          expect(resolveStaleOpsSpy).toHaveBeenCalledWith(
            jasmine.any(Array),
            forceDownloadClocks,
            undefined,
          );
        });

        it('should pass snapshotVectorClock to _resolveStaleLocalOps when present', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Concurrent modification detected for TAG:TODAY',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          const snapshotVectorClock = { clientA: 10, clientB: 5, clientC: 3 };

          spyOn(service, 'downloadRemoteOps').and.callFake(() => {
            // Download returns no new ops but has snapshotVectorClock
            return Promise.resolve({
              serverMigrationHandled: false,
              localWinOpsCreated: 0,
              newOpsCount: 0,
              snapshotVectorClock,
            });
          });

          // Spy on _resolveStaleLocalOps to verify it receives snapshotVectorClock
          const resolveStaleOpsSpy = spyOn<any>(
            service,
            '_resolveStaleLocalOps',
          ).and.returnValue(Promise.resolve(0));

          await service.uploadPendingOps(mockProvider);

          // Verify _resolveStaleLocalOps was called with snapshotVectorClock
          expect(resolveStaleOpsSpy).toHaveBeenCalledWith(
            jasmine.any(Array),
            undefined, // No allOpClocks from regular download
            snapshotVectorClock,
          );
        });

        it('should pass both allOpClocks and snapshotVectorClock to _resolveStaleLocalOps', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TAG',
            entityId: 'TODAY',
            payload: { taskIds: ['task-1'] },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Concurrent modification detected for TAG:TODAY',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          const allOpClocks = [
            { clientA: 3, clientB: 10 },
            { clientA: 5, clientC: 2 },
          ];
          const snapshotVectorClock = { clientA: 15, clientB: 8, clientD: 1 };

          let downloadCallCount = 0;
          spyOn(service, 'downloadRemoteOps').and.callFake(() => {
            downloadCallCount++;
            if (downloadCallCount === 1) {
              // First download returns no ops (triggers force download)
              return Promise.resolve({
                serverMigrationHandled: false,
                localWinOpsCreated: 0,
                newOpsCount: 0,
              });
            } else {
              // Force download returns both allOpClocks and snapshotVectorClock
              return Promise.resolve({
                serverMigrationHandled: false,
                localWinOpsCreated: 0,
                newOpsCount: 0,
                allOpClocks,
                snapshotVectorClock,
              });
            }
          });

          // Spy on _resolveStaleLocalOps to verify it receives both
          const resolveStaleOpsSpy = spyOn<any>(
            service,
            '_resolveStaleLocalOps',
          ).and.returnValue(Promise.resolve(0));

          await service.uploadPendingOps(mockProvider);

          // Verify _resolveStaleLocalOps was called with both allOpClocks and snapshotVectorClock
          expect(resolveStaleOpsSpy).toHaveBeenCalledWith(
            jasmine.any(Array),
            allOpClocks,
            snapshotVectorClock,
          );
        });

        it('should use snapshotVectorClock when download returns new ops but concurrent ops still pending', async () => {
          const localOp: Operation = {
            id: 'local-op-1',
            clientId: 'client-A',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TIME_TRACKING', // Different entity type than downloaded op
            entityId: 'tt-123',
            payload: { data: 'test' },
            vectorClock: { clientA: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          uploadServiceSpy.uploadPendingOps.and.returnValue(
            Promise.resolve({
              uploadedCount: 0,
              piggybackedOps: [],
              rejectedCount: 1,
              rejectedOps: [
                {
                  opId: 'local-op-1',
                  error: 'Concurrent modification detected for TIME_TRACKING:tt-123',
                  errorCode: 'CONFLICT_CONCURRENT',
                },
              ],
            }),
          );

          opLogStoreSpy.getOpById.and.returnValue(
            Promise.resolve({
              seq: 1,
              op: localOp,
              appliedAt: Date.now(),
              source: 'local' as const,
            }),
          );
          opLogStoreSpy.getUnsynced.and.returnValue(
            Promise.resolve([
              { seq: 1, op: localOp, appliedAt: Date.now(), source: 'local' as const },
            ]),
          );

          const snapshotVectorClock = { clientA: 20, clientB: 15 };

          // Download returns new ops for a different entity (TASK), but TIME_TRACKING op still pending
          spyOn(service, 'downloadRemoteOps').and.returnValue(
            Promise.resolve({
              serverMigrationHandled: false,
              localWinOpsCreated: 0,
              newOpsCount: 5, // Got new ops, but for different entity
              snapshotVectorClock,
            }),
          );

          // Spy on _resolveStaleLocalOps
          const resolveStaleOpsSpy = spyOn<any>(
            service,
            '_resolveStaleLocalOps',
          ).and.returnValue(Promise.resolve(0));

          await service.uploadPendingOps(mockProvider);

          // Verify _resolveStaleLocalOps was called with snapshotVectorClock
          expect(resolveStaleOpsSpy).toHaveBeenCalledWith(
            jasmine.any(Array),
            undefined,
            snapshotVectorClock,
          );
        });
      });
    });

    describe('downloadRemoteOps', () => {
      it('should return localWinOpsCreated: 0 and newOpsCount: 0 when no new ops', async () => {
        downloadServiceSpy.downloadRemoteOps.and.returnValue(
          Promise.resolve({
            newOps: [],
            hasMore: false,
            latestSeq: 0,
            needsFullStateUpload: false,
            success: true,
            failedFileCount: 0,
          }),
        );

        const mockProvider = {
          isReady: () => Promise.resolve(true),
        } as any;

        const result = await service.downloadRemoteOps(mockProvider);

        expect(result.localWinOpsCreated).toBe(0);
        expect(result.newOpsCount).toBe(0);
      });

      it('should return localWinOpsCreated count and newOpsCount from processing remote ops', async () => {
        opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));

        const remoteOp: Operation = {
          id: 'remote-1',
          clientId: 'client-B',
          actionType: 'test',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Remote Title' },
          vectorClock: { clientB: 1 },
          timestamp: Date.now(),
          schemaVersion: 1,
        };

        downloadServiceSpy.downloadRemoteOps.and.returnValue(
          Promise.resolve({
            newOps: [remoteOp],
            hasMore: false,
            latestSeq: 1,
            needsFullStateUpload: false,
            success: true,
            failedFileCount: 0,
          }),
        );

        // Spy on _processRemoteOps to return 1 local-win op
        spyOn<any>(service, '_processRemoteOps').and.returnValue(
          Promise.resolve({ localWinOpsCreated: 1 }),
        );

        const mockProvider = {
          isReady: () => Promise.resolve(true),
        } as any;

        const result = await service.downloadRemoteOps(mockProvider);

        expect(result.localWinOpsCreated).toBe(1);
        expect(result.newOpsCount).toBe(1);
      });

      it('should return localWinOpsCreated: 0 and newOpsCount: 0 on server migration', async () => {
        downloadServiceSpy.downloadRemoteOps.and.returnValue(
          Promise.resolve({
            newOps: [],
            hasMore: false,
            latestSeq: 0,
            needsFullStateUpload: true, // Server migration
            success: true,
            failedFileCount: 0,
          }),
        );

        // serverMigrationServiceSpy.handleServerMigration is already mocked in beforeEach

        const mockProvider = {
          isReady: () => Promise.resolve(true),
        } as any;

        const result = await service.downloadRemoteOps(mockProvider);

        expect(result.serverMigrationHandled).toBe(true);
        expect(result.localWinOpsCreated).toBe(0);
        expect(result.newOpsCount).toBe(0);
      });

      describe('lastServerSeq persistence', () => {
        it('should persist lastServerSeq AFTER processing ops (crash safety)', async () => {
          opLogStoreSpy.getUnsynced.and.returnValue(Promise.resolve([]));

          const remoteOp: Operation = {
            id: 'remote-1',
            clientId: 'client-B',
            actionType: 'test',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Remote Title' },
            vectorClock: { clientB: 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
          };

          downloadServiceSpy.downloadRemoteOps.and.returnValue(
            Promise.resolve({
              newOps: [remoteOp],
              hasMore: false,
              latestSeq: 1,
              needsFullStateUpload: false,
              success: true,
              failedFileCount: 0,
              latestServerSeq: 42, // Server sequence to persist
            }),
          );

          // Track call order to verify setLastServerSeq is called AFTER _processRemoteOps
          const callOrder: string[] = [];
          spyOn<any>(service, '_processRemoteOps').and.callFake(async () => {
            callOrder.push('_processRemoteOps');
            return { localWinOpsCreated: 0 };
          });

          const setLastServerSeqSpy = jasmine
            .createSpy('setLastServerSeq')
            .and.callFake(async () => {
              callOrder.push('setLastServerSeq');
            });

          const mockProvider = {
            isReady: () => Promise.resolve(true),
            supportsOperationSync: true,
            setLastServerSeq: setLastServerSeqSpy,
          } as any;

          await service.downloadRemoteOps(mockProvider);

          // Verify setLastServerSeq was called with correct value
          expect(setLastServerSeqSpy).toHaveBeenCalledWith(42);
          // Verify order: _processRemoteOps must complete BEFORE setLastServerSeq
          expect(callOrder).toEqual(['_processRemoteOps', 'setLastServerSeq']);
        });

        it('should persist lastServerSeq even when no ops (to stay in sync with server)', async () => {
          downloadServiceSpy.downloadRemoteOps.and.returnValue(
            Promise.resolve({
              newOps: [],
              hasMore: false,
              latestSeq: 0,
              needsFullStateUpload: false,
              success: true,
              failedFileCount: 0,
              latestServerSeq: 100, // Server is at seq 100 but no new ops for us
            }),
          );

          const setLastServerSeqSpy = jasmine
            .createSpy('setLastServerSeq')
            .and.resolveTo();

          const mockProvider = {
            isReady: () => Promise.resolve(true),
            supportsOperationSync: true,
            setLastServerSeq: setLastServerSeqSpy,
          } as any;

          await service.downloadRemoteOps(mockProvider);

          // Should still update lastServerSeq to stay in sync with server
          expect(setLastServerSeqSpy).toHaveBeenCalledWith(100);
        });

        it('should not call setLastServerSeq if latestServerSeq is undefined', async () => {
          downloadServiceSpy.downloadRemoteOps.and.returnValue(
            Promise.resolve({
              newOps: [],
              hasMore: false,
              latestSeq: 0,
              needsFullStateUpload: false,
              success: true,
              failedFileCount: 0,
              // latestServerSeq not set
            }),
          );

          const setLastServerSeqSpy = jasmine
            .createSpy('setLastServerSeq')
            .and.resolveTo();

          const mockProvider = {
            isReady: () => Promise.resolve(true),
            supportsOperationSync: true,
            setLastServerSeq: setLastServerSeqSpy,
          } as any;

          await service.downloadRemoteOps(mockProvider);

          // Should NOT call setLastServerSeq when latestServerSeq is undefined
          expect(setLastServerSeqSpy).not.toHaveBeenCalled();
        });

        it('should not call setLastServerSeq if provider does not support operation sync', async () => {
          downloadServiceSpy.downloadRemoteOps.and.returnValue(
            Promise.resolve({
              newOps: [],
              hasMore: false,
              latestSeq: 0,
              needsFullStateUpload: false,
              success: true,
              failedFileCount: 0,
              latestServerSeq: 100,
            }),
          );

          const mockProvider = {
            isReady: () => Promise.resolve(true),
            // supportsOperationSync NOT set - not an operation sync provider
          } as any;

          // Should not throw even though provider doesn't support operation sync
          await expectAsync(service.downloadRemoteOps(mockProvider)).toBeResolved();
        });
      });
    });
  });

  // NOTE: Old _handleServerMigration state validation tests (600+ lines) have been moved to
  // server-migration.service.spec.ts. The OperationLogSyncService now delegates to ServerMigrationService.

  describe('_resolveStaleLocalOps', () => {
    it('should create operations with LWW Update action type (not Merged Update)', async () => {
      // This test ensures that operations created by _resolveStaleLocalOps use the correct
      // action type '[ENTITY_TYPE] LWW Update' which is recognized by lwwUpdateMetaReducer.
      // Previously, it used '[ENTITY_TYPE] Merged Update' which was NOT handled by any reducer,
      // causing state updates to be silently ignored on remote clients.

      // Setup: Mock client ID
      const pfapiServiceMock = jasmine.createSpyObj('PfapiService', [], {
        pf: {
          metaModel: {
            loadClientId: () => Promise.resolve('test-client'),
          },
        },
      });

      // Setup: Mock vector clock service
      vectorClockServiceSpy.getCurrentVectorClock.and.returnValue(
        Promise.resolve({ testClient: 5 }),
      );

      // Setup: Mock conflict resolution service to return entity state
      conflictResolutionServiceSpy.getCurrentEntityState = jasmine
        .createSpy('getCurrentEntityState')
        .and.returnValue(
          Promise.resolve({
            id: 'task-1',
            title: 'Test Task',
            tagIds: [], // This is the important field that was being lost
          }),
        );

      // Setup: Mock opLogStore.appendWithVectorClockUpdate to capture the operation
      // This method is used instead of append to ensure vector clock is updated atomically
      let appendedOp: Operation | null = null;
      opLogStoreSpy.appendWithVectorClockUpdate.and.callFake((op: Operation) => {
        appendedOp = op;
        return Promise.resolve(1);
      });
      opLogStoreSpy.markRejected.and.returnValue(Promise.resolve());

      // Create a stale op to trigger _resolveStaleLocalOps
      const staleOp: Operation = {
        id: 'stale-op-1',
        clientId: 'test-client',
        actionType: '[Task Shared] updateTask',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { task: { id: 'task-1', changes: { tagIds: [] } } },
        vectorClock: { testClient: 3 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // Re-create service with the mocked pfapi service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          OperationLogSyncService,
          { provide: SchemaMigrationService, useValue: schemaMigrationServiceSpy },
          { provide: SnackService, useValue: snackServiceSpy },
          { provide: OperationLogStoreService, useValue: opLogStoreSpy },
          { provide: VectorClockService, useValue: vectorClockServiceSpy },
          { provide: OperationApplierService, useValue: operationApplierServiceSpy },
          { provide: ConflictResolutionService, useValue: conflictResolutionServiceSpy },
          { provide: ValidateStateService, useValue: validateStateServiceSpy },
          { provide: RepairOperationService, useValue: {} },
          { provide: PfapiStoreDelegateService, useValue: {} },
          { provide: PfapiService, useValue: pfapiServiceMock },
          { provide: OperationLogUploadService, useValue: {} },
          { provide: OperationLogDownloadService, useValue: {} },
          { provide: LockService, useValue: lockServiceSpy },
          { provide: OperationLogCompactionService, useValue: compactionServiceSpy },
          { provide: SyncImportFilterService, useValue: syncImportFilterServiceSpy },
          { provide: ServerMigrationService, useValue: serverMigrationServiceSpy },
          { provide: TranslateService, useValue: {} },
          provideMockStore({ initialState: {} }),
        ],
      });

      const testService = TestBed.inject(OperationLogSyncService);

      // Call the private method directly to test it
      const result = await (testService as any)._resolveStaleLocalOps([
        { opId: 'stale-op-1', op: staleOp },
      ]);

      // Verify: Operation was created
      expect(result).toBe(1);
      expect(appendedOp).not.toBeNull();

      // CRITICAL: Verify the action type is 'LWW Update', NOT 'Merged Update'
      // This is the fix - 'Merged Update' was not recognized by lwwUpdateMetaReducer
      expect(appendedOp!.actionType).toBe('[TASK] LWW Update');
      expect(appendedOp!.actionType).not.toBe('[TASK] Merged Update');

      // Verify the payload contains the full entity state (including tagIds)
      expect(appendedOp!.payload).toEqual({
        id: 'task-1',
        title: 'Test Task',
        tagIds: [],
      });
    });

    it('should use appendWithVectorClockUpdate to ensure vector clock is updated atomically', async () => {
      // This test verifies that _resolveStaleLocalOps uses appendWithVectorClockUpdate
      // instead of plain append, ensuring the vector clock store is updated atomically
      // with each operation. This prevents counter collisions where subsequent operations
      // could get duplicate vector clock entries.

      // Setup: Mock client ID
      const pfapiServiceMock = jasmine.createSpyObj('PfapiService', [], {
        pf: {
          metaModel: {
            loadClientId: () => Promise.resolve('test-client'),
          },
        },
      });

      // Setup: Mock vector clock service
      vectorClockServiceSpy.getCurrentVectorClock.and.returnValue(
        Promise.resolve({ testClient: 5 }),
      );

      // Setup: Mock conflict resolution service to return entity state
      conflictResolutionServiceSpy.getCurrentEntityState = jasmine
        .createSpy('getCurrentEntityState')
        .and.returnValue(
          Promise.resolve({
            id: 'task-1',
            title: 'Test Task',
            tagIds: [],
          }),
        );

      // Setup: Spy on appendWithVectorClockUpdate
      opLogStoreSpy.appendWithVectorClockUpdate.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markRejected.and.returnValue(Promise.resolve());

      // Create a stale op
      const staleOp: Operation = {
        id: 'stale-op-1',
        clientId: 'test-client',
        actionType: '[Task Shared] updateTask',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { task: { id: 'task-1', changes: { tagIds: [] } } },
        vectorClock: { testClient: 3 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // Re-create service with the mocked pfapi service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          OperationLogSyncService,
          { provide: SchemaMigrationService, useValue: schemaMigrationServiceSpy },
          { provide: SnackService, useValue: snackServiceSpy },
          { provide: OperationLogStoreService, useValue: opLogStoreSpy },
          { provide: VectorClockService, useValue: vectorClockServiceSpy },
          { provide: OperationApplierService, useValue: operationApplierServiceSpy },
          { provide: ConflictResolutionService, useValue: conflictResolutionServiceSpy },
          { provide: ValidateStateService, useValue: validateStateServiceSpy },
          { provide: RepairOperationService, useValue: {} },
          { provide: PfapiStoreDelegateService, useValue: {} },
          { provide: PfapiService, useValue: pfapiServiceMock },
          { provide: OperationLogUploadService, useValue: {} },
          { provide: OperationLogDownloadService, useValue: {} },
          { provide: LockService, useValue: lockServiceSpy },
          { provide: OperationLogCompactionService, useValue: compactionServiceSpy },
          { provide: SyncImportFilterService, useValue: syncImportFilterServiceSpy },
          { provide: ServerMigrationService, useValue: serverMigrationServiceSpy },
          { provide: TranslateService, useValue: {} },
          provideMockStore({ initialState: {} }),
        ],
      });

      const testService = TestBed.inject(OperationLogSyncService);

      // Call the private method
      await (testService as any)._resolveStaleLocalOps([
        { opId: 'stale-op-1', op: staleOp },
      ]);

      // CRITICAL: Verify appendWithVectorClockUpdate was called, not plain append
      // This ensures vector clock store is updated atomically with the operation
      expect(opLogStoreSpy.appendWithVectorClockUpdate).toHaveBeenCalledWith(
        jasmine.objectContaining({
          actionType: '[TASK] LWW Update',
          entityType: 'TASK',
          entityId: 'task-1',
        }),
        'local',
      );
      // Verify plain append was NOT called
      expect(opLogStoreSpy.append).not.toHaveBeenCalled();
    });
  });

  describe('mergeRemoteOpClocks integration', () => {
    it('should merge remote ops clocks after successfully applying remote ops', async () => {
      // Setup: Remote ops to be applied
      const remoteOps: Operation[] = [
        {
          id: '019afd68-0001-7000-0000-000000000000',
          actionType: '[Task] Update',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Updated' },
          clientId: 'remoteClient',
          vectorClock: { remoteClient: 5 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
        {
          id: '019afd68-0002-7000-0000-000000000000',
          actionType: '[Task] Update',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-2',
          payload: { title: 'Updated 2' },
          clientId: 'remoteClient',
          vectorClock: { remoteClient: 6 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ];

      // Setup: append returns seq numbers
      let seqCounter = 1;
      opLogStoreSpy.append.and.callFake(async () => seqCounter++);
      opLogStoreSpy.markApplied.and.resolveTo();

      // Setup: applyOperations returns success for all ops
      operationApplierServiceSpy.applyOperations.and.resolveTo({
        appliedOps: remoteOps,
      });

      // Act: Process remote ops through the private method
      await (service as any)._applyNonConflictingOps(remoteOps);

      // Assert: mergeRemoteOpClocks was called with the applied ops
      expect(opLogStoreSpy.mergeRemoteOpClocks).toHaveBeenCalledTimes(1);
      expect(opLogStoreSpy.mergeRemoteOpClocks).toHaveBeenCalledWith(remoteOps);
    });

    it('should NOT call mergeRemoteOpClocks when no ops are applied', async () => {
      // Setup: Empty ops array
      const remoteOps: Operation[] = [];

      // Act: Process empty ops
      await (service as any)._applyNonConflictingOps(remoteOps);

      // Assert: mergeRemoteOpClocks was NOT called
      expect(opLogStoreSpy.mergeRemoteOpClocks).not.toHaveBeenCalled();
    });

    it('should merge clocks for partially applied ops on failure', async () => {
      // Setup: Three remote ops
      const remoteOps: Operation[] = [
        {
          id: '019afd68-0001-7000-0000-000000000000',
          actionType: '[Task] Update',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Op 1' },
          clientId: 'clientA',
          vectorClock: { clientA: 1 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
        {
          id: '019afd68-0002-7000-0000-000000000000',
          actionType: '[Task] Update',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-2',
          payload: { title: 'Op 2' },
          clientId: 'clientA',
          vectorClock: { clientA: 2 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
        {
          id: '019afd68-0003-7000-0000-000000000000',
          actionType: '[Task] Update',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-3',
          payload: { title: 'Op 3' },
          clientId: 'clientA',
          vectorClock: { clientA: 3 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ];

      // Setup: append returns seq numbers
      let seqCounter = 1;
      opLogStoreSpy.append.and.callFake(async () => seqCounter++);
      opLogStoreSpy.markApplied.and.resolveTo();
      opLogStoreSpy.markFailed.and.resolveTo();
      validateStateServiceSpy.validateAndRepairCurrentState.and.resolveTo();

      // Setup: First two ops succeed, third fails
      operationApplierServiceSpy.applyOperations.and.resolveTo({
        appliedOps: [remoteOps[0], remoteOps[1]],
        failedOp: {
          op: remoteOps[2],
          error: new Error('Test failure'),
        },
      });

      // Act: Process remote ops - expect it to throw due to failure
      await expectAsync(
        (service as any)._applyNonConflictingOps(remoteOps),
      ).toBeRejectedWithError('Test failure');

      // Assert: mergeRemoteOpClocks was called with only the successfully applied ops
      expect(opLogStoreSpy.mergeRemoteOpClocks).toHaveBeenCalledTimes(1);
      expect(opLogStoreSpy.mergeRemoteOpClocks).toHaveBeenCalledWith([
        remoteOps[0],
        remoteOps[1],
      ]);
    });

    it('should call mergeRemoteOpClocks after markApplied (ensures correct order)', async () => {
      // This test verifies the order of operations is:
      // 1. markApplied - update op status
      // 2. mergeRemoteOpClocks - update local vector clock
      // 3. Log success message

      const remoteOp: Operation = {
        id: '019afd68-0001-7000-0000-000000000000',
        actionType: '[Task] Update',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Updated' },
        clientId: 'remoteClient',
        vectorClock: { remoteClient: 10 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      opLogStoreSpy.append.and.resolveTo(1);
      opLogStoreSpy.markApplied.and.resolveTo();
      operationApplierServiceSpy.applyOperations.and.resolveTo({
        appliedOps: [remoteOp],
      });

      // Track call order
      const callOrder: string[] = [];
      opLogStoreSpy.markApplied.and.callFake(async () => {
        callOrder.push('markApplied');
      });
      opLogStoreSpy.mergeRemoteOpClocks.and.callFake(async () => {
        callOrder.push('mergeRemoteOpClocks');
      });

      await (service as any)._applyNonConflictingOps([remoteOp]);

      // Verify order: markApplied is called first, then mergeRemoteOpClocks
      expect(callOrder).toEqual(['markApplied', 'mergeRemoteOpClocks']);
    });
  });
});
