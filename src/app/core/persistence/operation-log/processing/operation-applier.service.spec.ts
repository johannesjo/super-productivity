import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { OperationApplierService } from './operation-applier.service';
import {
  DependencyResolverService,
  OperationDependency,
} from '../sync/dependency-resolver.service';
import { Operation, OpType, EntityType } from '../operation.types';
import { ArchiveOperationHandler } from './archive-operation-handler.service';
import { SyncStateCorruptedError } from '../sync-state-corrupted.error';

describe('OperationApplierService', () => {
  let service: OperationApplierService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockDependencyResolver: jasmine.SpyObj<DependencyResolverService>;
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
    mockArchiveOperationHandler = jasmine.createSpyObj('ArchiveOperationHandler', [
      'handleOperation',
    ]);

    // Default: no dependencies
    mockDependencyResolver.extractDependencies.and.returnValue([]);
    mockDependencyResolver.checkDependencies.and.returnValue(
      Promise.resolve({ missing: [] }),
    );
    mockArchiveOperationHandler.handleOperation.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        OperationApplierService,
        { provide: Store, useValue: mockStore },
        { provide: DependencyResolverService, useValue: mockDependencyResolver },
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

    it('should dispatch actions for multiple operations in order', async () => {
      const ops = [
        createMockOperation('op-1', 'TASK', OpType.Update, { title: 'First' }),
        createMockOperation('op-2', 'TASK', OpType.Update, { title: 'Second' }),
        createMockOperation('op-3', 'TASK', OpType.Update, { title: 'Third' }),
      ];

      await service.applyOperations(ops);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);

      const calls = mockStore.dispatch.calls.all();
      expect((calls[0].args[0] as any).title).toBe('First');
      expect((calls[1].args[0] as any).title).toBe('Second');
      expect((calls[2].args[0] as any).title).toBe('Third');
    });

    it('should handle empty operations array', async () => {
      await service.applyOperations([]);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should call archiveOperationHandler after dispatching', async () => {
      const op = createMockOperation('op-1');

      await service.applyOperations([op]);

      expect(mockArchiveOperationHandler.handleOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('dependency handling', () => {
    it('should throw SyncStateCorruptedError for operation with missing hard dependency', async () => {
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

      await expectAsync(service.applyOperations([op])).toBeRejectedWithError(
        SyncStateCorruptedError,
      );

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should include operation details in SyncStateCorruptedError', async () => {
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

      try {
        await service.applyOperations([op]);
        fail('Expected SyncStateCorruptedError to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SyncStateCorruptedError);
        const error = e as SyncStateCorruptedError;
        expect(error.context.opId).toBe('op-1');
        expect(error.context.actionType).toBe('[Test] Action');
        expect(error.context.missingDependencies).toContain('TASK:parent-123');
      }
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

    it('should throw on first operation with missing hard deps in a batch', async () => {
      const op1 = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'OK' });
      const op2 = createMockOperation('op-2', 'TASK', OpType.Create, {
        parentId: 'missing',
      });
      const op3 = createMockOperation('op-3', 'TASK', OpType.Update, { title: 'Never' });

      const parentDep: OperationDependency = {
        entityType: 'TASK',
        entityId: 'missing',
        mustExist: true,
        relation: 'parent',
      };

      mockDependencyResolver.extractDependencies.and.callFake((op: Operation) => {
        if (op.id === 'op-2') return [parentDep];
        return [];
      });

      mockDependencyResolver.checkDependencies.and.callFake(
        async (deps: OperationDependency[]) => {
          if (deps.some((d) => d.entityId === 'missing')) {
            return { missing: deps };
          }
          return { missing: [] };
        },
      );

      await expectAsync(service.applyOperations([op1, op2, op3])).toBeRejectedWithError(
        SyncStateCorruptedError,
      );

      // First operation should have been dispatched before we hit the error
      expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      expect((mockStore.dispatch.calls.first().args[0] as any).title).toBe('OK');
    });
  });
});
