/* eslint-disable @typescript-eslint/naming-convention */
import {
  stateCaptureMetaReducer,
  setStateChangeCaptureService,
  getStateChangeCaptureService,
} from './state-capture.meta-reducer';
import { StateChangeCaptureService } from './state-change-capture.service';
import { Action } from '@ngrx/store';
import { PersistentAction } from '../persistent-action.interface';
import { EntityType, OpType } from '../operation.types';
import { RootState } from '../../../../root-store/root-state';

describe('stateCaptureMetaReducer', () => {
  let mockService: jasmine.SpyObj<StateChangeCaptureService>;
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

  beforeEach(() => {
    mockService = jasmine.createSpyObj('StateChangeCaptureService', [
      'captureBeforeState',
    ]);
    mockReducer = jasmine.createSpy('reducer').and.callFake((state: unknown) => state);

    // Reset the service before each test
    setStateChangeCaptureService(mockService);
  });

  describe('setStateChangeCaptureService', () => {
    it('should set the service instance', () => {
      const newService = jasmine.createSpyObj('StateChangeCaptureService', [
        'captureBeforeState',
      ]);
      setStateChangeCaptureService(newService);

      expect(getStateChangeCaptureService()).toBe(newService);
    });
  });

  describe('getStateChangeCaptureService', () => {
    it('should return the current service instance', () => {
      expect(getStateChangeCaptureService()).toBe(mockService);
    });
  });

  describe('meta-reducer behavior', () => {
    it('should pass action to inner reducer', () => {
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });

    it('should return result from inner reducer', () => {
      const expectedState = { ...mockState, modified: true };
      mockReducer.and.returnValue(expectedState);
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);

      const result = wrappedReducer(mockState, createMockAction());

      expect(result).toBe(expectedState);
    });

    it('should capture before-state for persistent local actions', () => {
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(mockState, action);

      expect(mockService.captureBeforeState).toHaveBeenCalledWith(action, mockState);
    });

    it('should NOT capture before-state for remote actions', () => {
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
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

      expect(mockService.captureBeforeState).not.toHaveBeenCalled();
    });

    it('should NOT capture before-state for non-persistent actions', () => {
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      const action = createNonPersistentAction();

      wrappedReducer(mockState, action);

      expect(mockService.captureBeforeState).not.toHaveBeenCalled();
    });

    it('should NOT capture when state is undefined (initial state)', () => {
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      wrappedReducer(undefined, action);

      expect(mockService.captureBeforeState).not.toHaveBeenCalled();
    });

    it('should work without service (graceful degradation)', () => {
      // Clear the service
      setStateChangeCaptureService(null as any);
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      const action = createMockAction();

      // Should not throw, just skip capture
      expect(() => wrappedReducer(mockState, action)).not.toThrow();
      expect(mockReducer).toHaveBeenCalledWith(mockState, action);
    });

    it('should capture before inner reducer modifies state', () => {
      let capturedState: unknown = null;
      mockService.captureBeforeState.and.callFake((_, state) => {
        capturedState = state;
      });

      const modifiedState = { ...mockState, modified: true };
      mockReducer.and.returnValue(modifiedState);

      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      wrappedReducer(mockState, createMockAction());

      // Captured state should be the original, not modified
      expect(capturedState).toBe(mockState);
      expect(capturedState).not.toBe(modifiedState);
    });
  });

  describe('action type filtering', () => {
    it('should capture for various persistent action types', () => {
      const wrappedReducer = stateCaptureMetaReducer(mockReducer);
      const actionTypes = [
        '[TaskShared] Add Task',
        '[TaskShared] Delete Task',
        '[Tag] Update Tag',
        '[Project] Add Project',
        '[SimpleCounter] Update Simple Counter',
      ];

      actionTypes.forEach((type) => {
        mockService.captureBeforeState.calls.reset();
        const action = createMockAction({ type });
        wrappedReducer(mockState, action);
        expect(mockService.captureBeforeState).toHaveBeenCalled();
      });
    });
  });
});
