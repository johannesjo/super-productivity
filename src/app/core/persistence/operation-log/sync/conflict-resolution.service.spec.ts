import { TestBed } from '@angular/core/testing';
import { ConflictResolutionService } from './conflict-resolution.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { OperationApplierService } from '../processing/operation-applier.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { SnackService } from '../../../snack/snack.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { RepairOperationService } from '../processing/repair-operation.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { of } from 'rxjs';
import { EntityConflict, OpType, Operation } from '../operation.types';
import { DialogConflictResolutionComponent } from '../../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockOperationApplier: jasmine.SpyObj<OperationApplierService>;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockValidateStateService: jasmine.SpyObj<ValidateStateService>;
  let mockRepairOperationService: jasmine.SpyObj<RepairOperationService>;
  let mockStoreDelegateService: jasmine.SpyObj<PfapiStoreDelegateService>;
  let mockPfapiService: any;

  const createMockOp = (id: string, clientId: string): Operation => ({
    id,
    clientId,
    actionType: 'test',
    opType: OpType.Update,
    entityType: 'TASK',
    entityId: 'task-1',
    payload: {},
    vectorClock: { [clientId]: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
  });

  beforeEach(() => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockOperationApplier = jasmine.createSpyObj('OperationApplierService', [
      'applyOperations',
      'getFailedCount',
      'clearFailedOperations',
    ]);
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'hasOp',
      'append',
      'markApplied',
      'markRejected',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockValidateStateService = jasmine.createSpyObj('ValidateStateService', [
      'validateAndRepair',
    ]);
    mockRepairOperationService = jasmine.createSpyObj('RepairOperationService', [
      'createRepairOperation',
    ]);
    mockStoreDelegateService = jasmine.createSpyObj('PfapiStoreDelegateService', [
      'getAllSyncModelDataFromStore',
    ]);
    mockPfapiService = {
      pf: {
        metaModel: {
          loadClientId: jasmine.createSpy('loadClientId').and.resolveTo('client-1'),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ConflictResolutionService,
        { provide: MatDialog, useValue: mockDialog },
        { provide: Store, useValue: mockStore },
        { provide: OperationApplierService, useValue: mockOperationApplier },
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: SnackService, useValue: mockSnackService },
        { provide: ValidateStateService, useValue: mockValidateStateService },
        { provide: RepairOperationService, useValue: mockRepairOperationService },
        { provide: PfapiStoreDelegateService, useValue: mockStoreDelegateService },
        { provide: PfapiService, useValue: mockPfapiService },
      ],
    });
    service = TestBed.inject(ConflictResolutionService);

    // Default mock behaviors
    mockOperationApplier.getFailedCount.and.returnValue(0);
    mockValidateStateService.validateAndRepair.and.returnValue({
      isValid: true,
      wasRepaired: false,
    });
    mockStoreDelegateService.getAllSyncModelDataFromStore.and.resolveTo({} as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('presentConflicts', () => {
    const conflicts: EntityConflict[] = [
      {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [createMockOp('local-1', 'local')],
        remoteOps: [createMockOp('remote-1', 'remote')],
        suggestedResolution: 'manual',
      },
    ];

    it('should validate state if dialog is cancelled', async () => {
      const mockDialogRef = {
        afterClosed: () => of(undefined),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);

      await service.presentConflicts(conflicts);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockValidateStateService.validateAndRepair).toHaveBeenCalled();
      expect(mockOpLogStore.append).not.toHaveBeenCalled();
    });

    it('should handle "local" resolution (keep local ops)', async () => {
      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'local']]),
            conflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);

      await service.presentConflicts(conflicts);

      expect(mockOpLogStore.append).not.toHaveBeenCalled();
      expect(mockOpLogStore.markRejected).not.toHaveBeenCalled();
      expect(mockValidateStateService.validateAndRepair).toHaveBeenCalled();
    });

    it('should handle "remote" resolution (apply remote ops, reject local)', async () => {
      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'remote']]),
            conflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(conflicts);

      // Verify remote op handling
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        conflicts[0].remoteOps[0],
        'remote',
        { pendingApply: true },
      );
      expect(mockOperationApplier.applyOperations).toHaveBeenCalledWith(
        conflicts[0].remoteOps,
      );
      expect(mockOpLogStore.markApplied).toHaveBeenCalledWith([100]);

      // Verify local op rejection
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);

      expect(mockValidateStateService.validateAndRepair).toHaveBeenCalled();
    });

    it('should handle partial failures during remote resolution', async () => {
      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'remote']]),
            conflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      // Simulate application failure
      mockOperationApplier.applyOperations.and.returnValue(Promise.resolve());
      mockOperationApplier.getFailedCount.and.returnValue(1);

      await service.presentConflicts(conflicts);

      expect(mockOpLogStore.append).toHaveBeenCalled();
      expect(mockOperationApplier.applyOperations).toHaveBeenCalled();

      // Should NOT mark as applied or reject local ops on failure
      expect(mockOpLogStore.markApplied).not.toHaveBeenCalled();
      expect(mockOpLogStore.markRejected).not.toHaveBeenCalled();

      expect(mockSnackService.open).toHaveBeenCalled();
      expect(mockValidateStateService.validateAndRepair).toHaveBeenCalled();
    });

    it('should repair state if validation finds issues', async () => {
      const mockDialogRef = {
        afterClosed: () => of(undefined),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);

      // Simulate repair needed
      mockValidateStateService.validateAndRepair.and.returnValue({
        isValid: false,
        wasRepaired: true,
        repairedState: { task: { ids: [] } } as any,
        repairSummary: { entityStateFixed: 1 } as any,
      });

      await service.presentConflicts(conflicts);

      expect(mockRepairOperationService.createRepairOperation).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });
});
