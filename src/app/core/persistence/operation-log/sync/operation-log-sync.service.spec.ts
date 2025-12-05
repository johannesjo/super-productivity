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
});
