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
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { DependencyResolverService } from './dependency-resolver.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Operation, OpType } from '../operation.types';
import { T } from '../../../../t.const';

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
    ]);
    vectorClockServiceSpy = jasmine.createSpyObj('VectorClockService', [
      'getEntityFrontier',
      'getSnapshotVectorClock',
    ]);
    operationApplierServiceSpy = jasmine.createSpyObj('OperationApplierService', [
      'applyOperations',
    ]);
    conflictResolutionServiceSpy = jasmine.createSpyObj('ConflictResolutionService', [
      'presentConflicts',
    ]);
    validateStateServiceSpy = jasmine.createSpyObj('ValidateStateService', [
      'validateAndRepair',
      'validateAndRepairCurrentState',
    ]);
    dependencyResolverSpy = jasmine.createSpyObj('DependencyResolverService', [
      'extractDependencies',
    ]);

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

    it('should return manual when both have delete ops', () => {
      const now = Date.now();
      const localOps = [
        createOp({ id: 'local-1', opType: OpType.Delete, timestamp: now }),
      ];
      const remoteOps = [
        createOp({ id: 'remote-1', opType: OpType.Delete, timestamp: now }),
      ];

      expect(callSuggestResolution(service, localOps, remoteOps)).toBe('manual');
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

    it('should preserve ops from the SAME client as SYNC_IMPORT', () => {
      // Scenario: Client B does SYNC_IMPORT, then creates more ops
      const ops: Operation[] = [
        // Client B's ops created BEFORE the import are still valid (same client)
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
        // Client B's ops after the import
        createOp({
          id: '019afd68-0100-7000-0000-000000000000',
          opType: OpType.Create,
          clientId: 'client-B',
          entityId: 'task-2',
        }),
      ];

      const result = service._filterOpsInvalidatedBySyncImport(ops);

      // All ops from client-B should be valid
      expect(result.validOps.length).toBe(3);
      expect(result.invalidatedOps.length).toBe(0);
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
      operationApplierServiceSpy.applyOperations.and.returnValue(Promise.resolve());

      // Process remote ops with SYNC_IMPORT
      // Note: _processRemoteOps is private but we can still call it in tests
      await (service as any)._processRemoteOps([syncImportOp]);

      // Should have applied ops directly without showing conflict dialog
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalled();
      expect(conflictResolutionServiceSpy.presentConflicts).not.toHaveBeenCalled();
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
      operationApplierServiceSpy.applyOperations.and.returnValue(Promise.resolve());

      await (service as any)._processRemoteOps([backupImportOp]);

      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalled();
      expect(conflictResolutionServiceSpy.presentConflicts).not.toHaveBeenCalled();
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
      operationApplierServiceSpy.applyOperations.and.returnValue(Promise.resolve());

      // Spy on detectConflicts to verify it's NOT called
      spyOn(service, 'detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([syncImportOp]);

      // detectConflicts should NOT be called at all for full-state ops
      expect(service.detectConflicts).not.toHaveBeenCalled();
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalled();
      expect(conflictResolutionServiceSpy.presentConflicts).not.toHaveBeenCalled();
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
      operationApplierServiceSpy.applyOperations.and.returnValue(Promise.resolve());

      await (service as any)._processRemoteOps([syncImportOp, followUpOp]);

      // Both ops should be applied
      expect(operationApplierServiceSpy.applyOperations).toHaveBeenCalledWith([
        syncImportOp,
        followUpOp,
      ]);
      expect(conflictResolutionServiceSpy.presentConflicts).not.toHaveBeenCalled();
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
      operationApplierServiceSpy.applyOperations.and.returnValue(Promise.resolve());

      spyOn(service, 'detectConflicts').and.callThrough();

      await (service as any)._processRemoteOps([regularOp]);

      // detectConflicts SHOULD be called for regular ops
      expect(service.detectConflicts).toHaveBeenCalled();
    });
  });
});
