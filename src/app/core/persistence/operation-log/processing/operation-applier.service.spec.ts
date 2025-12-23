import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { OperationApplierService } from './operation-applier.service';
import { Operation, OpType, EntityType } from '../operation.types';
import { ArchiveOperationHandler } from './archive-operation-handler.service';
import { HydrationStateService } from './hydration-state.service';
import { TaskSharedActions } from '../../../../root-store/meta/task-shared.actions';
import { remoteArchiveDataApplied } from '../../../../features/time-tracking/store/archive.actions';

describe('OperationApplierService', () => {
  let service: OperationApplierService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockArchiveOperationHandler: jasmine.SpyObj<ArchiveOperationHandler>;
  let mockHydrationState: jasmine.SpyObj<HydrationStateService>;

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
    mockArchiveOperationHandler = jasmine.createSpyObj('ArchiveOperationHandler', [
      'handleOperation',
    ]);
    mockHydrationState = jasmine.createSpyObj('HydrationStateService', [
      'startApplyingRemoteOps',
      'endApplyingRemoteOps',
      'startPostSyncCooldown',
    ]);

    mockArchiveOperationHandler.handleOperation.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        OperationApplierService,
        { provide: Store, useValue: mockStore },
        { provide: ArchiveOperationHandler, useValue: mockArchiveOperationHandler },
        { provide: HydrationStateService, useValue: mockHydrationState },
      ],
    });

    service = TestBed.inject(OperationApplierService);
  });

  describe('applyOperations', () => {
    it('should dispatch action for operation', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      const result = await service.applyOperations([op]);

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
      expect(result.appliedOps).toEqual([op]);
      expect(result.failedOp).toBeUndefined();
    });

    it('should dispatch actions for multiple operations in order', async () => {
      const ops = [
        createMockOperation('op-1', 'TASK', OpType.Update, { title: 'First' }),
        createMockOperation('op-2', 'TASK', OpType.Update, { title: 'Second' }),
        createMockOperation('op-3', 'TASK', OpType.Update, { title: 'Third' }),
      ];

      const result = await service.applyOperations(ops);

      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);

      const calls = mockStore.dispatch.calls.all();
      expect((calls[0].args[0] as any).title).toBe('First');
      expect((calls[1].args[0] as any).title).toBe('Second');
      expect((calls[2].args[0] as any).title).toBe('Third');

      expect(result.appliedOps).toEqual(ops);
      expect(result.failedOp).toBeUndefined();
    });

    it('should handle empty operations array', async () => {
      const result = await service.applyOperations([]);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
      expect(result.appliedOps).toEqual([]);
      expect(result.failedOp).toBeUndefined();
    });

    it('should call archiveOperationHandler after dispatching', async () => {
      const op = createMockOperation('op-1');

      await service.applyOperations([op]);

      expect(mockArchiveOperationHandler.handleOperation).toHaveBeenCalledTimes(1);
    });

    it('should call archiveOperationHandler with loadAllData action for SYNC_IMPORT operations', async () => {
      const archiveYoungData = { task: { ids: ['t1'], entities: {} } };
      const archiveOldData = { task: { ids: ['t2'], entities: {} } };

      const op: Operation = {
        id: 'sync-import-1',
        clientId: 'remoteClient',
        actionType: '[SP_ALL] Load(import) all data',
        opType: OpType.SyncImport,
        entityType: 'ALL',
        entityId: 'sync-import-1',
        payload: {
          appDataComplete: {
            archiveYoung: archiveYoungData,
            archiveOld: archiveOldData,
          },
        },
        vectorClock: { remoteClient: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      await service.applyOperations([op]);

      // Verify store.dispatch was called with loadAllData action and remoteArchiveDataApplied
      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      const dispatchedAction = mockStore.dispatch.calls.first().args[0] as any;
      expect(dispatchedAction.type).toBe('[SP_ALL] Load(import) all data');
      expect(dispatchedAction.appDataComplete.archiveYoung).toEqual(archiveYoungData);
      expect(dispatchedAction.appDataComplete.archiveOld).toEqual(archiveOldData);
      expect(dispatchedAction.meta.isRemote).toBe(true);

      // Verify archiveOperationHandler was called with the action
      expect(mockArchiveOperationHandler.handleOperation).toHaveBeenCalledTimes(1);
      const handlerAction = mockArchiveOperationHandler.handleOperation.calls.first()
        .args[0] as any;
      expect(handlerAction.type).toBe('[SP_ALL] Load(import) all data');
      expect(handlerAction.meta.isRemote).toBe(true);
    });
  });

  describe('error paths', () => {
    it('should return failed op when archiveOperationHandler throws', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });
      const archiveError = new Error('Archive write failed');

      mockArchiveOperationHandler.handleOperation.and.rejectWith(archiveError);

      const result = await service.applyOperations([op]);

      expect(result.appliedOps).toEqual([]);
      expect(result.failedOp).toBeDefined();
      expect(result.failedOp!.op).toBe(op);
      expect(result.failedOp!.error).toBe(archiveError);
    });
  });

  describe('hydration state tracking', () => {
    it('should call startApplyingRemoteOps at start', async () => {
      const op = createMockOperation('op-1');

      await service.applyOperations([op]);

      expect(mockHydrationState.startApplyingRemoteOps).toHaveBeenCalledTimes(1);
      expect(mockHydrationState.endApplyingRemoteOps).toHaveBeenCalledTimes(1);
    });

    it('should call endApplyingRemoteOps even on error', async () => {
      const op = createMockOperation('op-1');
      const testError = new Error('Test failure');

      mockArchiveOperationHandler.handleOperation.and.rejectWith(testError);

      await service.applyOperations([op]);

      expect(mockHydrationState.startApplyingRemoteOps).toHaveBeenCalledTimes(1);
      expect(mockHydrationState.endApplyingRemoteOps).toHaveBeenCalledTimes(1);
    });

    it('should call endApplyingRemoteOps after all ops', async () => {
      const ops = [
        createMockOperation('op-1'),
        createMockOperation('op-2'),
        createMockOperation('op-3'),
      ];

      await service.applyOperations(ops);

      expect(mockHydrationState.startApplyingRemoteOps).toHaveBeenCalledTimes(1);
      expect(mockHydrationState.endApplyingRemoteOps).toHaveBeenCalledTimes(1);
      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
    });
  });

  describe('isLocalHydration option', () => {
    it('should skip archiveOperationHandler when isLocalHydration is true', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      await service.applyOperations([op], { isLocalHydration: true });

      expect(mockArchiveOperationHandler.handleOperation).not.toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should call archiveOperationHandler when isLocalHydration is false', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      await service.applyOperations([op], { isLocalHydration: false });

      expect(mockArchiveOperationHandler.handleOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('archive reload trigger', () => {
    it('should dispatch remoteArchiveDataApplied for archive-affecting operations', async () => {
      // moveToArchive is an archive-affecting action
      const op: Operation = {
        id: 'op-1',
        clientId: 'testClient',
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { tasks: [] },
        vectorClock: { testClient: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      await service.applyOperations([op]);

      // Check that remoteArchiveDataApplied action was dispatched
      const dispatchCalls = mockStore.dispatch.calls.allArgs();
      const archiveDataAppliedCalls = dispatchCalls.filter(
        (args) =>
          (args[0] as unknown as { type: string }).type === remoteArchiveDataApplied.type,
      );
      expect(archiveDataAppliedCalls.length).toBe(1);
    });

    it('should not dispatch remoteArchiveDataApplied for non-archive-affecting operations', async () => {
      // A regular task update is not archive-affecting
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      await service.applyOperations([op]);

      const dispatchCalls = mockStore.dispatch.calls.allArgs();
      const archiveDataAppliedCalls = dispatchCalls.filter(
        (args) =>
          (args[0] as unknown as { type: string }).type === remoteArchiveDataApplied.type,
      );
      expect(archiveDataAppliedCalls.length).toBe(0);
    });

    it('should not dispatch remoteArchiveDataApplied when isLocalHydration is true', async () => {
      // Even for archive-affecting operations, skip during local hydration
      const op: Operation = {
        id: 'op-1',
        clientId: 'testClient',
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { tasks: [] },
        vectorClock: { testClient: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      await service.applyOperations([op], { isLocalHydration: true });

      const dispatchCalls = mockStore.dispatch.calls.allArgs();
      const archiveDataAppliedCalls = dispatchCalls.filter(
        (args) =>
          (args[0] as unknown as { type: string }).type === remoteArchiveDataApplied.type,
      );
      expect(archiveDataAppliedCalls.length).toBe(0);
    });

    it('should dispatch remoteArchiveDataApplied once for batch with archive-affecting ops', async () => {
      const ops: Operation[] = [
        createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' }),
        {
          id: 'op-2',
          clientId: 'testClient',
          actionType: TaskSharedActions.moveToArchive.type,
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { tasks: [] },
          vectorClock: { testClient: 1 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
        createMockOperation('op-3', 'TASK', OpType.Update, { title: 'Test2' }),
      ];

      await service.applyOperations(ops);

      // Only dispatched once at the end, not per operation
      const dispatchCalls = mockStore.dispatch.calls.allArgs();
      const archiveDataAppliedCalls = dispatchCalls.filter(
        (args) =>
          (args[0] as unknown as { type: string }).type === remoteArchiveDataApplied.type,
      );
      expect(archiveDataAppliedCalls.length).toBe(1);
    });
  });

  describe('event loop yield after dispatch', () => {
    it('should yield to event loop after dispatching operations', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      let setTimeoutCalledWithZero = false;
      const originalSetTimeout = window.setTimeout.bind(window);
      spyOn(window, 'setTimeout').and.callFake(((fn: () => void, ms?: number) => {
        if (ms === 0) setTimeoutCalledWithZero = true;
        return originalSetTimeout(fn, ms);
      }) as typeof window.setTimeout);

      await service.applyOperations([op]);

      expect(setTimeoutCalledWithZero).toBe(true);
    });

    it('should not yield to event loop when no operations are applied', async () => {
      let setTimeoutCalledWithZero = false;
      spyOn(window, 'setTimeout').and.callFake(((fn: () => void, ms?: number) => {
        if (ms === 0) setTimeoutCalledWithZero = true;
        return 0;
      }) as typeof window.setTimeout);

      await service.applyOperations([]);

      expect(setTimeoutCalledWithZero).toBe(false);
    });

    it('should yield to event loop even with isLocalHydration true', async () => {
      const op = createMockOperation('op-1', 'TASK', OpType.Update, { title: 'Test' });

      let setTimeoutCalledWithZero = false;
      const originalSetTimeout = window.setTimeout.bind(window);
      spyOn(window, 'setTimeout').and.callFake(((fn: () => void, ms?: number) => {
        if (ms === 0) setTimeoutCalledWithZero = true;
        return originalSetTimeout(fn, ms);
      }) as typeof window.setTimeout);

      await service.applyOperations([op], { isLocalHydration: true });

      expect(setTimeoutCalledWithZero).toBe(true);
    });
  });
});
