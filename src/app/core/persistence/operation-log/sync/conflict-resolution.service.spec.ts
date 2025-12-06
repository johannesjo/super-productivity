import { TestBed } from '@angular/core/testing';
import { ConflictResolutionService } from './conflict-resolution.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationApplierService } from '../processing/operation-applier.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { SnackService } from '../../../snack/snack.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { of } from 'rxjs';
import { EntityConflict, OpType, Operation } from '../operation.types';
import { DialogConflictResolutionComponent } from '../../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockOperationApplier: jasmine.SpyObj<OperationApplierService>;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockValidateStateService: jasmine.SpyObj<ValidateStateService>;

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
      'markFailed',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockValidateStateService = jasmine.createSpyObj('ValidateStateService', [
      'validateAndRepairCurrentState',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ConflictResolutionService,
        { provide: MatDialog, useValue: mockDialog },
        { provide: OperationApplierService, useValue: mockOperationApplier },
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: SnackService, useValue: mockSnackService },
        { provide: ValidateStateService, useValue: mockValidateStateService },
      ],
    });
    service = TestBed.inject(ConflictResolutionService);

    // Default mock behaviors
    mockOperationApplier.getFailedCount.and.returnValue(0);
    mockValidateStateService.validateAndRepairCurrentState.and.resolveTo(true);
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

    it('should not apply ops if dialog is cancelled', async () => {
      const mockDialogRef = {
        afterClosed: () => of(undefined),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);

      await service.presentConflicts(conflicts);

      expect(mockDialog.open).toHaveBeenCalled();
      // When cancelled, no operations should be applied or validated
      expect(mockOpLogStore.append).not.toHaveBeenCalled();
      expect(
        mockValidateStateService.validateAndRepairCurrentState,
      ).not.toHaveBeenCalled();
    });

    it('should handle "local" resolution (keep local ops, reject remote)', async () => {
      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'local']]),
            conflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(conflicts);

      // Remote ops should be stored and marked rejected when keeping local
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        conflicts[0].remoteOps[0],
        'remote',
      );
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-1']);
      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
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

      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
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

      // Should NOT mark as applied on failure
      expect(mockOpLogStore.markApplied).not.toHaveBeenCalled();

      // SHOULD mark failed REMOTE ops as failed for retry (not rejected)
      // They can be retried on next startup, and rejected after MAX_CONFLICT_RETRY_ATTEMPTS
      expect(mockOpLogStore.markFailed).toHaveBeenCalledWith(['remote-1'], 5);

      expect(mockSnackService.open).toHaveBeenCalled();
      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
    });

    it('should call validateAndRepairCurrentState after resolution', async () => {
      // Must provide a resolution (not cancel) for validation to run
      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'local']]),
            conflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(conflicts);

      // The new method handles validation and repair internally
      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalledWith(
        'conflict-resolution',
      );
    });

    it('should apply non-conflicting ops together with resolved conflict ops in single batch', async () => {
      // Scenario: Task create (non-conflicting) depends on Project create (resolved from conflict)
      // Both should be applied together so dependency sorting works
      const projectConflict: EntityConflict[] = [
        {
          entityType: 'PROJECT',
          entityId: 'proj-1',
          localOps: [createMockOp('local-proj-1', 'local')],
          remoteOps: [
            {
              ...createMockOp('remote-proj-1', 'remote'),
              entityType: 'PROJECT',
              entityId: 'proj-1',
              opType: OpType.Create,
            },
          ],
          suggestedResolution: 'manual',
        },
      ];

      const taskOp: Operation = {
        ...createMockOp('remote-task-1', 'remote'),
        entityType: 'TASK',
        entityId: 'task-1',
        opType: OpType.Create,
        payload: { projectId: 'proj-1' }, // Depends on the project in conflict
      };

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'remote']]), // User chooses remote (create project)
            conflicts: projectConflict,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(projectConflict, [taskOp]);

      // Both the conflict op (project create) and non-conflicting op (task create)
      // should be applied in a single call so dependency sorting works
      expect(mockOperationApplier.applyOperations).toHaveBeenCalledTimes(1);
      const appliedOps = mockOperationApplier.applyOperations.calls.mostRecent()
        .args[0] as Operation[];
      expect(appliedOps.length).toBe(2);
      expect(appliedOps.map((o) => o.id).sort()).toEqual(
        ['remote-proj-1', 'remote-task-1'].sort(),
      );
    });
  });
});
