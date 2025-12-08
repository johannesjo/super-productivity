/* eslint-disable @typescript-eslint/naming-convention */
import {
  operationCaptureMetaReducer,
  setOperationCaptureService,
  getOperationCaptureService,
} from './operation-capture.meta-reducer';
import { OperationCaptureService } from './operation-capture.service';
import { Action } from '@ngrx/store';
import { PersistentAction } from '../persistent-action.interface';
import { EntityType, OpType } from '../operation.types';
import { RootState } from '../../../../root-store/root-state';

describe('operationCaptureMetaReducer', () => {
  let mockCaptureService: jasmine.SpyObj<OperationCaptureService>;
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

  beforeEach(() => {
    mockCaptureService = jasmine.createSpyObj('OperationCaptureService', [
      'computeAndEnqueue',
      'dequeue',
      'has',
      'getQueueSize',
      'clear',
    ]);

    mockReducer = jasmine.createSpy('reducer').and.returnValue(mockModifiedState);

    setOperationCaptureService(mockCaptureService);
  });

  describe('setOperationCaptureService', () => {
    it('should set the capture service instance', () => {
      const newCaptureService = jasmine.createSpyObj('OperationCaptureService', [
        'computeAndEnqueue',
      ]);

      setOperationCaptureService(newCaptureService);

      expect(getOperationCaptureService()).toBe(newCaptureService);
    });
  });

  describe('getOperationCaptureService', () => {
    it('should return the current capture service instance', () => {
      expect(getOperationCaptureService()).toBe(mockCaptureService);
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

    it('should compute and enqueue entity changes for persistent local actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      // Should call computeAndEnqueue with captureId, action, beforeState, afterState
      expect(mockCaptureService.computeAndEnqueue).toHaveBeenCalledWith(
        jasmine.any(String), // captureId
        action,
        mockState,
        mockModifiedState,
      );
    });

    it('should generate consistent captureId for same action', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      const firstCallArgs = mockCaptureService.computeAndEnqueue.calls.first().args;
      mockCaptureService.computeAndEnqueue.calls.reset();

      wrappedReducer(mockState, action);

      const secondCallArgs = mockCaptureService.computeAndEnqueue.calls.first().args;

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
      const captureId1 = mockCaptureService.computeAndEnqueue.calls.first().args[0];
      mockCaptureService.computeAndEnqueue.calls.reset();

      wrappedReducer(mockState, action2);
      const captureId2 = mockCaptureService.computeAndEnqueue.calls.first().args[0];

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

      expect(mockCaptureService.computeAndEnqueue).not.toHaveBeenCalled();
    });

    it('should NOT process non-persistent actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createNonPersistentAction();

      wrappedReducer(mockState, action);

      expect(mockCaptureService.computeAndEnqueue).not.toHaveBeenCalled();
    });

    it('should NOT process when state is undefined (initial state)', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(undefined, action);

      expect(mockCaptureService.computeAndEnqueue).not.toHaveBeenCalled();
    });

    it('should work without service (graceful degradation)', () => {
      setOperationCaptureService(null as any);
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });

    it('should handle errors in capture service gracefully', () => {
      mockCaptureService.computeAndEnqueue.and.throwError('Test error');
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Should not throw - errors are caught and logged
      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      // Should still return correct state
      expect(wrappedReducer(mockState, action)).toBe(mockModifiedState);
    });
  });

  describe('capture ordering (race condition fix)', () => {
    it('should capture before-state and after-state in a single synchronous call', () => {
      let capturedBeforeState: unknown = null;
      let capturedAfterState: unknown = null;

      mockCaptureService.computeAndEnqueue.and.callFake(
        (_captureId, _action, beforeState, afterState) => {
          capturedBeforeState = beforeState;
          capturedAfterState = afterState;
        },
      );

      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      wrappedReducer(mockState, createMockAction());

      // Both states should be captured
      expect(capturedBeforeState).toBe(mockState);
      expect(capturedAfterState).toBe(mockModifiedState);
    });

    it('should call reducer before computing changes', () => {
      const callOrder: string[] = [];

      mockReducer.and.callFake(() => {
        callOrder.push('reducer');
        return mockModifiedState;
      });

      mockCaptureService.computeAndEnqueue.and.callFake(() => {
        callOrder.push('computeAndEnqueue');
      });

      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      wrappedReducer(mockState, createMockAction());

      // Reducer should be called first, then computeAndEnqueue
      expect(callOrder).toEqual(['reducer', 'computeAndEnqueue']);
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
        mockCaptureService.computeAndEnqueue.calls.reset();
        const action = createMockAction({ type });
        wrappedReducer(mockState, action);
        expect(mockCaptureService.computeAndEnqueue).toHaveBeenCalled();
      });
    });
  });

  describe('captureId generation', () => {
    it('should include action type in captureId', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({ type: '[Custom] Custom Action' });

      wrappedReducer(mockState, action);

      const captureId = mockCaptureService.computeAndEnqueue.calls.first().args[0];
      expect(captureId).toContain('[Custom] Custom Action');
    });

    it('should include entityId in captureId', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction({
        meta: { ...createMockAction().meta, entityId: 'unique-entity-123' },
      });

      wrappedReducer(mockState, action);

      const captureId = mockCaptureService.computeAndEnqueue.calls.first().args[0];
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

      const captureId = mockCaptureService.computeAndEnqueue.calls.first().args[0];
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

      const captureId = mockCaptureService.computeAndEnqueue.calls.first().args[0];
      expect(captureId).toContain('no-id');
    });
  });
});
