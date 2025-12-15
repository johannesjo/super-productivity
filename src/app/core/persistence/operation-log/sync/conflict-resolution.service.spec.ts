import { TestBed } from '@angular/core/testing';
import { ConflictResolutionService } from './conflict-resolution.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationApplierService } from '../processing/operation-applier.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { SnackService } from '../../../snack/snack.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { of, Subject } from 'rxjs';
import { EntityConflict, OpType, Operation } from '../operation.types';
import {
  ConflictResolutionResult,
  DialogConflictResolutionComponent,
} from '../../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';
import { UserInputWaitStateService } from '../../../../imex/sync/user-input-wait-state.service';
import { SyncSafetyBackupService } from '../../../../imex/sync/sync-safety-backup.service';

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockOperationApplier: jasmine.SpyObj<OperationApplierService>;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockValidateStateService: jasmine.SpyObj<ValidateStateService>;
  let mockUserInputWaitState: jasmine.SpyObj<UserInputWaitStateService>;
  let mockSyncSafetyBackupService: jasmine.SpyObj<SyncSafetyBackupService>;

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
    ]);
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'hasOp',
      'append',
      'markApplied',
      'markRejected',
      'markFailed',
      'getUnsyncedByEntity',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockValidateStateService = jasmine.createSpyObj('ValidateStateService', [
      'validateAndRepairCurrentState',
    ]);
    mockUserInputWaitState = jasmine.createSpyObj('UserInputWaitStateService', [
      'startWaiting',
    ]);
    // startWaiting returns a stop function
    mockUserInputWaitState.startWaiting.and.returnValue(() => {});

    mockSyncSafetyBackupService = jasmine.createSpyObj('SyncSafetyBackupService', [
      'createBackup',
    ]);
    mockSyncSafetyBackupService.createBackup.and.resolveTo(undefined);

    TestBed.configureTestingModule({
      providers: [
        ConflictResolutionService,
        { provide: MatDialog, useValue: mockDialog },
        { provide: OperationApplierService, useValue: mockOperationApplier },
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: SnackService, useValue: mockSnackService },
        { provide: ValidateStateService, useValue: mockValidateStateService },
        { provide: UserInputWaitStateService, useValue: mockUserInputWaitState },
        { provide: SyncSafetyBackupService, useValue: mockSyncSafetyBackupService },
      ],
    });
    service = TestBed.inject(ConflictResolutionService);

    // Default mock behaviors
    mockOperationApplier.applyOperations.and.resolveTo({ appliedOps: [] });
    mockValidateStateService.validateAndRepairCurrentState.and.resolveTo(true);
    mockOpLogStore.getUnsyncedByEntity.and.resolveTo(new Map());
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
      // Need to return the applied ops so markApplied can be called with correct seqs
      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: conflicts[0].remoteOps,
      });

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

    it('should reject all pending ops for affected entities when remote wins', async () => {
      // Scenario: TASK:task-1 has 3 pending ops, only first is in conflict
      const siblingOps = [
        createMockOp('sibling-1', 'local'),
        createMockOp('sibling-2', 'local'),
      ];

      const conflictsWithSiblings: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [createMockOp('local-1', 'local')],
          remoteOps: [createMockOp('remote-1', 'remote')],
          suggestedResolution: 'manual',
        },
      ];

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'remote']]),
            conflicts: conflictsWithSiblings,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      // Mock getUnsyncedByEntity to return sibling ops for TASK:task-1
      const unsyncedByEntity = new Map([['TASK:task-1', siblingOps]]);
      mockOpLogStore.getUnsyncedByEntity.and.resolveTo(unsyncedByEntity);

      await service.presentConflicts(conflictsWithSiblings);

      // Should reject direct conflict op AND sibling ops
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(
        jasmine.arrayContaining(['local-1', 'sibling-1', 'sibling-2']),
      );
    });

    it('should NOT reject sibling pending ops when local wins', async () => {
      // Scenario: User chooses local - sibling ops should remain pending
      const siblingOps = [
        createMockOp('sibling-1', 'local'),
        createMockOp('sibling-2', 'local'),
      ];

      const conflictsWithSiblings: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [createMockOp('local-1', 'local')],
          remoteOps: [createMockOp('remote-1', 'remote')],
          suggestedResolution: 'manual',
        },
      ];

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'local']]), // User chooses LOCAL
            conflicts: conflictsWithSiblings,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      // Mock getUnsyncedByEntity - should NOT be called when local wins
      const unsyncedByEntity = new Map([['TASK:task-1', siblingOps]]);
      mockOpLogStore.getUnsyncedByEntity.and.resolveTo(unsyncedByEntity);

      await service.presentConflicts(conflictsWithSiblings);

      // Should only reject the remote op, NOT sibling local ops
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-1']);
      // getUnsyncedByEntity should not be called when no local ops are rejected
      expect(mockOpLogStore.getUnsyncedByEntity).not.toHaveBeenCalled();
    });

    it('should only reject sibling ops for entities where remote won in mixed resolutions', async () => {
      // Scenario: Two conflicts - one resolved as remote, one as local
      // Sibling ops should only be rejected for the entity where remote won
      const task1SiblingOps = [createMockOp('task1-sibling', 'local')];
      const task2SiblingOps = [
        { ...createMockOp('task2-sibling', 'local'), entityId: 'task-2' },
      ];

      const mixedConflicts: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [createMockOp('local-1', 'local')],
          remoteOps: [createMockOp('remote-1', 'remote')],
          suggestedResolution: 'manual',
        },
        {
          entityType: 'TASK',
          entityId: 'task-2',
          localOps: [{ ...createMockOp('local-2', 'local'), entityId: 'task-2' }],
          remoteOps: [{ ...createMockOp('remote-2', 'remote'), entityId: 'task-2' }],
          suggestedResolution: 'manual',
        },
      ];

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([
              [0, 'remote'], // task-1: remote wins
              [1, 'local'], // task-2: local wins
            ]),
            conflicts: mixedConflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      // Mock getUnsyncedByEntity with sibling ops for both entities
      const unsyncedByEntity = new Map([
        ['TASK:task-1', task1SiblingOps],
        ['TASK:task-2', task2SiblingOps],
      ]);
      mockOpLogStore.getUnsyncedByEntity.and.resolveTo(unsyncedByEntity);

      await service.presentConflicts(mixedConflicts);

      // Should reject:
      // - local-1 (direct conflict, remote won)
      // - task1-sibling (sibling of entity where remote won)
      // - remote-2 (direct conflict, local won)
      // Should NOT reject task2-sibling (local won for task-2)
      const rejectedCalls = mockOpLogStore.markRejected.calls.allArgs();
      const allRejectedIds = rejectedCalls.flat().flat();

      expect(allRejectedIds).toContain('local-1');
      expect(allRejectedIds).toContain('task1-sibling');
      expect(allRejectedIds).toContain('remote-2');
      expect(allRejectedIds).not.toContain('task2-sibling');
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

      // Simulate application failure by returning result with failedOp
      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: [],
        failedOp: {
          op: conflicts[0].remoteOps[0],
          error: new Error('Simulated dependency failure'),
        },
      });

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

    it('should handle large conflict set (100+ operations on same entity)', async () => {
      // Scenario: Stress test with many concurrent operations on the same task
      // This tests that the conflict resolution system can handle large batches
      const numLocalOps = 50;
      const numRemoteOps = 50;

      const localOps: Operation[] = [];
      const remoteOps: Operation[] = [];

      // Create many local operations
      for (let i = 0; i < numLocalOps; i++) {
        localOps.push({
          ...createMockOp(`local-${i}`, 'local'),
          entityId: 'task-stress',
          timestamp: Date.now() + i,
          vectorClock: { local: i + 1 },
        });
      }

      // Create many remote operations
      for (let i = 0; i < numRemoteOps; i++) {
        remoteOps.push({
          ...createMockOp(`remote-${i}`, 'remote'),
          entityId: 'task-stress',
          timestamp: Date.now() + i,
          vectorClock: { remote: i + 1 },
        });
      }

      const largeConflict: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-stress',
          localOps,
          remoteOps,
          suggestedResolution: 'manual',
        },
      ];

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'remote']]), // User chooses remote
            conflicts: largeConflict,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      const startTime = Date.now();
      await service.presentConflicts(largeConflict);
      const duration = Date.now() - startTime;

      // Verify all remote ops were stored
      expect(mockOpLogStore.append).toHaveBeenCalledTimes(numRemoteOps);

      // Verify all remote ops were applied
      expect(mockOperationApplier.applyOperations).toHaveBeenCalledTimes(1);
      const appliedOps = mockOperationApplier.applyOperations.calls.mostRecent()
        .args[0] as Operation[];
      expect(appliedOps.length).toBe(numRemoteOps);

      // Verify all local ops were rejected
      const rejectedCalls = mockOpLogStore.markRejected.calls.allArgs();
      const allRejectedIds = rejectedCalls.flat().flat();
      expect(allRejectedIds.length).toBeGreaterThanOrEqual(numLocalOps);
      for (let i = 0; i < numLocalOps; i++) {
        expect(allRejectedIds).toContain(`local-${i}`);
      }

      // Performance check: should complete in reasonable time (<5 seconds)
      expect(duration).toBeLessThan(5000);

      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
    });

    it('should handle multiple entities with many conflicts each', async () => {
      // Scenario: 10 entities, each with 10 conflicting operations
      const numEntities = 10;
      const opsPerEntity = 10;
      const multiEntityConflicts: EntityConflict[] = [];

      for (let e = 0; e < numEntities; e++) {
        const localOps: Operation[] = [];
        const remoteOps: Operation[] = [];

        for (let i = 0; i < opsPerEntity; i++) {
          localOps.push({
            ...createMockOp(`local-${e}-${i}`, 'local'),
            entityId: `task-${e}`,
          });
          remoteOps.push({
            ...createMockOp(`remote-${e}-${i}`, 'remote'),
            entityId: `task-${e}`,
          });
        }

        multiEntityConflicts.push({
          entityType: 'TASK',
          entityId: `task-${e}`,
          localOps,
          remoteOps,
          suggestedResolution: 'manual',
        });
      }

      // Alternate resolutions: even entities use remote, odd use local
      const resolutions = new Map<number, 'local' | 'remote'>();
      for (let i = 0; i < numEntities; i++) {
        resolutions.set(i, i % 2 === 0 ? 'remote' : 'local');
      }

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions,
            conflicts: multiEntityConflicts,
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(multiEntityConflicts);

      // Verify operations were processed
      expect(mockDialog.open).toHaveBeenCalledTimes(1);

      // Remote-winning entities (0, 2, 4, 6, 8) = 5 entities * 10 ops = 50 remote ops applied
      // Local-winning entities (1, 3, 5, 7, 9) = 5 entities * 10 ops = 50 remote ops rejected
      expect(mockOperationApplier.applyOperations).toHaveBeenCalled();

      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
    });
  });

  describe('dialog timeout', () => {
    /**
     * Tests for the conflict dialog timeout feature.
     * The dialog auto-cancels after CONFLICT_DIALOG_TIMEOUT_MS to prevent
     * sync from being blocked indefinitely if user walks away.
     */

    // Use constant to avoid linter complaints about mixed operators
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    // Sample conflicts for timeout tests
    const localOps = [createMockOp('local-1', 'client-1')];
    const remoteOps = [createMockOp('remote-1', 'client-2')];
    const conflicts: EntityConflict[] = [
      {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps,
        remoteOps,
        suggestedResolution: 'manual',
      },
    ];

    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should auto-cancel dialog after timeout', async () => {
      // Use Subject to control when the dialog closes
      const afterClosed$ = new Subject<ConflictResolutionResult | undefined>();

      const mockDialogRef = {
        afterClosed: () => afterClosed$.asObservable(),
        close: jasmine.createSpy('close').and.callFake(() => {
          // Simulate dialog close by emitting undefined
          afterClosed$.next(undefined);
          afterClosed$.complete();
        }),
      } as unknown as MatDialogRef<DialogConflictResolutionComponent>;

      mockDialog.open.and.returnValue(mockDialogRef);

      // Start the presentConflicts call
      const presentPromise = service.presentConflicts(conflicts);

      // Allow microtasks (async operations like createBackup()) to complete
      // before advancing the fake clock. This ensures setTimeout is registered.
      await Promise.resolve();
      await Promise.resolve();

      // Advance time past the timeout
      jasmine.clock().tick(FIVE_MINUTES_MS + 100);

      // Wait for the method to complete
      await presentPromise;

      // Verify dialog was closed
      expect(mockDialogRef.close).toHaveBeenCalledWith(undefined);

      // Verify snack was shown
      expect(mockSnackService.open).toHaveBeenCalledWith({
        type: 'ERROR',
        msg: jasmine.any(String),
      });

      // Verify no operations were applied (cancelled)
      expect(mockOpLogStore.append).not.toHaveBeenCalled();
      expect(mockOperationApplier.applyOperations).not.toHaveBeenCalled();
    });

    it('should clear timeout when dialog closes normally', async () => {
      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'local']]),
            conflicts,
          }),
        close: jasmine.createSpy('close'),
      } as unknown as MatDialogRef<DialogConflictResolutionComponent>;

      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(conflicts);

      // Advance time past the timeout (after dialog already closed)
      jasmine.clock().tick(FIVE_MINUTES_MS + 100);

      // Dialog.close should NOT have been called by the timeout (only if it was called at all)
      // The key test is that no extra snack warning was shown
      // Actually we check that snack was NOT called with ERROR type for timeout
      expect(mockSnackService.open).not.toHaveBeenCalledWith({
        type: 'ERROR',
        msg: jasmine.stringMatching(/timeout/i),
      });
    });

    it('should not apply any operations when dialog times out', async () => {
      // Use Subject to control when the dialog closes
      const afterClosed$ = new Subject<ConflictResolutionResult | undefined>();

      const mockDialogRef = {
        afterClosed: () => afterClosed$.asObservable(),
        close: jasmine.createSpy('close').and.callFake(() => {
          afterClosed$.next(undefined);
          afterClosed$.complete();
        }),
      } as unknown as MatDialogRef<DialogConflictResolutionComponent>;

      mockDialog.open.and.returnValue(mockDialogRef);

      const presentPromise = service.presentConflicts(conflicts);

      // Allow microtasks (async operations like createBackup()) to complete
      // before advancing the fake clock. This ensures setTimeout is registered.
      await Promise.resolve();
      await Promise.resolve();

      // Advance time past timeout
      jasmine.clock().tick(FIVE_MINUTES_MS + 100);

      await presentPromise;

      // No operations should be stored or applied
      expect(mockOpLogStore.append).not.toHaveBeenCalled();
      expect(mockOpLogStore.markApplied).not.toHaveBeenCalled();
      expect(mockOpLogStore.markRejected).not.toHaveBeenCalled();
      expect(mockOperationApplier.applyOperations).not.toHaveBeenCalled();
    });
  });
});
