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
import { DependencyResolverService } from './dependency-resolver.service';
import { LockService } from './lock.service';
import { OperationLogCompactionService } from '../store/operation-log-compaction.service';
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
  let dependencyResolverSpy: jasmine.SpyObj<DependencyResolverService>;
  let lockServiceSpy: jasmine.SpyObj<LockService>;
  let compactionServiceSpy: jasmine.SpyObj<OperationLogCompactionService>;

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
      'markApplied',
      'getUnsyncedByEntity',
      'getOpsAfterSeq',
      'filterNewOps',
    ]);
    // By default, treat all ops as new (return them as-is)
    opLogStoreSpy.filterNewOps.and.callFake((ops: any[]) => Promise.resolve(ops));
    vectorClockServiceSpy = jasmine.createSpyObj('VectorClockService', [
      'getEntityFrontier',
      'getSnapshotVectorClock',
      'getSnapshotEntityKeys',
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
    dependencyResolverSpy = jasmine.createSpyObj('DependencyResolverService', [
      'extractDependencies',
      'checkDependencies',
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
        { provide: DependencyResolverService, useValue: dependencyResolverSpy },
        { provide: LockService, useValue: lockServiceSpy },
        { provide: OperationLogCompactionService, useValue: compactionServiceSpy },
        {
          provide: TranslateService,
          useValue: jasmine.createSpyObj('TranslateService', ['instant']),
        },
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
    // Default dependency extraction: return empty array (no dependencies)
    dependencyResolverSpy.extractDependencies.and.returnValue([]);
    // Default: all entities exist (no missing dependencies)
    dependencyResolverSpy.checkDependencies.and.returnValue(
      Promise.resolve({ missing: [] }),
    );
    // Default: return empty Set for snapshotEntityKeys (avoids triggering compaction branch)
    vectorClockServiceSpy.getSnapshotEntityKeys.and.returnValue(
      Promise.resolve(new Set()),
    );
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

      // Simulate existing local ops to trigger conflict detection path
      opLogStoreSpy.getUnsynced.and.returnValue(
        Promise.resolve([mockEntry({ id: 'local1' } as Operation)]),
      );
      opLogStoreSpy.getUnsyncedByEntity.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getEntityFrontier.and.returnValue(Promise.resolve(new Map()));
      vectorClockServiceSpy.getSnapshotVectorClock.and.returnValue(Promise.resolve({}));

      // Mock detectConflicts to return non-conflicting
      // We can't easily spy on the private/protected detectConflicts if it wasn't extracted,
      // but we can verify what append is called with.
      // Actually detectConflicts is public in the service!
      spyOn(service, 'detectConflicts').and.callThrough();

      await service.processRemoteOps([remoteOp]);

      expect(service.detectConflicts).toHaveBeenCalledWith(
        [migratedOp],
        jasmine.any(Map),
      );
    });
  });

  describe('detectConflicts - fresh client scenarios', () => {
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

      const result = await service.detectConflicts(remoteTaskOps, new Map());

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

      const result = await service.detectConflicts(remoteOps, new Map());

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

      const result = await service.detectConflicts(remoteOps, new Map());

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

      const result = await service.detectConflicts(remoteOps, new Map());

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
      const result = await service.detectConflicts(remoteOps, entityFrontier);

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

      const result = await service.detectConflicts([staleRemoteOp], entityFrontier);

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

      const result = await service.detectConflicts([duplicateRemoteOp], entityFrontier);

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

      const result = await service.detectConflicts([newerRemoteOp], entityFrontier);

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

      const result = await service.detectConflicts([remoteOp], entityFrontier);

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

      const result = await service.detectConflicts([staleRemoteOp], entityFrontier);

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

      const result = await service.detectConflicts([remoteOp], entityFrontier);

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

      const result = await service.detectConflicts([staleOp, validOp], entityFrontier);

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

  describe('_filterOpsInvalidatedBySyncImport', () => {
    // Helper to create operations with UUIDv7-style IDs (lexicographically sortable by time)
    const createOp = (partial: Partial<Operation>): Operation => ({
      id: '019afd68-0000-7000-0000-000000000000', // Default UUIDv7 format
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

    it('should return all ops as valid when no SYNC_IMPORT is present', () => {
      const ops: Operation[] = [
        createOp({ id: '019afd68-0001-7000-0000-000000000000', opType: OpType.Update }),
        createOp({ id: '019afd68-0002-7000-0000-000000000000', opType: OpType.Create }),
        createOp({ id: '019afd68-0003-7000-0000-000000000000', opType: OpType.Delete }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      expect(result.validOps.length).toBe(3);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should keep SYNC_IMPORT operation itself as valid', () => {
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-B',
      });

      const result = service._filterOpsInvalidatedBySyncImport([syncImportOp]);

      expect(result.validOps.length).toBe(1);
      expect(result.validOps[0].opType).toBe(OpType.SyncImport);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should filter out ops from OTHER clients created BEFORE SYNC_IMPORT', () => {
      // Scenario: Client B does SYNC_IMPORT, Client A had ops created before it
      const ops: Operation[] = [
        // Client A's op created BEFORE the import (lower UUIDv7)
        createOp({
          id: '019afd68-0001-7000-0000-000000000000', // Earlier timestamp
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
        }),
        // Client B's SYNC_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000', // Later timestamp
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // SYNC_IMPORT is valid, Client A's earlier op is invalidated
      expect(result.validOps.length).toBe(1);
      expect(result.validOps[0].opType).toBe(OpType.SyncImport);
      expect(result.invalidatedOps.length).toBe(1);
      expect(result.invalidatedOps[0].clientId).toBe('client-A');
    });

    it('should filter pre-import ops from the SAME client as SYNC_IMPORT', () => {
      // Scenario: Client B has ops before import, does SYNC_IMPORT, then creates more ops
      // Pre-import ops from the SAME client should be filtered (they reference old state)
      const ops: Operation[] = [
        // Client B's op created BEFORE the import - should be FILTERED
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-B',
          entityId: 'task-1',
        }),
        // Client B's SYNC_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
        // Client B's ops after the import - should be KEPT
        createOp({
          id: '019afd68-0100-7000-0000-000000000000',
          opType: OpType.Create,
          clientId: 'client-B',
          entityId: 'task-2',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // Only SYNC_IMPORT and post-import ops should be valid
      // Pre-import ops are filtered regardless of which client they came from
      expect(result.validOps.length).toBe(2);
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0050-7000-0000-000000000000',
      ); // SYNC_IMPORT
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0100-7000-0000-000000000000',
      ); // Post-import

      expect(result.invalidatedOps.length).toBe(1);
      expect(result.invalidatedOps[0].id).toBe('019afd68-0001-7000-0000-000000000000'); // Pre-import
    });

    it('should preserve ops from OTHER clients created AFTER SYNC_IMPORT (by UUIDv7)', () => {
      // Scenario: Client B does SYNC_IMPORT, then Client A creates new ops AFTER
      const ops: Operation[] = [
        // Client B's SYNC_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
        // Client A's op created AFTER the import (higher UUIDv7)
        createOp({
          id: '019afd68-0100-7000-0000-000000000000', // Later timestamp
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // Both should be valid - Client A's op came after the import
      expect(result.validOps.length).toBe(2);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should handle BACKUP_IMPORT the same way as SYNC_IMPORT', () => {
      const ops: Operation[] = [
        // Client A's op created BEFORE the backup import
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
        }),
        // Client B's BACKUP_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.BackupImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      expect(result.validOps.length).toBe(1);
      expect(result.validOps[0].opType).toBe(OpType.BackupImport);
      expect(result.invalidatedOps.length).toBe(1);
      expect(result.invalidatedOps[0].clientId).toBe('client-A');
    });

    it('should use the LATEST import when multiple imports exist', () => {
      // Scenario: Multiple imports in the batch - use the latest one
      const ops: Operation[] = [
        // Client A's early op
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
        }),
        // First SYNC_IMPORT from Client B
        createOp({
          id: '019afd68-0010-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
        // Client A's op between the two imports
        createOp({
          id: '019afd68-0020-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-2',
        }),
        // Second SYNC_IMPORT from Client C (latest)
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-C',
          entityType: 'ALL',
        }),
        // Client A's op after the latest import
        createOp({
          id: '019afd68-0100-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-3',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // Valid: both SYNC_IMPORTs, Client A's op after latest import
      // Invalid: Client A's two ops before the latest import
      expect(result.validOps.length).toBe(3);
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0010-7000-0000-000000000000',
      ); // First import
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0050-7000-0000-000000000000',
      ); // Second import
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0100-7000-0000-000000000000',
      ); // After latest import
      expect(result.invalidatedOps.length).toBe(2);
    });

    it('should handle mixed scenario with multiple clients and imports', () => {
      // Complex scenario: A creates ops, B imports, A syncs stale ops, C creates ops
      const ops: Operation[] = [
        // Client A's stale ops (created BEFORE B's import)
        createOp({
          id: '019afd60-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'tag-today',
          actionType: '[Tag] Update',
        }),
        createOp({
          id: '019afd60-0002-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'tag-today',
          actionType: '[Tag] Update',
        }),
        // Client B's SYNC_IMPORT (genesis import)
        createOp({
          id: '019afd68-0000-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
          actionType: '[OpLog] SyncImport',
        }),
        // Client C's ops (created AFTER B's import)
        createOp({
          id: '019afd70-0001-7000-0000-000000000000',
          opType: OpType.Create,
          clientId: 'client-C',
          entityId: 'new-task',
          actionType: '[Task] Create',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // Valid: B's import, C's new op
      // Invalid: A's two stale ops
      expect(result.validOps.length).toBe(2);
      expect(result.invalidatedOps.length).toBe(2);
      expect(result.invalidatedOps.every((op) => op.clientId === 'client-A')).toBe(true);
    });

    it('should correctly compare UUIDv7 IDs lexicographically', () => {
      // Test that UUIDv7 lexicographic comparison works for chronological ordering
      // Earlier timestamp = lower hex = comes first lexicographically
      const ops: Operation[] = [
        // These IDs simulate time progression in UUIDv7 format
        createOp({
          id: '019afd6d-0001-7000-0000-000000000000', // t1: earliest
          opType: OpType.Update,
          clientId: 'client-A',
        }),
        createOp({
          id: '019afd68-0000-7000-0000-000000000000', // t0: SYNC_IMPORT (note: this is EARLIER!)
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // Client A's op (019afd6d) > SYNC_IMPORT (019afd68), so it's AFTER the import
      // Therefore it should be VALID
      expect(result.validOps.length).toBe(2);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should filter out PRE-IMPORT ops from the SAME client (fresh client joining scenario)', () => {
      // BUG REGRESSION TEST: This scenario caused data corruption when a fresh client joined.
      //
      // Scenario: Client B created many ops, then did a SYNC_IMPORT (data import).
      // When a fresh client joins, it downloads ALL ops including:
      // - Pre-import ops from Client B (reference OLD state - should be filtered!)
      // - The SYNC_IMPORT (defines the new state)
      // - Post-import ops from Client B (reference NEW state - should be kept)
      //
      // The bug was that pre-import ops from the SAME client bypassed timestamp filtering
      // due to a same-client exception. These old ops then corrupted the imported state.
      const ops: Operation[] = [
        // Client B's ops created BEFORE the import - should be FILTERED
        createOp({
          id: '019afd60-0001-7000-0000-000000000000', // Much earlier timestamp
          opType: OpType.Update,
          clientId: 'client-B', // SAME client as import
          entityId: 'task-old-1',
          actionType: '[Task] Update',
        }),
        createOp({
          id: '019afd60-0002-7000-0000-000000000000', // Much earlier timestamp
          opType: OpType.Update,
          clientId: 'client-B', // SAME client as import
          entityId: 'task-old-2',
          actionType: '[Task] Update',
        }),
        // Client B's SYNC_IMPORT (data import)
        createOp({
          id: '019afd68-0050-7000-0000-000000000000', // Import timestamp
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
        }),
        // Client B's ops created AFTER the import - should be KEPT
        createOp({
          id: '019afd68-0100-7000-0000-000000000000', // After import timestamp
          opType: OpType.Create,
          clientId: 'client-B', // SAME client as import
          entityId: 'task-new',
          actionType: '[Task] Create',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // CORRECT behavior:
      // - SYNC_IMPORT: valid (always kept)
      // - Post-import op: valid (timestamp >= import timestamp)
      // - Pre-import ops: INVALID (timestamp < import timestamp, regardless of client)
      expect(result.validOps.length).toBe(2);
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0050-7000-0000-000000000000',
      ); // SYNC_IMPORT
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0100-7000-0000-000000000000',
      ); // Post-import op

      expect(result.invalidatedOps.length).toBe(2);
      expect(result.invalidatedOps.map((op) => op.id)).toContain(
        '019afd60-0001-7000-0000-000000000000',
      ); // Pre-import op 1
      expect(result.invalidatedOps.map((op) => op.id)).toContain(
        '019afd60-0002-7000-0000-000000000000',
      ); // Pre-import op 2
    });
  });

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
      spyOn(service, 'detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([syncImportOp]);

      // detectConflicts should NOT be called at all for full-state ops
      expect(service.detectConflicts).not.toHaveBeenCalled();
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

      spyOn(service, 'detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([regularOp]);

      // detectConflicts SHOULD be called for regular ops
      expect(service.detectConflicts).toHaveBeenCalled();
    });
  });

  describe('_replayLocalSyncedOpsAfterImport (late joiner scenario)', () => {
    // Helper to create operations
    const createOp = (partial: Partial<Operation>): Operation => ({
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

    // Helper to create op log entries
    const createEntry = (
      op: Operation,
      options: { syncedAt?: number; source?: 'local' | 'remote' } = {},
    ): any => ({
      seq: 1,
      op,
      appliedAt: Date.now(),
      source: options.source ?? 'local',
      syncedAt: options.syncedAt,
    });

    it('should replay local synced ops created AFTER SYNC_IMPORT', async () => {
      // Scenario: "Late joiner" - Client B has local synced ops that were created
      // AFTER the SYNC_IMPORT and need to be replayed

      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A', // From another client
        entityType: 'ALL',
        payload: { task: {}, project: {} },
      });

      // Local synced ops created by THIS client AFTER the SYNC_IMPORT (higher UUIDs)
      // UUIDv7 is time-ordered, so higher UUID = created after
      const localSyncedOp1 = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-B1',
        actionType: '[Task] Add Task',
      });
      const localSyncedOp2 = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-B2',
        actionType: '[Task] Add Task',
      });

      // Mock getOpsAfterSeq to return local synced entries
      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(localSyncedOp1, { syncedAt: Date.now() - 1000 }),
            createEntry(localSyncedOp2, { syncedAt: Date.now() - 500 }),
          ]),
        );

      // Set up other mocks
      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      // Process the SYNC_IMPORT
      await (service as any)._processRemoteOps([syncImportOp]);

      // Verify that applyOperations was called twice:
      // 1. First call: Apply the SYNC_IMPORT
      // 2. Second call: Replay local synced ops
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);

      // Second call should have the local synced ops (created AFTER the SYNC_IMPORT)
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(2);
      expect(secondCallArgs[0].map((op: Operation) => op.id)).toContain(
        '019afd68-0051-7000-0000-000000000000',
      );
      expect(secondCallArgs[0].map((op: Operation) => op.id)).toContain(
        '019afd68-0052-7000-0000-000000000000',
      );
    });

    it('should NOT replay ops from other clients', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Op from THIS client created AFTER SYNC_IMPORT (should be replayed)
      const localOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        clientId: testClientId,
      });

      // Op from OTHER client created AFTER SYNC_IMPORT (should NOT be replayed - wrong client)
      const otherClientOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        clientId: 'other-client',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(localOp, { syncedAt: Date.now() }),
            createEntry(otherClientOp, { syncedAt: Date.now() }),
          ]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should only have local client's op
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].clientId).toBe(testClientId);
    });

    it('should NOT replay unsynced ops (pending upload)', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Synced op created AFTER SYNC_IMPORT (should be replayed)
      const syncedOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        clientId: testClientId,
      });

      // Unsynced op created AFTER SYNC_IMPORT (should NOT be replayed - will be uploaded later)
      const unsyncedOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        clientId: testClientId,
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(syncedOp, { syncedAt: Date.now() }),
            createEntry(unsyncedOp, { syncedAt: undefined }), // Not synced
          ]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should only have the synced op (created AFTER SYNC_IMPORT)
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].id).toBe('019afd68-0051-7000-0000-000000000000');
    });

    it('should NOT replay SYNC_IMPORT or BACKUP_IMPORT ops', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Regular op created AFTER SYNC_IMPORT (should be replayed)
      const regularOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
      });

      // Old SYNC_IMPORT from this client created AFTER (should NOT be replayed - import ops excluded)
      const oldImportOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        opType: OpType.SyncImport,
        clientId: testClientId,
        entityType: 'ALL',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(regularOp, { syncedAt: Date.now() }),
            createEntry(oldImportOp, { syncedAt: Date.now() }),
          ]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should only have the regular op, not the old import
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].opType).toBe(OpType.Create);
    });

    it('should not call applyOperations for replay if no local synced ops exist', async () => {
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // No local ops at all
      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(Promise.resolve([]));

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // applyOperations should only be called once (for the SYNC_IMPORT itself)
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(1);
    });

    it('should sort operations by dependencies before replay (CREATE before dependent)', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Tag update that references a task (should come AFTER task create)
      const tagUpdateOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TAG',
        entityId: 'tag-1',
        actionType: '[Tag] Update',
      });

      // Task create (should come FIRST since tag depends on it)
      const taskCreateOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-1',
        actionType: '[Task] Add Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(tagUpdateOp, { syncedAt: Date.now() - 1000 }),
            createEntry(taskCreateOp, { syncedAt: Date.now() - 500 }),
          ]),
        );

      // Mock dependency extraction: tag update depends on task-1
      dependencyResolverSpy.extractDependencies.and.callFake((op: Operation) => {
        if (op.entityType === 'TAG' && op.entityId === 'tag-1') {
          return [
            {
              entityType: 'TASK',
              entityId: 'task-1',
              mustExist: true,
              relation: 'reference',
            },
          ];
        }
        return [];
      });

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should have sorted ops: task create BEFORE tag update
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(2);
      // Task create should be first (it's depended upon)
      expect(secondCallArgs[0][0].entityType).toBe('TASK');
      expect(secondCallArgs[0][0].opType).toBe(OpType.Create);
      // Tag update should be second (it depends on the task)
      expect(secondCallArgs[0][1].entityType).toBe('TAG');
      expect(secondCallArgs[0][1].opType).toBe(OpType.Update);
    });

    it('should sort DELETE operations after operations that reference the deleted entity', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Task delete (should come LAST after tag update removes reference)
      const taskDeleteOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Delete,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-1',
        actionType: '[Task] Delete Task',
      });

      // Tag update that removes task-1 from tagIds (should come FIRST)
      const tagUpdateOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TAG',
        entityId: 'tag-1',
        actionType: '[Tag] Update',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(taskDeleteOp, { syncedAt: Date.now() - 1000 }),
            createEntry(tagUpdateOp, { syncedAt: Date.now() - 500 }),
          ]),
        );

      // Mock dependency extraction: tag update references task-1
      dependencyResolverSpy.extractDependencies.and.callFake((op: Operation) => {
        if (op.entityType === 'TAG' && op.entityId === 'tag-1') {
          return [
            {
              entityType: 'TASK',
              entityId: 'task-1',
              mustExist: false,
              relation: 'reference',
            },
          ];
        }
        return [];
      });

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should have sorted ops: tag update BEFORE task delete
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(2);
      // Tag update should be first (it references the task to be deleted)
      expect(secondCallArgs[0][0].entityType).toBe('TAG');
      expect(secondCallArgs[0][0].opType).toBe(OpType.Update);
      // Task delete should be last (after references are removed)
      expect(secondCallArgs[0][1].entityType).toBe('TASK');
      expect(secondCallArgs[0][1].opType).toBe(OpType.Delete);
    });

    it('should call extractDependencies for each operation during sorting', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      const op1 = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-1',
      });
      const op2 = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TAG',
        entityId: 'tag-1',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(op1, { syncedAt: Date.now() }),
            createEntry(op2, { syncedAt: Date.now() }),
          ]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // extractDependencies should be called for each operation being sorted
      expect(dependencyResolverSpy.extractDependencies).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: op1.id }),
      );
      expect(dependencyResolverSpy.extractDependencies).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: op2.id }),
      );
    });

    it('should handle complex dependency chains correctly', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Project create (should be first - no dependencies)
      const projectCreateOp = createOp({
        id: '019afd68-0053-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'PROJECT',
        entityId: 'project-1',
        actionType: '[Project] Add',
      });

      // Task create that depends on project (should be second)
      const taskCreateOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050 - earlier but should come after project due to deps
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-1',
        actionType: '[Task] Add Task',
      });

      // Sub-task create that depends on task (should be third)
      const subTaskCreateOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'subtask-1',
        actionType: '[Task] Add Sub Task',
      });

      // Return ops in wrong order (subtask, task, project)
      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(subTaskCreateOp, { syncedAt: Date.now() - 300 }),
            createEntry(taskCreateOp, { syncedAt: Date.now() - 200 }),
            createEntry(projectCreateOp, { syncedAt: Date.now() - 100 }),
          ]),
        );

      // Mock dependency chain: subtask depends on task, task depends on project
      dependencyResolverSpy.extractDependencies.and.callFake((op: Operation) => {
        if (op.entityId === 'subtask-1') {
          return [
            {
              entityType: 'TASK',
              entityId: 'task-1',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        if (op.entityId === 'task-1') {
          return [
            {
              entityType: 'PROJECT',
              entityId: 'project-1',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        return [];
      });

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should have sorted ops: project -> task -> subtask
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(3);
      expect(secondCallArgs[0][0].entityId).toBe('project-1');
      expect(secondCallArgs[0][1].entityId).toBe('task-1');
      expect(secondCallArgs[0][2].entityId).toBe('subtask-1');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // UUIDv7 Timestamp Filtering Tests
    // These tests verify that only ops created AFTER the SYNC_IMPORT
    // (higher UUIDv7) are replayed. Ops created BEFORE (lower UUIDv7) are
    // filtered out since they reference the old state.
    // ─────────────────────────────────────────────────────────────────────────

    it('should NOT replay ops created BEFORE SYNC_IMPORT (lower UUIDv7)', async () => {
      const testClientId = 'test-client-id';

      // SYNC_IMPORT
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Op created BEFORE the SYNC_IMPORT (lower UUIDv7) - should NOT be replayed
      const preImportOp = createOp({
        id: '019afd68-0040-7000-0000-000000000000', // BEFORE 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-old',
        actionType: '[Task] Add Task',
      });

      // Op created AFTER the SYNC_IMPORT (higher UUIDv7) - should be replayed
      const postImportOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-new',
        actionType: '[Task] Add Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(preImportOp, { syncedAt: Date.now() - 1000 }),
            createEntry(postImportOp, { syncedAt: Date.now() - 500 }),
          ]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call (replay) should only have the post-import op
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].entityId).toBe('task-new');
    });

    it('should replay ops created AFTER SYNC_IMPORT (UUIDv7 comparison)', async () => {
      const testClientId = 'test-client-id';

      // SYNC_IMPORT
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Op created AFTER SYNC_IMPORT (higher UUIDv7 = later timestamp)
      // UUIDv7 is time-ordered: higher UUID means created later
      const afterOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-after',
        actionType: '[Task] Add Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(afterOp, { syncedAt: Date.now() })]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call should have the op created after SYNC_IMPORT
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].entityId).toBe('task-after');
    });

    it('should NOT replay ops created BEFORE SYNC_IMPORT (UUIDv7 comparison)', async () => {
      const testClientId = 'test-client-id';

      // SYNC_IMPORT
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Op created BEFORE SYNC_IMPORT (lower UUIDv7 = earlier timestamp)
      // These ops reference the old state and should be discarded
      const beforeOp = createOp({
        id: '019afd68-0040-7000-0000-000000000000', // BEFORE 0050
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-before',
        actionType: '[Task] Add Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(beforeOp, { syncedAt: Date.now() })]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // applyOperations should only be called once (SYNC_IMPORT), no replay
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(1);
    });

    it('should replay ops with EQUAL UUIDv7 to SYNC_IMPORT (edge case)', async () => {
      const testClientId = 'test-client-id';

      // SYNC_IMPORT
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Op with EQUAL UUID - created at same instant as SYNC_IMPORT
      // Since op.id is NOT < syncImportOp.id, this op IS replayed
      // (In practice, UUIDv7 collisions are extremely rare due to random bits)
      const equalOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000', // EQUAL to SYNC_IMPORT
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-equal',
        actionType: '[Task] Add Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(equalOp, { syncedAt: Date.now() })]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Equal ID ops ARE replayed (not strictly less than import)
      // applyOperations called twice: once for SYNC_IMPORT, once for replay
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].entityId).toBe('task-equal');
    });

    it('should filter ops by UUIDv7 correctly in mixed scenario', async () => {
      const testClientId = 'test-client-id';

      // SYNC_IMPORT
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Mix of ops: some BEFORE SYNC_IMPORT (should be filtered), some AFTER (should be replayed)
      const beforeOp1 = createOp({
        id: '019afd68-0001-7000-0000-000000000000', // BEFORE 0050
        clientId: testClientId,
        entityId: 'task-before-1',
      });
      const beforeOp2 = createOp({
        id: '019afd68-0002-7000-0000-000000000000', // BEFORE 0050
        clientId: testClientId,
        entityId: 'task-before-2',
      });
      const afterOp1 = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER 0050
        clientId: testClientId,
        entityId: 'task-after-1',
      });
      const afterOp2 = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER 0050
        clientId: testClientId,
        entityId: 'task-after-2',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(beforeOp1, { syncedAt: Date.now() - 400 }),
            createEntry(beforeOp2, { syncedAt: Date.now() - 300 }),
            createEntry(afterOp1, { syncedAt: Date.now() - 200 }),
            createEntry(afterOp2, { syncedAt: Date.now() - 100 }),
          ]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Second call should have only the ops created AFTER SYNC_IMPORT
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(2);
      const replayedIds = secondCallArgs[0].map((op: Operation) => op.entityId);
      expect(replayedIds).toContain('task-after-1');
      expect(replayedIds).toContain('task-after-2');
      expect(replayedIds).not.toContain('task-before-1');
      expect(replayedIds).not.toContain('task-before-2');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Bug Fix Verification Test
    // This test verifies the specific bug fix where vector clock comparison
    // failed after restore because fresh vector clocks have no overlapping
    // client IDs with existing ops.
    // ─────────────────────────────────────────────────────────────────────────

    it('should NOT replay old ops even when SYNC_IMPORT has fresh vector clock with no overlapping client IDs', async () => {
      // This is the exact bug scenario:
      // 1. Client A restores a backup with isForceConflict=true
      // 2. This creates a SYNC_IMPORT with a FRESH vector clock (new clientId: freshClient)
      // 3. Client B has old ops with vector clock { clientB: 10 }
      // 4. When comparing { clientB: 10 } with { freshClient: 1 }:
      //    - With vector clock comparison: CONCURRENT (bug - both clocks have components > 0)
      //    - With UUIDv7 comparison: old ops correctly filtered (fix)

      const testClientId = 'test-client-id';

      // SYNC_IMPORT with a FRESH vector clock (new client ID after restore)
      // This simulates what happens when isForceConflict=true creates a new vector clock
      const freshClientId = 'freshRestoreClient';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: freshClientId, // NEW client ID after restore
        entityType: 'ALL',
        vectorClock: { [freshClientId]: 1 }, // FRESH clock with no history
      });

      // Old op from this client with a vector clock that has NO overlap with SYNC_IMPORT's clock
      // In vector clock comparison, { testClientId: 10 } vs { freshClient: 1 } = CONCURRENT
      // because each has components the other doesn't have
      // But with UUIDv7 comparison, this op is BEFORE the import and should be filtered
      const oldOpWithNoOverlap = createOp({
        id: '019afd68-0040-7000-0000-000000000000', // BEFORE 0050
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-old-no-overlap',
        vectorClock: { [testClientId]: 10 }, // No overlap with { freshClient: 1 }
        actionType: '[Task] Update',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(oldOpWithNoOverlap, { syncedAt: Date.now() })]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // The old op should NOT be replayed because:
      // 1. Its UUIDv7 (0040) < SYNC_IMPORT's UUIDv7 (0050)
      // 2. Therefore it was created BEFORE the restore and references old state
      // applyOperations should only be called once (for the SYNC_IMPORT itself)
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(1);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Entity Existence Validation Tests
    // These tests verify that ops referencing entities deleted by SYNC_IMPORT
    // are skipped to prevent dangling references.
    // ─────────────────────────────────────────────────────────────────────────

    it('should skip ops whose target entities were deleted by SYNC_IMPORT', async () => {
      // Scenario:
      // 1. Local client has task T1 (created long ago, CREATE op compacted)
      // 2. Local client does planTasksForToday({ taskIds: [T1] }) → op with entityIds: [T1]
      // 3. SYNC_IMPORT from remote (doesn't include T1)
      // 4. SYNC_IMPORT replaces state → T1 is gone
      // 5. Replay should SKIP the planTasksForToday op because T1 doesn't exist

      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
        payload: { task: {}, project: {} },
      });

      // Local op that references a task that will be deleted by SYNC_IMPORT
      const planTodayOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TASK',
        entityIds: ['task-deleted-by-import', 'task-also-deleted'], // Bulk op with entityIds
        actionType: '[Task Shared] Plan Tasks for Today',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(planTodayOp, { syncedAt: Date.now() })]),
        );

      // Mock: checkDependencies returns missing entities (task doesn't exist)
      dependencyResolverSpy.checkDependencies.and.returnValue(
        Promise.resolve({
          missing: [
            {
              entityType: 'TASK',
              entityId: 'task-deleted-by-import',
              mustExist: true,
              relation: 'reference',
            },
            {
              entityType: 'TASK',
              entityId: 'task-also-deleted',
              mustExist: true,
              relation: 'reference',
            },
          ],
        }),
      );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // applyOperations should only be called once (for SYNC_IMPORT itself)
      // The planTodayOp should be skipped because its entityIds don't exist
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(1);
    });

    it('should replay ops whose target entities still exist after SYNC_IMPORT', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Local op referencing a task that still exists after SYNC_IMPORT
      const updateTaskOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-still-exists',
        actionType: '[Task] Update Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(updateTaskOp, { syncedAt: Date.now() })]),
        );

      // Mock: checkDependencies returns NO missing entities (task exists)
      dependencyResolverSpy.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [] }),
      );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // applyOperations should be called twice:
      // 1. For SYNC_IMPORT
      // 2. For replaying local ops (entity exists)
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].entityId).toBe('task-still-exists');
    });

    it('should NOT check entity existence for CREATE operations', async () => {
      // CREATE operations create new entities, so they should not be checked
      // for existence (they won't exist until the CREATE is applied)

      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // CREATE op - should be replayed regardless of entity existence
      const createTaskOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Create,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'new-task',
        actionType: '[Task] Add Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(createTaskOp, { syncedAt: Date.now() })]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // CREATE ops should be replayed (applyOperations called twice)
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);

      // checkDependencies should NOT be called for CREATE operations
      // (we skip entity existence check for CREATE ops)
      expect(dependencyResolverSpy.checkDependencies).not.toHaveBeenCalled();
    });

    it('should filter out ops with partially missing entities (bulk operations)', async () => {
      // For bulk ops like planTasksForToday with multiple taskIds,
      // if ANY target entity is missing, the whole op should be skipped

      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Bulk op with multiple entityIds - one exists, one doesn't
      const bulkOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TASK',
        entityIds: ['task-exists', 'task-missing'],
        actionType: '[Task Shared] Plan Tasks for Today',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(bulkOp, { syncedAt: Date.now() })]),
        );

      // One entity is missing
      dependencyResolverSpy.checkDependencies.and.returnValue(
        Promise.resolve({
          missing: [
            {
              entityType: 'TASK',
              entityId: 'task-missing',
              mustExist: true,
              relation: 'reference',
            },
          ],
        }),
      );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Op should be skipped entirely (only SYNC_IMPORT applied)
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(1);
    });

    it('should replay valid ops while skipping invalid ones in mixed batch', async () => {
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      // Valid op - entity exists
      const validOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-exists',
        actionType: '[Task] Update Task',
      });

      // Invalid op - entity was deleted by SYNC_IMPORT
      const invalidOp = createOp({
        id: '019afd68-0052-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'TASK',
        entityId: 'task-deleted',
        actionType: '[Task] Update Task',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([
            createEntry(validOp, { syncedAt: Date.now() - 100 }),
            createEntry(invalidOp, { syncedAt: Date.now() }),
          ]),
        );

      // Mock checkDependencies to return missing for invalidOp's entity
      dependencyResolverSpy.checkDependencies.and.callFake((deps: any[]) => {
        const missing = deps.filter((d: any) => d.entityId === 'task-deleted');
        return Promise.resolve({ missing });
      });

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // applyOperations called twice: SYNC_IMPORT and replay
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);

      // Second call should only have the valid op
      const secondCallArgs = operationApplierServiceSpy.applyOperations.calls.argsFor(1);
      expect(secondCallArgs[0].length).toBe(1);
      expect(secondCallArgs[0][0].entityId).toBe('task-exists');
    });

    it('should NOT check entity existence for ops with wildcard entityId (*)', async () => {
      // Global config updates use entityId: '*' - should not be checked
      const testClientId = 'test-client-id';
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-A',
        entityType: 'ALL',
      });

      const globalConfigOp = createOp({
        id: '019afd68-0051-7000-0000-000000000000', // AFTER SYNC_IMPORT
        opType: OpType.Update,
        clientId: testClientId,
        entityType: 'GLOBAL_CONFIG',
        entityId: '*', // Wildcard for singleton entities
        actionType: '[Global Config] Update',
      });

      (opLogStoreSpy as any).getOpsAfterSeq = jasmine
        .createSpy('getOpsAfterSeq')
        .and.returnValue(
          Promise.resolve([createEntry(globalConfigOp, { syncedAt: Date.now() })]),
        );

      opLogStoreSpy.hasOp.and.returnValue(Promise.resolve(false));
      opLogStoreSpy.append.and.returnValue(Promise.resolve(1));
      opLogStoreSpy.markApplied.and.returnValue(Promise.resolve());
      operationApplierServiceSpy.applyOperations.and.returnValue(
        Promise.resolve({ appliedOps: [] }),
      );

      await (service as any)._processRemoteOps([syncImportOp]);

      // Should be replayed (no entity check for '*')
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledTimes(2);
      // checkDependencies should NOT be called for wildcard entities
      expect(dependencyResolverSpy.checkDependencies).not.toHaveBeenCalled();
    });
  });

  describe('_extractTimestampFromUuidv7', () => {
    it('should extract correct timestamp from valid UUIDv7', () => {
      // UUIDv7: first 48 bits (12 hex chars) are the timestamp
      // Timestamp: 1734355200000 (2024-12-16T12:00:00.000Z in ms)
      // Hex: 0x193e1d88000 = 1734355200000
      // UUIDv7 format: 019-3e1d8-8000-7xxx-xxxx-xxxxxxxxxxxx
      const uuid = '0193e1d8-8000-7000-8000-000000000000';
      const result = (service as any)._extractTimestampFromUuidv7(uuid);
      expect(result).toBe(0x0193e1d88000); // 1734355200000
    });

    it('should extract different timestamps correctly', () => {
      // Timestamp: 0 (Unix epoch)
      const uuidEpoch = '00000000-0000-7000-8000-000000000000';
      expect((service as any)._extractTimestampFromUuidv7(uuidEpoch)).toBe(0);

      // Timestamp: 0xffffffffffff (max 48-bit value)
      const uuidMax = 'ffffffff-ffff-7000-8000-000000000000';
      expect((service as any)._extractTimestampFromUuidv7(uuidMax)).toBe(0xffffffffffff);

      // Timestamp: 1000 (1 second after epoch)
      const uuid1Sec = '00000000-03e8-7000-8000-000000000000';
      expect((service as any)._extractTimestampFromUuidv7(uuid1Sec)).toBe(1000);
    });

    it('should throw error for null input', () => {
      expect(() => (service as any)._extractTimestampFromUuidv7(null)).toThrowError(
        /Invalid UUID: expected string, got object/,
      );
    });

    it('should throw error for undefined input', () => {
      expect(() => (service as any)._extractTimestampFromUuidv7(undefined)).toThrowError(
        /Invalid UUID: expected string, got undefined/,
      );
    });

    it('should throw error for non-string input', () => {
      expect(() => (service as any)._extractTimestampFromUuidv7(12345)).toThrowError(
        /Invalid UUID: expected string, got number/,
      );
    });

    it('should throw error for UUID with wrong length', () => {
      // Too short
      expect(() =>
        (service as any)._extractTimestampFromUuidv7('0193e1d8-8000-7000'),
      ).toThrowError(/Invalid UUID length: expected 36, got 18/);

      // Too long
      expect(() =>
        (service as any)._extractTimestampFromUuidv7(
          '0193e1d8-8000-7000-8000-000000000000-extra',
        ),
      ).toThrowError(/Invalid UUID length: expected 36, got 42/);

      // Empty string
      expect(() => (service as any)._extractTimestampFromUuidv7('')).toThrowError(
        /Invalid UUID: expected string, got string/,
      );
    });

    it('should throw error for UUID with invalid hex characters', () => {
      // 'g' is not a valid hex char
      expect(() =>
        (service as any)._extractTimestampFromUuidv7(
          'g193e1d8-8000-7000-8000-000000000000',
        ),
      ).toThrowError(/Invalid UUID format: timestamp portion not valid hex/);

      // Special characters
      expect(() =>
        (service as any)._extractTimestampFromUuidv7(
          '0193e1d!-8000-7000-8000-000000000000',
        ),
      ).toThrowError(/Invalid UUID format: timestamp portion not valid hex/);
    });

    it('should handle UUIDs with uppercase hex characters', () => {
      // Should work with uppercase (hex regex uses /i flag)
      const uuidUpper = '0193E1D8-8000-7000-8000-000000000000';
      const result = (service as any)._extractTimestampFromUuidv7(uuidUpper);
      expect(result).toBe(0x0193e1d88000);
    });
  });

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
    });

    describe('downloadRemoteOps', () => {
      it('should return localWinOpsCreated: 0 when no new ops', async () => {
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
      });

      it('should return localWinOpsCreated count from processing remote ops', async () => {
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
      });

      it('should return localWinOpsCreated: 0 on server migration', async () => {
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

        // Mock the server migration handler
        spyOn<any>(service, '_handleServerMigration').and.returnValue(Promise.resolve());

        const mockProvider = {
          isReady: () => Promise.resolve(true),
        } as any;

        const result = await service.downloadRemoteOps(mockProvider);

        expect(result.serverMigrationHandled).toBe(true);
        expect(result.localWinOpsCreated).toBe(0);
      });
    });
  });
});
