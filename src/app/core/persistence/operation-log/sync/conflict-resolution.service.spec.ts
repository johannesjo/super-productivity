import { TestBed } from '@angular/core/testing';
import { ConflictResolutionService } from './conflict-resolution.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
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
  let mockStore: jasmine.SpyObj<Store>;
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
    // Use different payloads for different clients to avoid auto-resolution as identical
    payload: { source: clientId },
    vectorClock: { [clientId]: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
  });

  beforeEach(() => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockStore = jasmine.createSpyObj('Store', ['select']);
    // Default: select returns of(undefined) - can be overridden in specific tests
    mockStore.select.and.returnValue(of(undefined));

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
      'filterNewOps',
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
        { provide: Store, useValue: mockStore },
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
    // By default, treat all ops as new (return them as-is)
    mockOpLogStore.filterNewOps.and.callFake((ops: any[]) => Promise.resolve(ops));
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

  describe('isIdenticalConflict', () => {
    it('should detect identical conflict when both sides DELETE', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
        remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(true);
    });

    it('should detect identical conflict when both sides have same UPDATE payload', () => {
      const payload = { title: 'Same Title', notes: 'Same Notes' };
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          { ...createMockOp('local-1', 'local'), opType: OpType.Update, payload },
        ],
        remoteOps: [
          { ...createMockOp('remote-1', 'remote'), opType: OpType.Update, payload },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(true);
    });

    it('should NOT detect identical conflict when payloads differ', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          {
            ...createMockOp('local-1', 'local'),
            opType: OpType.Update,
            payload: { title: 'Local Title' },
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-1', 'remote'),
            opType: OpType.Update,
            payload: { title: 'Remote Title' },
          },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(false);
    });

    it('should NOT detect identical conflict when opTypes differ', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Update }],
        remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(false);
    });

    it('should NOT detect identical conflict when multiple ops with different counts', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          { ...createMockOp('local-1', 'local'), opType: OpType.Update },
          { ...createMockOp('local-2', 'local'), opType: OpType.Update },
        ],
        remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Update }],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(false);
    });

    it('should detect identical conflict with multiple DELETE ops on both sides', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          { ...createMockOp('local-1', 'local'), opType: OpType.Delete },
          { ...createMockOp('local-2', 'local'), opType: OpType.Delete },
        ],
        remoteOps: [
          { ...createMockOp('remote-1', 'remote'), opType: OpType.Delete },
          { ...createMockOp('remote-2', 'remote'), opType: OpType.Delete },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(true);
    });

    it('should handle nested object payloads correctly', () => {
      const payload = {
        title: 'Test',
        nested: { deep: { value: 123 }, array: [1, 2, 3] },
      };
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          { ...createMockOp('local-1', 'local'), opType: OpType.Update, payload },
        ],
        remoteOps: [
          { ...createMockOp('remote-1', 'remote'), opType: OpType.Update, payload },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(true);
    });

    it('should return false for empty ops', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [],
        remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(false);
    });
  });

  describe('auto-resolve identical conflicts', () => {
    it('should auto-resolve identical DELETE conflict without showing dialog', async () => {
      const identicalConflict: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
          remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
          suggestedResolution: 'manual',
        },
      ];

      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(identicalConflict);

      // Dialog should NOT be opened for identical conflicts
      expect(mockDialog.open).not.toHaveBeenCalled();

      // Remote ops should be applied (remote wins for identical conflicts)
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        identicalConflict[0].remoteOps[0],
        'remote',
        { pendingApply: true },
      );

      // Local ops should be rejected
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);

      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
    });

    it('should show dialog only for non-identical conflicts in mixed set', async () => {
      const identicalConflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
        remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
        suggestedResolution: 'manual',
      };

      const realConflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-2',
        localOps: [
          {
            ...createMockOp('local-2', 'local'),
            entityId: 'task-2',
            opType: OpType.Update,
            payload: { title: 'Local' },
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-2', 'remote'),
            entityId: 'task-2',
            opType: OpType.Update,
            payload: { title: 'Remote' },
          },
        ],
        suggestedResolution: 'manual',
      };

      const mockDialogRef = {
        afterClosed: () =>
          of({
            resolutions: new Map([[0, 'remote']]),
            conflicts: [realConflict],
          }),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts([identicalConflict, realConflict]);

      // Dialog should be opened with ONLY the non-identical conflict
      expect(mockDialog.open).toHaveBeenCalledTimes(1);
      const dialogData = mockDialog.open.calls.mostRecent().args[1]?.data as {
        conflicts: EntityConflict[];
      };
      expect(dialogData.conflicts.length).toBe(1);
      expect(dialogData.conflicts[0].entityId).toBe('task-2');

      // Both identical and user-resolved conflicts should be processed
      // Remote ops from both should be applied
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        identicalConflict.remoteOps[0],
        'remote',
        { pendingApply: true },
      );
    });

    it('should reject stale ops for entities in auto-resolved identical conflicts', async () => {
      const siblingOp = { ...createMockOp('sibling-1', 'local'), entityId: 'task-1' };

      const identicalConflict: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
          remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
          suggestedResolution: 'manual',
        },
      ];

      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);
      mockOpLogStore.getUnsyncedByEntity.and.resolveTo(
        new Map([['TASK:task-1', [siblingOp]]]),
      );

      await service.presentConflicts(identicalConflict);

      // Sibling ops should also be rejected
      const rejectedCalls = mockOpLogStore.markRejected.calls.allArgs();
      const allRejectedIds = rejectedCalls.flat().flat();
      expect(allRejectedIds).toContain('local-1');
      expect(allRejectedIds).toContain('sibling-1');
    });

    it('should auto-resolve identical CREATE conflict without dialog', async () => {
      const payload = { title: 'New Task', notes: '' };
      const identicalConflict: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [
            { ...createMockOp('local-1', 'local'), opType: OpType.Create, payload },
          ],
          remoteOps: [
            { ...createMockOp('remote-1', 'remote'), opType: OpType.Create, payload },
          ],
          suggestedResolution: 'manual',
        },
      ];

      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(identicalConflict);

      // Dialog should NOT be opened
      expect(mockDialog.open).not.toHaveBeenCalled();

      // Remote ops should be applied
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'remote-1', opType: OpType.Create }),
        'remote',
        { pendingApply: true },
      );
    });

    it('should auto-resolve multiple identical conflicts without showing dialog', async () => {
      const identicalConflicts: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
          remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
          suggestedResolution: 'manual',
        },
        {
          entityType: 'TASK',
          entityId: 'task-2',
          localOps: [
            {
              ...createMockOp('local-2', 'local'),
              entityId: 'task-2',
              opType: OpType.Delete,
            },
          ],
          remoteOps: [
            {
              ...createMockOp('remote-2', 'remote'),
              entityId: 'task-2',
              opType: OpType.Delete,
            },
          ],
          suggestedResolution: 'manual',
        },
      ];

      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(identicalConflicts);

      // Dialog should NOT be opened for any of them
      expect(mockDialog.open).not.toHaveBeenCalled();

      // Both remote ops should be stored
      expect(mockOpLogStore.append).toHaveBeenCalledTimes(2);

      // Both local ops should be rejected
      expect(mockOpLogStore.markRejected).toHaveBeenCalled();
      const rejectedIds = mockOpLogStore.markRejected.calls.allArgs().flat().flat();
      expect(rejectedIds).toContain('local-1');
      expect(rejectedIds).toContain('local-2');
    });

    it('should apply operations for auto-resolved identical conflicts', async () => {
      const identicalConflict: EntityConflict[] = [
        {
          entityType: 'TASK',
          entityId: 'task-1',
          localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
          remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
          suggestedResolution: 'manual',
        },
      ];

      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts(identicalConflict);

      // Operations should be applied (not just stored)
      expect(mockOperationApplier.applyOperations).toHaveBeenCalled();
      const appliedOps = mockOperationApplier.applyOperations.calls.mostRecent().args[0];
      expect(appliedOps.length).toBe(1);
      expect(appliedOps[0].id).toBe('remote-1');
    });

    it('should process identical conflicts even when dialog is cancelled for real conflicts', async () => {
      const identicalConflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [{ ...createMockOp('local-1', 'local'), opType: OpType.Delete }],
        remoteOps: [{ ...createMockOp('remote-1', 'remote'), opType: OpType.Delete }],
        suggestedResolution: 'manual',
      };

      const realConflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-2',
        localOps: [
          {
            ...createMockOp('local-2', 'local'),
            entityId: 'task-2',
            payload: { title: 'Local' },
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-2', 'remote'),
            entityId: 'task-2',
            payload: { title: 'Remote' },
          },
        ],
        suggestedResolution: 'manual',
      };

      // User cancels the dialog
      const mockDialogRef = {
        afterClosed: () => of(undefined),
      } as MatDialogRef<DialogConflictResolutionComponent>;
      mockDialog.open.and.returnValue(mockDialogRef);
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.resolveTo(100);

      await service.presentConflicts([identicalConflict, realConflict]);

      // Dialog was opened for the real conflict
      expect(mockDialog.open).toHaveBeenCalledTimes(1);

      // Since dialog was cancelled, nothing should be processed
      // (including the identical conflicts that were prepared but not applied)
      expect(mockOperationApplier.applyOperations).not.toHaveBeenCalled();
    });
  });

  describe('isIdenticalConflict edge cases', () => {
    it('should NOT detect arrays with different order as identical', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          {
            ...createMockOp('local-1', 'local'),
            opType: OpType.Update,
            payload: { tagIds: ['a', 'b', 'c'] },
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-1', 'remote'),
            opType: OpType.Update,
            payload: { tagIds: ['c', 'b', 'a'] },
          },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(false);
    });

    it('should handle null payload values correctly', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          {
            ...createMockOp('local-1', 'local'),
            opType: OpType.Update,
            payload: { notes: null },
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-1', 'remote'),
            opType: OpType.Update,
            payload: { notes: null },
          },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(true);
    });

    it('should NOT treat null and undefined as identical', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          {
            ...createMockOp('local-1', 'local'),
            opType: OpType.Update,
            payload: { notes: null },
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-1', 'remote'),
            opType: OpType.Update,
            payload: { notes: undefined },
          },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(false);
    });

    it('should handle empty objects as identical', () => {
      const conflict: EntityConflict = {
        entityType: 'TASK',
        entityId: 'task-1',
        localOps: [
          {
            ...createMockOp('local-1', 'local'),
            opType: OpType.Update,
            payload: {},
          },
        ],
        remoteOps: [
          {
            ...createMockOp('remote-1', 'remote'),
            opType: OpType.Update,
            payload: {},
          },
        ],
        suggestedResolution: 'manual',
      };

      expect(service.isIdenticalConflict(conflict)).toBe(true);
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

  describe('autoResolveConflictsLWW', () => {
    // Helper to create ops with specific timestamps
    const createOpWithTimestamp = (
      id: string,
      clientId: string,
      timestamp: number,
      opType: OpType = OpType.Update,
      entityId: string = 'task-1',
    ): Operation => ({
      id,
      clientId,
      actionType: 'test',
      opType,
      entityType: 'TASK',
      entityId,
      payload: { source: clientId, timestamp },
      vectorClock: { [clientId]: 1 },
      timestamp,
      schemaVersion: 1,
    });

    // Helper to create conflict with suggestedResolution
    const createConflict = (
      entityId: string,
      localOps: Operation[],
      remoteOps: Operation[],
    ): EntityConflict => ({
      entityType: 'TASK',
      entityId,
      localOps,
      remoteOps,
      suggestedResolution: 'manual', // LWW will override this
    });

    beforeEach(() => {
      // Default mock behaviors for LWW tests
      mockOpLogStore.hasOp.and.resolveTo(false);
      mockOpLogStore.append.and.callFake((op: Operation) => Promise.resolve(1));
      mockOpLogStore.markApplied.and.resolveTo(undefined);
      mockOpLogStore.markRejected.and.resolveTo(undefined);
      mockOperationApplier.applyOperations.and.resolveTo({ appliedOps: [] });
    });

    it('should auto-resolve conflict as remote when remote timestamp is newer', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now - 1000)],
          [createOpWithTimestamp('remote-1', 'client-b', now)],
        ),
      ];

      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: conflicts[0].remoteOps,
      });

      await service.autoResolveConflictsLWW(conflicts);

      // Remote ops should be appended
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'remote-1' }),
        'remote',
        jasmine.any(Object),
      );
      // Local ops should be rejected
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);
      // Snack should be shown
      expect(mockSnackService.open).toHaveBeenCalled();
    });

    it('should auto-resolve conflict as local when local timestamp is newer', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now)],
          [createOpWithTimestamp('remote-1', 'client-b', now - 1000)],
        ),
      ];

      await service.autoResolveConflictsLWW(conflicts);

      // Both local and remote ops should be rejected
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);
      // Remote ops need to be appended first, then rejected
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'remote-1' }),
        'remote',
      );
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-1']);
      // Snack should show local wins
      expect(mockSnackService.open).toHaveBeenCalled();
    });

    it('should auto-resolve as remote when timestamps are equal (tie-breaker)', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now)],
          [createOpWithTimestamp('remote-1', 'client-b', now)],
        ),
      ];

      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: conflicts[0].remoteOps,
      });

      await service.autoResolveConflictsLWW(conflicts);

      // Remote wins on tie - should apply remote ops
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'remote-1' }),
        'remote',
        jasmine.any(Object),
      );
      // Local ops should be rejected
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);
    });

    it('should handle multiple conflicts in single batch', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [
            createOpWithTimestamp(
              'local-1',
              'client-a',
              now - 1000,
              OpType.Update,
              'task-1',
            ),
          ],
          [createOpWithTimestamp('remote-1', 'client-b', now, OpType.Update, 'task-1')],
        ),
        createConflict(
          'task-2',
          [createOpWithTimestamp('local-2', 'client-a', now, OpType.Update, 'task-2')],
          [
            createOpWithTimestamp(
              'remote-2',
              'client-b',
              now - 1000,
              OpType.Update,
              'task-2',
            ),
          ],
        ),
      ];

      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: [conflicts[0].remoteOps[0]],
      });

      await service.autoResolveConflictsLWW(conflicts);

      // First conflict: remote wins (newer timestamp)
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'remote-1' }),
        'remote',
        jasmine.any(Object),
      );

      // Second conflict: local wins (newer timestamp)
      // Remote op should be appended then rejected
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'remote-2' }),
        'remote',
      );

      // Snack notification should reflect both outcomes
      expect(mockSnackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          translateParams: {
            localWins: 1,
            remoteWins: 1,
          },
        }),
      );
    });

    it('should piggyback non-conflicting ops with conflict resolution', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now - 1000)],
          [createOpWithTimestamp('remote-1', 'client-b', now)],
        ),
      ];
      const nonConflicting = [
        createOpWithTimestamp('non-conflict-1', 'client-b', now, OpType.Update, 'task-2'),
      ];

      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: [...conflicts[0].remoteOps, ...nonConflicting],
      });

      await service.autoResolveConflictsLWW(conflicts, nonConflicting);

      // Non-conflicting op should also be appended
      expect(mockOpLogStore.append).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'non-conflict-1' }),
        'remote',
        jasmine.any(Object),
      );
    });

    it('should create safety backup before resolution', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now - 1000)],
          [createOpWithTimestamp('remote-1', 'client-b', now)],
        ),
      ];

      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: conflicts[0].remoteOps,
      });

      await service.autoResolveConflictsLWW(conflicts);

      expect(mockSyncSafetyBackupService.createBackup).toHaveBeenCalled();
    });

    it('should continue even if backup creation fails', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now - 1000)],
          [createOpWithTimestamp('remote-1', 'client-b', now)],
        ),
      ];

      mockSyncSafetyBackupService.createBackup.and.rejectWith(new Error('Backup failed'));
      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: conflicts[0].remoteOps,
      });

      // Should not throw
      await expectAsync(service.autoResolveConflictsLWW(conflicts)).toBeResolved();

      // Error snack should be shown for backup failure
      expect(mockSnackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'ERROR',
        }),
      );
    });

    it('should return early if no conflicts and no non-conflicting ops', async () => {
      await service.autoResolveConflictsLWW([]);

      expect(mockOpLogStore.append).not.toHaveBeenCalled();
      expect(mockSnackService.open).not.toHaveBeenCalled();
    });

    it('should validate state after resolution', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          [createOpWithTimestamp('local-1', 'client-a', now - 1000)],
          [createOpWithTimestamp('remote-1', 'client-b', now)],
        ),
      ];

      mockOperationApplier.applyOperations.and.resolveTo({
        appliedOps: conflicts[0].remoteOps,
      });

      await service.autoResolveConflictsLWW(conflicts);

      expect(mockValidateStateService.validateAndRepairCurrentState).toHaveBeenCalled();
    });

    it('should use max timestamp when multiple ops exist on one side', async () => {
      const now = Date.now();
      const conflicts: EntityConflict[] = [
        createConflict(
          'task-1',
          // Local has older first op but newer second op
          [
            createOpWithTimestamp('local-1', 'client-a', now - 2000),
            createOpWithTimestamp('local-2', 'client-a', now),
          ],
          // Remote has one op in between
          [createOpWithTimestamp('remote-1', 'client-b', now - 1000)],
        ),
      ];

      await service.autoResolveConflictsLWW(conflicts);

      // Local wins because max(local timestamps) > max(remote timestamps)
      // Both local ops should be rejected (old ones replaced by new update op)
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1', 'local-2']);
      // Remote ops should be appended then rejected
      expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-1']);
    });

    describe('edge cases', () => {
      it('should handle conflict with empty localOps array gracefully', async () => {
        // Edge case: conflict struct with empty localOps (shouldn't happen but defensive)
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'TASK',
            entityId: 'task-1',
            localOps: [], // Empty!
            remoteOps: [createOpWithTimestamp('remote-1', 'client-b', now)],
            suggestedResolution: 'manual',
          },
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        // Math.max() with empty array returns -Infinity, so remote should always win
        await expectAsync(service.autoResolveConflictsLWW(conflicts)).toBeResolved();

        // Remote should win (any timestamp > -Infinity)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-1' }),
          'remote',
          jasmine.any(Object),
        );
      });

      it('should handle conflict with empty remoteOps array gracefully', async () => {
        // Edge case: conflict struct with empty remoteOps (shouldn't happen but defensive)
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'TASK',
            entityId: 'task-1',
            localOps: [createOpWithTimestamp('local-1', 'client-a', now)],
            remoteOps: [], // Empty!
            suggestedResolution: 'manual',
          },
        ];

        // Math.max() with empty array returns -Infinity, so local should always win
        await expectAsync(service.autoResolveConflictsLWW(conflicts)).toBeResolved();

        // Local wins (any timestamp > -Infinity)
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);
        // No remote ops to append
      });

      it('should resolve DELETE vs UPDATE conflict using LWW when DELETE is newer', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          createConflict(
            'task-1',
            [
              {
                ...createOpWithTimestamp('local-del', 'client-a', now),
                opType: OpType.Delete,
              },
            ],
            [
              {
                ...createOpWithTimestamp('remote-upd', 'client-b', now - 1000),
                opType: OpType.Update,
              },
            ],
          ),
        ];

        await service.autoResolveConflictsLWW(conflicts);

        // Local DELETE wins (newer timestamp)
        // Both ops should be rejected, local state (deleted) is preserved
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-del']);
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-upd']);
      });

      it('should resolve UPDATE vs DELETE conflict using LWW when UPDATE is newer', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          createConflict(
            'task-1',
            [
              {
                ...createOpWithTimestamp('local-upd', 'client-a', now),
                opType: OpType.Update,
              },
            ],
            [
              {
                ...createOpWithTimestamp('remote-del', 'client-b', now - 1000),
                opType: OpType.Delete,
              },
            ],
          ),
        ];

        await service.autoResolveConflictsLWW(conflicts);

        // Local UPDATE wins (newer timestamp)
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-upd']);
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-del']);
      });

      it('should resolve DELETE vs UPDATE conflict when DELETE is older (remote UPDATE wins)', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          createConflict(
            'task-1',
            [
              {
                ...createOpWithTimestamp('local-del', 'client-a', now - 1000),
                opType: OpType.Delete,
              },
            ],
            [
              {
                ...createOpWithTimestamp('remote-upd', 'client-b', now),
                opType: OpType.Update,
              },
            ],
          ),
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Remote UPDATE wins (newer timestamp) - entity should be restored
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-upd', opType: OpType.Update }),
          'remote',
          jasmine.any(Object),
        );
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-del']);
      });

      it('should handle CREATE vs CREATE conflict using LWW', async () => {
        // Two clients create entity with same ID (rare but possible)
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          createConflict(
            'task-same-id',
            [
              {
                ...createOpWithTimestamp('local-create', 'client-a', now - 1000),
                opType: OpType.Create,
                entityId: 'task-same-id',
                payload: { title: 'Local Version' },
              },
            ],
            [
              {
                ...createOpWithTimestamp('remote-create', 'client-b', now),
                opType: OpType.Create,
                entityId: 'task-same-id',
                payload: { title: 'Remote Version' },
              },
            ],
          ),
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Remote CREATE wins (newer timestamp)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-create', opType: OpType.Create }),
          'remote',
          jasmine.any(Object),
        );
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-create']);
      });

      it('should handle MOV (Move) operation conflicts using LWW', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'TASK',
            entityId: 'task-1',
            localOps: [
              {
                ...createOpWithTimestamp('local-mov', 'client-a', now),
                opType: OpType.Move,
                payload: { fromIndex: 0, toIndex: 5 },
              },
            ],
            remoteOps: [
              {
                ...createOpWithTimestamp('remote-mov', 'client-b', now - 1000),
                opType: OpType.Move,
                payload: { fromIndex: 0, toIndex: 10 },
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        await service.autoResolveConflictsLWW(conflicts);

        // Local MOV wins (newer timestamp)
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-mov']);
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-mov']);
      });

      it('should handle BATCH operation conflicts using LWW', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'TASK',
            entityId: 'task-1',
            localOps: [
              {
                ...createOpWithTimestamp('local-batch', 'client-a', now - 1000),
                opType: OpType.Batch,
                entityIds: ['task-1', 'task-2', 'task-3'],
                payload: { changes: [{ done: true }] },
              },
            ],
            remoteOps: [
              {
                ...createOpWithTimestamp('remote-batch', 'client-b', now),
                opType: OpType.Batch,
                entityIds: ['task-1', 'task-2'],
                payload: { changes: [{ done: false }] },
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Remote BATCH wins (newer timestamp)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-batch', opType: OpType.Batch }),
          'remote',
          jasmine.any(Object),
        );
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-batch']);
      });

      it('should handle singleton entity (GLOBAL_CONFIG) conflicts', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'GLOBAL_CONFIG',
            entityId: 'GLOBAL_CONFIG', // Singleton ID
            localOps: [
              {
                id: 'local-config',
                clientId: 'clientA',
                actionType: 'updateGlobalConfig',
                opType: OpType.Update,
                entityType: 'GLOBAL_CONFIG',
                entityId: 'GLOBAL_CONFIG',
                payload: { theme: 'dark' },
                vectorClock: { clientA: 1 },
                timestamp: now,
                schemaVersion: 1,
              },
            ],
            remoteOps: [
              {
                id: 'remote-config',
                clientId: 'clientB',
                actionType: 'updateGlobalConfig',
                opType: OpType.Update,
                entityType: 'GLOBAL_CONFIG',
                entityId: 'GLOBAL_CONFIG',
                payload: { theme: 'light' },
                vectorClock: { clientB: 1 },
                timestamp: now - 1000,
                schemaVersion: 1,
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        await service.autoResolveConflictsLWW(conflicts);

        // Local wins (newer timestamp)
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-config']);
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-config']);
      });

      it('should handle PLANNER entity conflicts', async () => {
        const now = Date.now();
        const dayId = '2024-01-15';
        const conflicts: EntityConflict[] = [
          {
            entityType: 'PLANNER',
            entityId: dayId,
            localOps: [
              {
                id: 'local-planner',
                clientId: 'clientA',
                actionType: 'updatePlanner',
                opType: OpType.Update,
                entityType: 'PLANNER',
                entityId: dayId,
                payload: { scheduledTaskIds: ['task-1', 'task-2'] },
                vectorClock: { clientA: 1 },
                timestamp: now - 1000,
                schemaVersion: 1,
              },
            ],
            remoteOps: [
              {
                id: 'remote-planner',
                clientId: 'clientB',
                actionType: 'updatePlanner',
                opType: OpType.Update,
                entityType: 'PLANNER',
                entityId: dayId,
                payload: { scheduledTaskIds: ['task-3', 'task-4'] },
                vectorClock: { clientB: 1 },
                timestamp: now,
                schemaVersion: 1,
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Remote wins (newer timestamp)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-planner' }),
          'remote',
          jasmine.any(Object),
        );
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-planner']);
      });

      it('should handle BOARD entity conflicts', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'BOARD',
            entityId: 'board-1',
            localOps: [
              {
                id: 'local-board',
                clientId: 'clientA',
                actionType: 'updateBoard',
                opType: OpType.Update,
                entityType: 'BOARD',
                entityId: 'board-1',
                payload: { title: 'Local Board' },
                vectorClock: { clientA: 1 },
                timestamp: now,
                schemaVersion: 1,
              },
            ],
            remoteOps: [
              {
                id: 'remote-board',
                clientId: 'clientB',
                actionType: 'updateBoard',
                opType: OpType.Update,
                entityType: 'BOARD',
                entityId: 'board-1',
                payload: { title: 'Remote Board' },
                vectorClock: { clientB: 1 },
                timestamp: now - 1000,
                schemaVersion: 1,
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        await service.autoResolveConflictsLWW(conflicts);

        // Local wins (newer timestamp)
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-board']);
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-board']);
      });

      it('should handle REMINDER entity conflicts', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'REMINDER',
            entityId: 'reminder-1',
            localOps: [
              {
                id: 'local-reminder',
                clientId: 'clientA',
                actionType: 'updateReminder',
                opType: OpType.Update,
                entityType: 'REMINDER',
                entityId: 'reminder-1',
                payload: { title: 'Local Reminder', remindAt: now + 3600000 },
                vectorClock: { clientA: 1 },
                timestamp: now - 500,
                schemaVersion: 1,
              },
            ],
            remoteOps: [
              {
                id: 'remote-reminder',
                clientId: 'clientB',
                actionType: 'updateReminder',
                opType: OpType.Update,
                entityType: 'REMINDER',
                entityId: 'reminder-1',
                payload: { title: 'Remote Reminder', remindAt: now + 7200000 },
                vectorClock: { clientB: 1 },
                timestamp: now,
                schemaVersion: 1,
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Remote wins (newer timestamp)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-reminder' }),
          'remote',
          jasmine.any(Object),
        );
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-reminder']);
      });

      it('should show error snack but continue when backup creation fails', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          createConflict(
            'task-1',
            [createOpWithTimestamp('local-1', 'client-a', now - 1000)],
            [createOpWithTimestamp('remote-1', 'client-b', now)],
          ),
        ];

        // Simulate backup failure
        mockSyncSafetyBackupService.createBackup.and.rejectWith(new Error('Disk full'));
        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: conflicts[0].remoteOps,
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Should show error for backup failure
        expect(mockSnackService.open).toHaveBeenCalledWith(
          jasmine.objectContaining({ type: 'ERROR' }),
        );

        // But resolution should still proceed
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-1' }),
          'remote',
          jasmine.any(Object),
        );
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['local-1']);
      });

      it('should handle mixed entity types in conflicts batch', async () => {
        const now = Date.now();
        const conflicts: EntityConflict[] = [
          {
            entityType: 'TASK',
            entityId: 'task-1',
            localOps: [createOpWithTimestamp('local-task', 'client-a', now - 1000)],
            remoteOps: [createOpWithTimestamp('remote-task', 'client-b', now)],
            suggestedResolution: 'manual',
          },
          {
            entityType: 'PROJECT',
            entityId: 'project-1',
            localOps: [
              {
                ...createOpWithTimestamp('local-project', 'client-a', now),
                entityType: 'PROJECT',
                entityId: 'project-1',
              },
            ],
            remoteOps: [
              {
                ...createOpWithTimestamp('remote-project', 'client-b', now - 1000),
                entityType: 'PROJECT',
                entityId: 'project-1',
              },
            ],
            suggestedResolution: 'manual',
          },
          {
            entityType: 'TAG',
            entityId: 'tag-1',
            localOps: [
              {
                ...createOpWithTimestamp('local-tag', 'client-a', now - 500),
                entityType: 'TAG',
                entityId: 'tag-1',
              },
            ],
            remoteOps: [
              {
                ...createOpWithTimestamp('remote-tag', 'client-b', now - 500),
                entityType: 'TAG',
                entityId: 'tag-1',
              },
            ],
            suggestedResolution: 'manual',
          },
        ];

        mockOperationApplier.applyOperations.and.resolveTo({
          appliedOps: [conflicts[0].remoteOps[0], conflicts[2].remoteOps[0]],
        });

        await service.autoResolveConflictsLWW(conflicts);

        // Task: remote wins (newer)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-task' }),
          'remote',
          jasmine.any(Object),
        );

        // Tag: remote wins (tie goes to remote)
        expect(mockOpLogStore.append).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'remote-tag' }),
          'remote',
          jasmine.any(Object),
        );

        // All local ops from conflicts get rejected in one batch
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith([
          'local-task',
          'local-project',
          'local-tag',
        ]);

        // Project: local wins - remote op rejected separately
        expect(mockOpLogStore.markRejected).toHaveBeenCalledWith(['remote-project']);

        // Notification should show mixed results
        expect(mockSnackService.open).toHaveBeenCalledWith(
          jasmine.objectContaining({
            translateParams: {
              localWins: 1,
              remoteWins: 2,
            },
          }),
        );
      });
    });
  });
});
