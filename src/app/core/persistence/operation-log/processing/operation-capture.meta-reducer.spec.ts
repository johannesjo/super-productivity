/* eslint-disable @typescript-eslint/naming-convention */
import {
  operationCaptureMetaReducer,
  setOperationCaptureService,
  getOperationCaptureService,
  setIsApplyingRemoteOps,
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
      'enqueue',
      'dequeue',
      'getQueueSize',
      'clear',
    ]);

    mockReducer = jasmine.createSpy('reducer').and.returnValue(mockModifiedState);

    setOperationCaptureService(mockCaptureService);
    // Reset sync state to prevent test pollution
    setIsApplyingRemoteOps(false);
  });

  afterEach(() => {
    // Ensure sync state is reset after each test
    setIsApplyingRemoteOps(false);
  });

  describe('setOperationCaptureService', () => {
    it('should set the capture service instance', () => {
      const newCaptureService = jasmine.createSpyObj('OperationCaptureService', [
        'enqueue',
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

    it('should enqueue action for persistent local actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      // Should call enqueue with just the action (no state params)
      expect(mockCaptureService.enqueue).toHaveBeenCalledWith(action);
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

      expect(mockCaptureService.enqueue).not.toHaveBeenCalled();
    });

    it('should NOT process non-persistent actions', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createNonPersistentAction();

      wrappedReducer(mockState, action);

      expect(mockCaptureService.enqueue).not.toHaveBeenCalled();
    });

    it('should process even when state is undefined (initial state)', () => {
      // Since we no longer need state for diffing, we can enqueue for all persistent actions
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(undefined, action);

      expect(mockCaptureService.enqueue).toHaveBeenCalledWith(action);
    });

    it('should work without service (graceful degradation)', () => {
      setOperationCaptureService(null as any);
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });

    it('should handle errors in capture service gracefully', () => {
      mockCaptureService.enqueue.and.throwError('Test error');
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Should not throw - errors are caught and logged
      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      // Should still return correct state
      expect(wrappedReducer(mockState, action)).toBe(mockModifiedState);
    });
  });

  describe('enqueue ordering', () => {
    it('should call reducer before enqueuing action', () => {
      const callOrder: string[] = [];

      mockReducer.and.callFake(() => {
        callOrder.push('reducer');
        return mockModifiedState;
      });

      mockCaptureService.enqueue.and.callFake(() => {
        callOrder.push('enqueue');
      });

      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      wrappedReducer(mockState, createMockAction());

      // Reducer should be called first, then enqueue
      expect(callOrder).toEqual(['reducer', 'enqueue']);
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
        mockCaptureService.enqueue.calls.reset();
        const action = createMockAction({ type });
        wrappedReducer(mockState, action);
        expect(mockCaptureService.enqueue).toHaveBeenCalled();
      });
    });
  });

  describe('sync blocking (user interaction during sync)', () => {
    /**
     * BUG FIX TEST: When remote operations are being applied (sync replay),
     * user interactions should NOT create new local operations.
     *
     * The problem:
     * 1. User syncs after 12 hours, many operations need to be applied
     * 2. User interacts with the app during sync (creates a task, clicks done, etc.)
     * 3. These interactions are captured as local operations
     * 4. The local operations have stale vector clocks (not including remote ops being applied)
     * 5. When uploaded, these ops conflict with recently-downloaded remote ops
     *
     * The fix:
     * Check HydrationStateService.isApplyingRemoteOps() in the meta-reducer
     * and skip capturing when it returns true.
     */
    it('should NOT capture local operations when applying remote operations (sync in progress)', () => {
      // This requires mocking the HydrationStateService
      // The meta-reducer needs to check isApplyingRemoteOps() before capturing
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Simulate sync in progress by setting hydration state
      // The fix should add a check for this in the meta-reducer
      setIsApplyingRemoteOps(true);

      wrappedReducer(mockState, action);

      // Should NOT capture - sync is in progress
      expect(mockCaptureService.enqueue).not.toHaveBeenCalled();

      // Reset for other tests
      setIsApplyingRemoteOps(false);
    });

    it('should resume capturing local operations after sync completes', () => {
      const wrappedReducer = operationCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Start sync
      setIsApplyingRemoteOps(true);

      wrappedReducer(mockState, action);
      expect(mockCaptureService.enqueue).not.toHaveBeenCalled();

      // End sync
      setIsApplyingRemoteOps(false);

      // Now actions should be captured again
      wrappedReducer(mockState, action);
      expect(mockCaptureService.enqueue).toHaveBeenCalled();
    });
  });
});
