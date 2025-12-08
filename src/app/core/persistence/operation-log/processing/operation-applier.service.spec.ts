import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { OperationApplierService } from './operation-applier.service';
import {
  DependencyResolverService,
  OperationDependency,
} from '../sync/dependency-resolver.service';
import { Operation, OpType, EntityType } from '../operation.types';
import { MAX_DEPENDENCY_RETRY_ATTEMPTS } from '../operation-log.const';
import { SnackService } from '../../../snack/snack.service';
import { ArchiveOperationHandler } from './archive-operation-handler.service';

describe('OperationApplierService', () => {
  let service: OperationApplierService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockDependencyResolver: jasmine.SpyObj<DependencyResolverService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockArchiveOperationHandler: jasmine.SpyObj<ArchiveOperationHandler>;

  const createMockOperation = (
    id: string,
    entityType: EntityType = 'TASK',
    opType: OpType = OpType.Update,
    payload: unknown = {},
    entityId?: string,
  ): Operation => ({
    id,
    actionType: '[Test] Action',
    opType,
    entityType,
    entityId,
    payload,
    clientId: 'testClient',
    vectorClock: { testClient: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
  });

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockDependencyResolver = jasmine.createSpyObj('DependencyResolverService', [
      'extractDependencies',
      'checkDependencies',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockArchiveOperationHandler = jasmine.createSpyObj('ArchiveOperationHandler', [
      'handleRemoteOperation',
    ]);

    // Default: no dependencies
    mockDependencyResolver.extractDependencies.and.returnValue([]);
    mockDependencyResolver.checkDependencies.and.returnValue(
      Promise.resolve({ missing: [] }),
    );
    mockArchiveOperationHandler.handleRemoteOperation.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        OperationApplierService,
        { provide: Store, useValue: mockStore },
        { provide: DependencyResolverService, useValue: mockDependencyResolver },
        { provide: SnackService, useValue: mockSnackService },
        { provide: ArchiveOperationHandler, useValue: mockArchiveOperationHandler },
      ],
    });

    service = TestBed.inject(OperationApplierService);
  });

  describe('applyOperations', () => {
    it('should dispatch action for operation with no dependencies', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      await service.applyOperations([op]);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Test] Action',
          title: 'Test',
          meta: jasmine.objectContaining({
            isPersistent: true,
            isRemote: true,
          }),
        }),
      );
    });

    it('should dispatch actions for multiple operations', async () => {
      const ops = [
        createMockOperation('op-1'),
        createMockOperation('op-2'),
        createMockOperation('op-3'),
      ];

      await service.applyOperations(ops);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
    });

    it('should not dispatch action for operation with missing hard dependency', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Create, {
        parentId: 'parent-123',
      });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'parent-123',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([parentDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [parentDep] }),
      );

      await service.applyOperations([op]);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
      expect(service.getPendingCount()).toBe(1);
    });

    it('should dispatch action for operation with missing soft dependency', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Create, {
        projectId: 'project-123',
      });

      const projectDep: OperationDependency = {
        entityType: 'PROJECT',
        entityId: 'project-123',
        mustExist: false, // Soft dependency
        relation: 'reference',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([projectDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [projectDep] }),
      );

      await service.applyOperations([op]);

      // Soft dependency doesn't block application
      expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('dependency sorting', () => {
    it('should apply parent before child when both are in same batch', async () => {
      const parentOp = createMockOperation(
        'parent-op',
        'TASK',
        OpType.Create,
        {},
        'parent-task',
      );
      const childOp = createMockOperation(
        'child-op',
        'TASK',
        OpType.Create,
        { parentId: 'parent-task' },
        'child-task',
      );

      // Parent dependency for child
      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'parent-task',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'child-op') {
          return [parentDep];
        }
        return [];
      });

      // First call - parent doesn't exist yet, second call - parent exists
      let parentExists = false;
      mockDependencyResolver.checkDependencies.and.callFake(
        async (deps: OperationDependency[]) => {
          const missing = deps.filter(
            (d) => d.entityId === 'parent-task' && !parentExists,
          );
          return { missing };
        },
      );

      // When parent op is dispatched, parent "exists" for subsequent checks
      mockStore.dispatch.and.callFake((() => {
        parentExists = true;
      }) as any);

      // Apply in reverse order to test sorting
      await service.applyOperations([childOp, parentOp]);

      // Both should be dispatched (parent first due to sorting)
      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

      // Verify order: parent dispatched before child
      const calls = mockStore.dispatch.calls.all();
      expect((calls[0].args[0] as any).meta.entityId).toBe('parent-task');
      expect((calls[1].args[0] as any).meta.entityId).toBe('child-task');
    });

    it('should handle single operation without sorting', async () => {
      const op = createMockOperation('op-1');

      await service.applyOperations([op]);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should handle empty operations array', async () => {
      await service.applyOperations([]);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('retry mechanism', () => {
    it('should retry pending operations on next applyOperations call', async () => {
      const op1 = createMockOperation('op-1', 'TASK', OpType.Create, {
        parentId: 'parent-123',
      });
      const op2 = createMockOperation('op-2', 'TASK', OpType.Create, {}, 'parent-123');

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'parent-123',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'op-1') return [parentDep];
        return [];
      });

      // First call: parent doesn't exist
      let parentExists = false;
      mockDependencyResolver.checkDependencies.and.callFake(
        async (deps: OperationDependency[]) => {
          if (deps.some((d) => d.entityId === 'parent-123') && !parentExists) {
            return { missing: deps.filter((d) => d.entityId === 'parent-123') };
          }
          return { missing: [] };
        },
      );

      // Apply op1 first - will be queued
      await service.applyOperations([op1]);
      expect(mockStore.dispatch).not.toHaveBeenCalled();
      expect(service.getPendingCount()).toBe(1);

      // Now apply op2 (creates parent)
      mockStore.dispatch.and.callFake((() => {
        parentExists = true;
      }) as any);

      await service.applyOperations([op2]);

      // Both should now be dispatched (op2 + op1 from retry)
      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      expect(service.getPendingCount()).toBe(0);
    });

    it('should move operation to permanently failed after max retries', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Create, {
        parentId: 'missing-parent',
      });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'missing-parent',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([parentDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [parentDep] }),
      );

      // Apply multiple times to exhaust retries
      for (let i = 0; i <= MAX_DEPENDENCY_RETRY_ATTEMPTS; i++) {
        await service.applyOperations([]);
        if (i === 0) {
          // First real application
          await service.applyOperations([op]);
        }
      }

      expect(service.getFailedCount()).toBe(1);
      expect(service.getPendingCount()).toBe(0);
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when no pending operations', () => {
      expect(service.getPendingCount()).toBe(0);
    });
  });

  describe('getFailedCount', () => {
    it('should return 0 when no failed operations', () => {
      expect(service.getFailedCount()).toBe(0);
    });
  });

  describe('getFailedOperations', () => {
    it('should return empty array when no failed operations', () => {
      expect(service.getFailedOperations()).toEqual([]);
    });

    it('should return copy of failed operations', () => {
      const failed1 = service.getFailedOperations();
      const failed2 = service.getFailedOperations();

      expect(failed1).not.toBe(failed2);
      expect(failed1).toEqual(failed2);
    });
  });

  describe('clearFailedOperations', () => {
    it('should clear all failed operations', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Create, {
        parentId: 'missing',
      });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'missing',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([parentDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [parentDep] }),
      );

      // Exhaust retries to create a failed operation
      await service.applyOperations([op]);
      for (let i = 0; i < MAX_DEPENDENCY_RETRY_ATTEMPTS; i++) {
        await service.applyOperations([]);
      }

      expect(service.getFailedCount()).toBe(1);

      service.clearFailedOperations();

      expect(service.getFailedCount()).toBe(0);
    });
  });

  describe('pruneOldFailedOperations', () => {
    it('should remove operations older than maxAgeMs', async () => {
      const oldOp = createMockOperation('old-op', 'TASK', OpType.Create, {
        parentId: 'missing',
      });
      // Override timestamp to be old (8 days ago)
      const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
      (oldOp as any).timestamp = Date.now() - eightDaysMs;

      const recentOp = createMockOperation('recent-op', 'TASK', OpType.Create, {
        parentId: 'missing',
      });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'missing',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([parentDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [parentDep] }),
      );

      // Create two failed operations
      await service.applyOperations([oldOp]);
      for (let i = 0; i < MAX_DEPENDENCY_RETRY_ATTEMPTS; i++) {
        await service.applyOperations([]);
      }

      await service.applyOperations([recentOp]);
      for (let i = 0; i < MAX_DEPENDENCY_RETRY_ATTEMPTS; i++) {
        await service.applyOperations([]);
      }

      expect(service.getFailedCount()).toBe(2);

      // Prune with 7-day default
      const pruned = service.pruneOldFailedOperations();

      expect(pruned).toBe(1);
      expect(service.getFailedCount()).toBe(1);
      expect(service.getFailedOperations()[0].op.id).toBe('recent-op');
    });

    it('should return 0 when no operations are old enough to prune', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Create, {
        parentId: 'missing',
      });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'missing',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([parentDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [parentDep] }),
      );

      // Create a failed operation
      await service.applyOperations([op]);
      for (let i = 0; i < MAX_DEPENDENCY_RETRY_ATTEMPTS; i++) {
        await service.applyOperations([]);
      }

      const pruned = service.pruneOldFailedOperations();

      expect(pruned).toBe(0);
      expect(service.getFailedCount()).toBe(1);
    });
  });

  describe('snack notification', () => {
    it('should show error snack on first failed operation', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Create, {
        parentId: 'missing',
      });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'missing',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.returnValue([parentDep]);
      mockDependencyResolver.checkDependencies.and.returnValue(
        Promise.resolve({ missing: [parentDep] }),
      );

      // Exhaust retries to create a failed operation
      await service.applyOperations([op]);
      for (let i = 0; i < MAX_DEPENDENCY_RETRY_ATTEMPTS; i++) {
        await service.applyOperations([]);
      }

      expect(mockSnackService.open).toHaveBeenCalledTimes(1);
      expect(mockSnackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'ERROR',
        }),
      );
    });
  });

  // NOTE: Dependency sorting tests have been moved to sort-operations-by-dependency.util.spec.ts
  // The sorting functionality is currently disabled in the service (see applyOperations comment)
  // but the utility is kept for potential future use.
});
