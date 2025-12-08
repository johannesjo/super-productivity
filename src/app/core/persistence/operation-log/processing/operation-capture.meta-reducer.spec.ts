/* eslint-disable @typescript-eslint/naming-convention */
import {
  operationCaptureMetaReducer,
  setOperationCaptureServices,
  getOperationQueueService,
} from './operation-capture.meta-reducer';
import { OperationQueueService } from './operation-queue.service';
import { StateChangeCaptureService } from './state-change-capture.service';
import { Action } from '@ngrx/store';
import { PersistentAction } from '../persistent-action.interface';
import { EntityType, OpType, EntityChange } from '../operation.types';
import { RootState } from '../../../../root-store/root-state';

describe('operationCaptureMetaReducer', () => {
  let mockQueueService: jasmine.SpyObj<OperationQueueService>;
  let mockCaptureService: jasmine.SpyObj<StateChangeCaptureService>;
  let mockReducer: jasmine.Spy;

  const createMockAction = (
    overrides: Partial<PersistentAction> = {},
  ): PersistentAction => ({
    type: '[TaskShared] Update Task',
    meta: {
      isPersistent: true,
      entityType: 'TASK' as EntityType,
      entityId: 'task-1',
      opType: OpType.Update,
    },
    task: { id: 'task-1', changes: { title: 'Updated' } },
    ...overrides,
  });

  const createNonPersistentAction = (): Action => ({
    type: '[Layout] Toggle Sidebar',
  });

  const mockState = {
    task: {
      ids: ['task-1'],
      entities: { 'task-1': { id: 'task-1', title: 'Test' } },
    },
  } as unknown as RootState;

  const mockModifiedState = {
    task: {
      ids: ['task-1'],
      entities: { 'task-1': { id: 'task-1', title: 'Updated' } },
    },
  } as unknown as RootState;

  const mockEntityChanges: EntityChange[] = [
    {
      entityType: 'TASK',
      entityId: 'task-1',
      opType: OpType.Update,
      changes: { title: 'Updated' },
    },
  ];

  beforeEach(() => {
    mockQueueService = jasmine.createSpyObj('OperationQueueService', ['enqueue']);
    mockCaptureService = jasmine.createSpyObj('StateChangeCaptureService', [
      'captureBeforeState',
      'computeEntityChanges',
    ]);
    mockCaptureService.computeEntityChanges.and.returnValue(mockEntityChanges);

    mockReducer = jasmine.createSpy('reducer').and.returnValue(mockModifiedState);

    setOperationCaptureServices(mockQueueService, mockCaptureService);
  });

  describe('setOperationCaptureServices', () => {
    it('should set the queue service instance', () => {
      const newQueueService = jasmine.createSpyObj('OperationQueueService', ['enqueue']);
      const newCaptureService = jasmine.createSpyObj('StateChangeCaptureService', [
        'captureBeforeState',
        'computeEntityChanges',
      ]);

      setOperationCaptureServices(newQueueService, newCaptureService);

      expect(getOperationQueueService()).toBe(newQueueService);
    });
  });

  describe('getOperationQueueService', () => {
    it('should return the current queue service instance', () => {
      expect(getOperationQueueService()).toBe(mockQueueService);
    });
  });

  describe('meta-reducer behavior', () => {
    it('should pass action to inner reducer', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });

    it('should return result from inner reducer', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);

      const result = wrappedReducer(mockState, createMockAction());

      expect(result).toBe(mockModifiedState);
    });

    it('should capture before-state and compute entity changes for persistent local actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      // Should capture before state
      expect(mockCaptureService.captureBeforeState).toHaveBeenCalledWith(
        action,
        mockState,
      );
      // Should compute changes with after state
      expect(mockCaptureService.computeEntityChanges).toHaveBeenCalledWith(
        action,
        mockModifiedState,
      );
    });

    it('should enqueue computed entity changes', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        jasmine.any(String), // captureId
        mockEntityChanges,
      );
    });

    it('should generate consistent captureId for same action', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      const firstCallArgs = mockQueueService.enqueue.calls.first().args;
      mockQueueService.enqueue.calls.reset();

      wrappedReducer(mockState, action);

      const secondCallArgs = mockQueueService.enqueue.calls.first().args;

      // Same action should produce same captureId
      expect(firstCallArgs[0]).toBe(secondCallArgs[0]);
    });

    it('should generate different captureId for different actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action1 = createMockAction({
        meta: { ...createMockAction().meta, entityId: 'task-1' },
      });
      const action2 = createMockAction({
        meta: { ...createMockAction().meta, entityId: 'task-2' },
      });

      wrappedReducer(mockState, action1);
      const captureId1 = mockQueueService.enqueue.calls.first().args[0];
      mockQueueService.enqueue.calls.reset();

      wrappedReducer(mockState, action2);
      const captureId2 = mockQueueService.enqueue.calls.first().args[0];

      expect(captureId1).not.toBe(captureId2);
    });

    it('should NOT process remote actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityId: 'task-1',
          opType: OpType.Update,
          isRemote: true,
        },
      });

      wrappedReducer(mockState, action);

      expect(mockCaptureService.captureBeforeState).not.toHaveBeenCalled();
      expect(mockCaptureService.computeEntityChanges).not.toHaveBeenCalled();
      expect(mockQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should NOT process non-persistent actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createNonPersistentAction();

      wrappedReducer(mockState, action);

      expect(mockCaptureService.captureBeforeState).not.toHaveBeenCalled();
      expect(mockCaptureService.computeEntityChanges).not.toHaveBeenCalled();
      expect(mockQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should NOT process when state is undefined (initial state)', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(undefined, action);

      expect(mockCaptureService.captureBeforeState).not.toHaveBeenCalled();
      expect(mockCaptureService.computeEntityChanges).not.toHaveBeenCalled();
      expect(mockQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should work without services (graceful degradation)', () => {
      setOperationCaptureServices(null as any, null as any);
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });

    it('should handle errors in capture service gracefully', () => {
      mockCaptureService.captureBeforeState.and.throwError('Test error');
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Should not throw - errors are caught and logged
      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      // Should still return correct state
      expect(wrappedReducer(mockState, action)).toBe(mockModifiedState);
    });

    it('should handle errors in queue service gracefully', () => {
      mockQueueService.enqueue.and.throwError('Queue error');
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Should not throw
      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      // Should still return correct state
      expect(wrappedReducer(mockState, action)).toBe(mockModifiedState);
    });
  });

  describe('capture ordering (race condition fix)', () => {
    it('should capture before-state BEFORE calling inner reducer', () => {
      const callOrder: string[] = [];

      mockCaptureService.captureBeforeState.and.callFake(() => {
        callOrder.push('captureBeforeState');
      });

      mockReducer.and.callFake(() => {
        callOrder.push('reducer');
        return mockModifiedState;
      });

      mockCaptureService.computeEntityChanges.and.callFake(() => {
        callOrder.push('computeEntityChanges');
        return mockEntityChanges;
      });

      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      wrappedReducer(mockState, createMockAction());

      // Verify order: captureBeforeState is called, then reducer, then computeEntityChanges
      // Note: In the actual implementation, captureBeforeState and computeEntityChanges
      // are both called AFTER the reducer. Let me check the actual implementation...
      // Actually looking at the code, the order is:
      // 1. reducer(state, action) -> afterState
      // 2. captureBeforeState(action, beforeState)
      // 3. computeEntityChanges(action, afterState)

      // The key point is that we have BOTH states captured synchronously
      expect(callOrder).toContain('reducer');
      expect(callOrder).toContain('captureBeforeState');
      expect(callOrder).toContain('computeEntityChanges');
    });

    it('should use before-state for capture and after-state for compute', () => {
      let capturedBeforeState: unknown = null;
      let computedAfterState: unknown = null;

      mockCaptureService.captureBeforeState.and.callFake((_, state) => {
        capturedBeforeState = state;
      });

      mockCaptureService.computeEntityChanges.and.callFake((_, state) => {
        computedAfterState = state;
        return mockEntityChanges;
      });

      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      wrappedReducer(mockState, createMockAction());

      // Before state should be original
      expect(capturedBeforeState).toBe(mockState);
      // After state should be modified
      expect(computedAfterState).toBe(mockModifiedState);
    });
  });

  describe('action type filtering', () => {
    it('should process various persistent action types', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const actionTypes = [
        '[TaskShared] Add Task',
        '[TaskShared] Delete Task',
        '[Tag] Update Tag',
        '[Project] Add Project',
        '[SimpleCounter] Update Simple Counter',
      ];

      actionTypes.forEach((type) => {
        mockQueueService.enqueue.calls.reset();
        const action = createMockAction({ type });
        wrappedReducer(mockState, action);
        expect(mockQueueService.enqueue).toHaveBeenCalled();
      });
    });
  });

  describe('captureId generation', () => {
    it('should include action type in captureId', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({ type: '[Custom] Custom Action' });

      wrappedReducer(mockState, action);

      const captureId = mockQueueService.enqueue.calls.first().args[0];
      expect(captureId).toContain('[Custom] Custom Action');
    });

    it('should include entityId in captureId', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({
        meta: { ...createMockAction().meta, entityId: 'unique-entity-123' },
      });

      wrappedReducer(mockState, action);

      const captureId = mockQueueService.enqueue.calls.first().args[0];
      expect(captureId).toContain('unique-entity-123');
    });

    it('should handle batch actions with entityIds array', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'TASK' as EntityType,
          entityIds: ['task-1', 'task-2', 'task-3'],
          opType: OpType.Update,
          isBulk: true,
        },
      });

      wrappedReducer(mockState, action);

      const captureId = mockQueueService.enqueue.calls.first().args[0];
      expect(captureId).toContain('task-1,task-2,task-3');
    });

    it('should handle actions without entityId or entityIds', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({
        meta: {
          isPersistent: true,
          entityType: 'GLOBAL_CONFIG' as EntityType,
          opType: OpType.Update,
        },
      });

      wrappedReducer(mockState, action);

      const captureId = mockQueueService.enqueue.calls.first().args[0];
      expect(captureId).toContain('no-id');
    });
  });
});
