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

  describe('dependency sorting edge cases', () => {
    it('should handle soft dependencies for tie-breaking', async () => {
      // Two CREATE ops: one has soft dependency on the other
      const projectOp = createMockOperation(
        'project-op',
        'PROJECT',
        OpType.Create,
        { title: 'Project' },
        'project-1',
      );
      const taskOp = createMockOperation(
        'task-op',
        'TASK',
        OpType.Create,
        { projectId: 'project-1' },
        'task-1',
      );

      // Soft dependency: task has soft reference to project
      const softDep: OperationDependency = {
        entityType: 'PROJECT',
        entityId: 'project-1',
        mustExist: false, // Soft dependency
        relation: 'reference',
      };

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'task-op') {
          return [softDep];
        }
        return [];
      });

      // Apply in reverse order (task first)
      await service.applyOperations([taskOp, projectOp]);

      // Both should be dispatched
      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

      // Project should be dispatched before task (soft dependency tie-breaking)
      const calls = mockStore.dispatch.calls.all();
      expect((calls[0].args[0] as any).meta.entityId).toBe('project-1');
      expect((calls[1].args[0] as any).meta.entityId).toBe('task-1');
    });

    it('should handle operations with same timestamp using CREATE preference', async () => {
      const timestamp = Date.now();

      const updateOp = createMockOperation(
        'update-op',
        'TASK',
        OpType.Update,
        { title: 'Updated' },
        'task-1',
      );
      (updateOp as any).timestamp = timestamp;

      const createOp = createMockOperation(
        'create-op',
        'TASK',
        OpType.Create,
        { title: 'Created' },
        'task-2',
      );
      (createOp as any).timestamp = timestamp;

      // No dependencies
      mockDependencyResolver.extractDependencies.and.returnValue([]);

      // Apply update first
      await service.applyOperations([updateOp, createOp]);

      // CREATE should be dispatched first due to sorting preference
      const calls = mockStore.dispatch.calls.all();
      expect((calls[0].args[0] as any).meta.entityId).toBe('task-2'); // CREATE
      expect((calls[1].args[0] as any).meta.entityId).toBe('task-1'); // UPDATE
    });

    it('should apply DELETE after operations that reference the deleted entity', async () => {
      // Scenario: Tag UPDATE references task-1, and there's a DELETE for task-1
      // The DELETE should come after the Tag UPDATE
      const tagUpdateOp = createMockOperation(
        'tag-update-op',
        'TAG',
        OpType.Update,
        { taskIds: ['task-1', 'task-2'] },
        'today-tag',
      );

      const taskDeleteOp = createMockOperation(
        'task-delete-op',
        'TASK',
        OpType.Delete,
        { id: 'task-1' },
        'task-1',
      );

      // Tag update has soft dependency on task-1
      const taskDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'task-1',
        mustExist: false,
        relation: 'reference',
      };

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'tag-update-op') {
          return [taskDep];
        }
        return [];
      });

      // Apply DELETE first in input order - should be reordered
      await service.applyOperations([taskDeleteOp, tagUpdateOp]);

      // Both should be dispatched
      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

      // Tag UPDATE should be dispatched BEFORE task DELETE
      const calls = mockStore.dispatch.calls.all();
      expect((calls[0].args[0] as any).meta.entityId).toBe('today-tag'); // Tag UPDATE
      expect((calls[1].args[0] as any).meta.entityId).toBe('task-1'); // Task DELETE
    });

    it('should apply DELETE after Tag UPDATE with nested taskIds (updateTag action)', async () => {
      // This tests the real-world scenario: updateTag action has nested structure
      // payload: { tag: { id, changes: { taskIds: [...] } } }
      const tagUpdateOp = createMockOperation(
        'tag-update-op',
        'TAG',
        OpType.Update,
        {
          tag: {
            id: 'TODAY',
            changes: {
              taskIds: ['task-1', 'task-2', 'task-3'],
            },
          },
        },
        'TODAY',
      );

      const taskDeleteOp = createMockOperation(
        'task-delete-op',
        'TASK',
        OpType.Delete,
        { id: 'task-1' },
        'task-1',
      );

      // Simulate real dependency extraction from nested structure
      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'tag-update-op') {
          // Real extractor would find taskIds in tag.changes.taskIds
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-1',
              mustExist: false,
              relation: 'reference' as const,
            },
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-2',
              mustExist: false,
              relation: 'reference' as const,
            },
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-3',
              mustExist: false,
              relation: 'reference' as const,
            },
          ];
        }
        return [];
      });

      // Apply DELETE first - should be reordered to come after Tag UPDATE
      await service.applyOperations([taskDeleteOp, tagUpdateOp]);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);

      const calls = mockStore.dispatch.calls.all();
      // Tag UPDATE with nested taskIds should come first
      expect((calls[0].args[0] as any).meta.entityId).toBe('TODAY');
      // DELETE should come last
      expect((calls[1].args[0] as any).meta.entityId).toBe('task-1');
    });

    it('should apply multiple operations before DELETE when all reference the entity', async () => {
      // Scenario: Multiple operations reference task-1 before it's deleted
      const tagUpdate1 = createMockOperation(
        'tag-update-1',
        'TAG',
        OpType.Update,
        { taskIds: ['task-1'] },
        'tag-1',
      );

      const tagUpdate2 = createMockOperation(
        'tag-update-2',
        'TAG',
        OpType.Update,
        { taskIds: ['task-1', 'task-2'] },
        'tag-2',
      );

      const taskDeleteOp = createMockOperation(
        'task-delete-op',
        'TASK',
        OpType.Delete,
        { id: 'task-1' },
        'task-1',
      );

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'tag-update-1' || op.id === 'tag-update-2') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-1',
              mustExist: false,
              relation: 'reference' as const,
            },
          ];
        }
        return [];
      });

      // Apply DELETE first
      await service.applyOperations([taskDeleteOp, tagUpdate1, tagUpdate2]);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);

      // DELETE should be last
      const calls = mockStore.dispatch.calls.all();
      expect((calls[2].args[0] as any).meta.entityId).toBe('task-1'); // DELETE is last
    });

    it('should handle CREATE-UPDATE-DELETE chain correctly', async () => {
      // Full lifecycle: Task CREATE, Tag UPDATE (adding task), Task DELETE
      const taskCreate = createMockOperation(
        'task-create',
        'TASK',
        OpType.Create,
        { title: 'New Task' },
        'task-1',
      );

      const tagUpdate = createMockOperation(
        'tag-update',
        'TAG',
        OpType.Update,
        { taskIds: ['task-1'] },
        'today-tag',
      );

      const taskDelete = createMockOperation(
        'task-delete',
        'TASK',
        OpType.Delete,
        { id: 'task-1' },
        'task-1',
      );

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'tag-update') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-1',
              mustExist: false,
              relation: 'reference' as const,
            },
          ];
        }
        return [];
      });

      // Apply in mixed order
      await service.applyOperations([taskDelete, tagUpdate, taskCreate]);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);

      // Order should be: CREATE, UPDATE, DELETE
      const calls = mockStore.dispatch.calls.all();
      // CREATE comes first (CREATE ops are prioritized)
      expect((calls[0].args[0] as any).meta.opType).toBe(OpType.Create);
      // DELETE comes last (waits for tag update that references it)
      expect((calls[2].args[0] as any).meta.opType).toBe(OpType.Delete);
    });
  });
});
