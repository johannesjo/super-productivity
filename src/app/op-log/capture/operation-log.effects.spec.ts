import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { OperationLogEffects } from './operation-log.effects';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from '../sync/lock.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { OperationLogCompactionService } from '../store/operation-log-compaction.service';
import { SnackService } from '../../core/snack/snack.service';
import { Injector } from '@angular/core';
import { ImmediateUploadService } from '../sync/immediate-upload.service';
import { HydrationStateService } from '../apply/hydration-state.service';
import { ActionType, OpType } from '../core/operation.types';
import { PersistentAction } from '../core/persistent-action.interface';
import { COMPACTION_THRESHOLD } from '../core/operation-log.const';
import {
  bufferDeferredAction,
  clearDeferredActions,
} from './operation-capture.meta-reducer';

describe('OperationLogEffects', () => {
  let effects: OperationLogEffects;
  let actions$: Observable<Action>;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockLockService: jasmine.SpyObj<LockService>;
  let mockVectorClockService: jasmine.SpyObj<VectorClockService>;
  let mockCompactionService: jasmine.SpyObj<OperationLogCompactionService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockInjector: jasmine.SpyObj<Injector>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockImmediateUploadService: jasmine.SpyObj<ImmediateUploadService>;
  let mockHydrationStateService: jasmine.SpyObj<HydrationStateService>;

  const mockPfapiService = {
    pf: {
      metaModel: {
        loadClientId: jasmine.createSpy().and.returnValue(Promise.resolve('testClient')),
        incrementVectorClockForLocalChange: jasmine
          .createSpy()
          .and.returnValue(Promise.resolve()),
      },
      isSyncInProgress: false,
    },
  };

  const createPersistentAction = (
    type: string,
    isRemote: boolean = false,
    payload: Record<string, unknown> = {},
  ): PersistentAction => ({
    type,
    meta: {
      isPersistent: true,
      isRemote,
      opType: OpType.Update,
      entityType: 'TASK',
      entityId: 'task-1',
    },
    ...payload,
  });

  beforeEach(() => {
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'append',
      'appendWithVectorClockUpdate',
      'getCompactionCounter',
    ]);
    mockLockService = jasmine.createSpyObj('LockService', ['request']);
    mockVectorClockService = jasmine.createSpyObj('VectorClockService', [
      'getCurrentVectorClock',
    ]);
    mockCompactionService = jasmine.createSpyObj('OperationLogCompactionService', [
      'compact',
      'emergencyCompact',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockInjector = jasmine.createSpyObj('Injector', ['get']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    mockImmediateUploadService = jasmine.createSpyObj('ImmediateUploadService', [
      'trigger',
    ]);
    mockHydrationStateService = jasmine.createSpyObj('HydrationStateService', [
      'isApplyingRemoteOps',
    ]);

    // Default mock implementations
    mockHydrationStateService.isApplyingRemoteOps.and.returnValue(false);
    mockLockService.request.and.callFake(
      async (_name: string, fn: () => Promise<void>) => {
        await fn();
      },
    );
    mockOpLogStore.append.and.returnValue(Promise.resolve(1));
    mockOpLogStore.appendWithVectorClockUpdate.and.returnValue(Promise.resolve(1));
    mockOpLogStore.getCompactionCounter.and.returnValue(Promise.resolve(0));
    mockVectorClockService.getCurrentVectorClock.and.returnValue(
      Promise.resolve({ testClient: 5 }),
    );
    mockCompactionService.compact.and.returnValue(Promise.resolve());
    mockCompactionService.emergencyCompact.and.returnValue(Promise.resolve(true));
    mockInjector.get.and.returnValue(mockPfapiService);
    mockStore.select.and.returnValue(of({})); // Return empty state observable

    TestBed.configureTestingModule({
      providers: [
        OperationLogEffects,
        provideMockActions(() => actions$),
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: LockService, useValue: mockLockService },
        { provide: VectorClockService, useValue: mockVectorClockService },
        { provide: OperationLogCompactionService, useValue: mockCompactionService },
        { provide: SnackService, useValue: mockSnackService },
        { provide: Injector, useValue: mockInjector },
        { provide: Store, useValue: mockStore },
        { provide: ImmediateUploadService, useValue: mockImmediateUploadService },
        { provide: HydrationStateService, useValue: mockHydrationStateService },
      ],
    });

    effects = TestBed.inject(OperationLogEffects);

    // Clear deferred actions buffer to ensure test isolation
    clearDeferredActions();
  });

  afterEach(() => {
    // Clean up deferred actions buffer after each test
    clearDeferredActions();
  });

  describe('persistOperation$', () => {
    it('should persist operation for persistent action', (done) => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledWith(
            jasmine.objectContaining({
              actionType: ActionType.TASK_SHARED_UPDATE,
              opType: OpType.Update,
              entityType: 'TASK',
              clientId: 'testClient',
            }),
            'local',
          );
          done();
        },
      });
    });

    it('should skip remote actions', (done) => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE, true);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.appendWithVectorClockUpdate).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should skip non-persistent actions', (done) => {
      const action = { type: '[Task] Regular Action' };
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.appendWithVectorClockUpdate).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should skip actions when isApplyingRemoteOps is true (sync in progress)', (done) => {
      // This is the critical fix: user actions during sync replay should NOT be persisted
      // because the meta-reducer skips enqueueing entity changes, resulting in corrupted ops
      mockHydrationStateService.isApplyingRemoteOps.and.returnValue(true);
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          // Should NOT persist when sync is applying remote operations
          expect(mockOpLogStore.appendWithVectorClockUpdate).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should persist actions when isApplyingRemoteOps becomes false after sync', (done) => {
      // First action during sync - should be skipped
      mockHydrationStateService.isApplyingRemoteOps.and.returnValue(true);
      const action1 = createPersistentAction(ActionType.TASK_SHARED_ADD);
      actions$ = of(action1);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.appendWithVectorClockUpdate).not.toHaveBeenCalled();

          // Second action after sync completes - should be persisted
          mockHydrationStateService.isApplyingRemoteOps.and.returnValue(false);
          const action2 = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
          actions$ = of(action2);

          effects.persistOperation$.subscribe({
            complete: () => {
              expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledWith(
                jasmine.objectContaining({
                  actionType: ActionType.TASK_SHARED_UPDATE,
                }),
                'local',
              );
              done();
            },
          });
        },
      });
    });

    it('should check isApplyingRemoteOps for each action independently', (done) => {
      // This test verifies the filter is evaluated per-action, not just once
      let callCount = 0;
      mockHydrationStateService.isApplyingRemoteOps.and.callFake(() => {
        callCount++;
        // First call returns true (sync in progress), second returns false
        return callCount === 1;
      });

      const action1 = createPersistentAction(ActionType.TASK_SHARED_ADD);
      const action2 = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action1, action2);

      effects.persistOperation$.subscribe({
        complete: () => {
          // isApplyingRemoteOps should have been called twice (once per action)
          expect(mockHydrationStateService.isApplyingRemoteOps).toHaveBeenCalledTimes(2);
          // Only second action should be persisted (first was during sync)
          expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledTimes(1);
          expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledWith(
            jasmine.objectContaining({
              actionType: ActionType.TASK_SHARED_UPDATE,
            }),
            'local',
          );
          done();
        },
      });
    });

    it('should acquire lock before writing operation', (done) => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockLockService.request).toHaveBeenCalledWith(
            'sp_op_log',
            jasmine.any(Function),
          );
          done();
        },
      });
    });

    it('should increment vector clock', (done) => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockVectorClockService.getCurrentVectorClock).toHaveBeenCalled();
          const appendCall =
            mockOpLogStore.appendWithVectorClockUpdate.calls.mostRecent();
          const operation = appendCall.args[0];
          expect(operation.vectorClock['testClient']).toBe(6); // Incremented from 5
          done();
        },
      });
    });

    // Note: Tests for incrementVectorClockForLocalChange have been removed.
    // Vector clock updates are now handled atomically within appendWithVectorClockUpdate.

    it('should trigger compaction when threshold reached', (done) => {
      // Counter starts at threshold - 1, after increment it reaches threshold
      mockOpLogStore.getCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD - 1),
      );
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          // Allow async compaction to be triggered
          setTimeout(() => {
            expect(mockCompactionService.compact).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should not trigger compaction when below threshold', (done) => {
      // Counter starts at threshold - 2, after increment it's still below threshold
      mockOpLogStore.getCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD - 2),
      );
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockCompactionService.compact).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should include payload from action', (done) => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE, false, {
        title: 'Updated Title',
        done: true,
      });
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          const appendCall =
            mockOpLogStore.appendWithVectorClockUpdate.calls.mostRecent();
          const operation = appendCall.args[0];
          // Payload now uses MultiEntityPayload structure with actionPayload and entityChanges
          expect(operation.payload).toEqual({
            actionPayload: { title: 'Updated Title', done: true },
            entityChanges: jasmine.any(Array),
          });
          done();
        },
      });
    });

    it('should notify user on persistence error', (done) => {
      mockOpLogStore.appendWithVectorClockUpdate.and.rejectWith(
        new Error('Write failed'),
      );
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockSnackService.open).toHaveBeenCalledWith(
            jasmine.objectContaining({
              type: 'ERROR',
            }),
          );
          done();
        },
      });
    });

    it('should handle quota exceeded error with emergency compaction and retry', (done) => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      // First call fails with quota error, second call (retry) succeeds
      let callCount = 0;
      mockOpLogStore.appendWithVectorClockUpdate.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(quotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          // Quota exceeded triggers emergency compaction and retry
          setTimeout(() => {
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            // Should have tried to append twice (initial + retry after compaction)
            expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledTimes(2);
            done();
          }, 10);
        },
      });
    });

    it('should cache clientId after first load', (done) => {
      // Reset the spy counter
      mockPfapiService.pf.metaModel.loadClientId.calls.reset();

      // Emit two actions
      const action1 = createPersistentAction(ActionType.TASK_SHARED_ADD);
      const action2 = createPersistentAction(ActionType.TASK_SHARED_UPDATE);

      // Subscribe and emit first action
      actions$ = of(action1);
      effects.persistOperation$.subscribe({
        complete: () => {
          // Emit second action
          actions$ = of(action2);
          effects.persistOperation$.subscribe({
            complete: () => {
              // ClientId should only be loaded once
              expect(mockPfapiService.pf.metaModel.loadClientId).toHaveBeenCalledTimes(1);
              done();
            },
          });
        },
      });
    });

    it('should show error when retry after emergency compaction fails with quota error', (done) => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      // All attempts fail with quota error (nested quota failure)
      mockOpLogStore.appendWithVectorClockUpdate.and.returnValue(
        Promise.reject(quotaError),
      );
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Emergency compaction should be attempted
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            // User should be notified of quota exceeded
            expect(mockSnackService.open).toHaveBeenCalledWith(
              jasmine.objectContaining({
                type: 'ERROR',
              }),
            );
            done();
          }, 20);
        },
      });
    });

    it('should abort immediately when quota error during retry (circuit breaker)', (done) => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      // First call fails with quota, emergency compaction succeeds, retry also fails with quota
      mockOpLogStore.appendWithVectorClockUpdate.and.callFake(() => {
        return Promise.reject(quotaError);
      });
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should have tried twice (initial + one retry after compaction)
            expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledTimes(2);
            // Should not trigger recursive compaction
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalledTimes(1);
            // User should see error snackbar
            expect(mockSnackService.open).toHaveBeenCalled();
            done();
          }, 20);
        },
      });
    });

    it('should show error when emergency compaction itself fails', (done) => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      mockOpLogStore.appendWithVectorClockUpdate.and.returnValue(
        Promise.reject(quotaError),
      );
      // Emergency compaction fails
      mockCompactionService.emergencyCompact.and.returnValue(Promise.resolve(false));
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            // No retry after failed compaction
            expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledTimes(1);
            // User should be notified
            expect(mockSnackService.open).toHaveBeenCalledWith(
              jasmine.objectContaining({
                type: 'ERROR',
              }),
            );
            done();
          }, 20);
        },
      });
    });

    it('should handle Firefox-style quota error name', (done) => {
      const firefoxQuotaError = new DOMException(
        'Quota exceeded',
        'NS_ERROR_DOM_QUOTA_REACHED',
      );
      let callCount = 0;
      mockOpLogStore.appendWithVectorClockUpdate.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(firefoxQuotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should recognize Firefox quota error and trigger compaction
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            done();
          }, 20);
        },
      });
    });

    it('should handle legacy Safari quota error code', (done) => {
      // Create a mock error object that simulates legacy Safari's quota error
      // DOMException.code is read-only, so we create a custom error object
      const safariQuotaError = Object.create(DOMException.prototype, {
        name: { value: 'UnknownError', enumerable: true },
        message: { value: 'Quota exceeded', enumerable: true },
        code: { value: 22, enumerable: true },
      }) as DOMException;

      let callCount = 0;
      mockOpLogStore.appendWithVectorClockUpdate.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(safariQuotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should recognize Safari quota error and trigger compaction
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            done();
          }, 20);
        },
      });
    });

    it('should not treat regular DOMException as quota error', (done) => {
      const regularError = new DOMException('Read failed', 'NotReadableError');
      mockOpLogStore.appendWithVectorClockUpdate.and.returnValue(
        Promise.reject(regularError),
      );
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should NOT trigger emergency compaction for non-quota errors
            expect(mockCompactionService.emergencyCompact).not.toHaveBeenCalled();
            // Should still show error snackbar
            expect(mockSnackService.open).toHaveBeenCalledWith(
              jasmine.objectContaining({
                type: 'ERROR',
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should show success message after recovery from quota exceeded', (done) => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      let callCount = 0;
      mockOpLogStore.appendWithVectorClockUpdate.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(quotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should show success message after recovery
            expect(mockSnackService.open).toHaveBeenCalledWith(
              jasmine.objectContaining({
                type: 'SUCCESS',
              }),
            );
            done();
          }, 20);
        },
      });
    });
  });

  describe('compaction failures', () => {
    it('should track compaction failures', (done) => {
      // Counter starts at threshold - 1, after increment it reaches threshold
      mockOpLogStore.getCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD - 1),
      );
      mockCompactionService.compact.and.returnValue(Promise.reject(new Error('Failed')));

      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(mockCompactionService.compact).toHaveBeenCalled();
            done();
          }, 20);
        },
      });
    });

    it('should reset failure count on successful compaction', (done) => {
      // Counter starts at threshold - 1, after increment it reaches threshold
      mockOpLogStore.getCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD - 1),
      );
      mockCompactionService.compact.and.returnValue(Promise.resolve());

      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // No snackbar for successful compaction
            const allCalls = mockSnackService.open.calls.all();
            const errorCalls = allCalls.filter((call) => {
              const arg = call.args[0];
              return (
                typeof arg === 'object' &&
                arg !== null &&
                'type' in arg &&
                arg.type === 'ERROR'
              );
            });
            expect(errorCalls.length).toBe(0);
            done();
          }, 20);
        },
      });
    });
  });

  describe('processDeferredActions', () => {
    /**
     * Tests for processing deferred actions that were buffered during sync.
     * When users interact with the app during sync replay, those actions
     * are buffered by the meta-reducer. This method processes them after
     * sync completes with fresh vector clocks.
     */

    it('should do nothing when no deferred actions are buffered', async () => {
      await effects.processDeferredActions();

      expect(mockOpLogStore.appendWithVectorClockUpdate).not.toHaveBeenCalled();
    });

    it('should process a single deferred action', async () => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      bufferDeferredAction(action);

      await effects.processDeferredActions();

      expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledWith(
        jasmine.objectContaining({
          actionType: ActionType.TASK_SHARED_UPDATE,
          clientId: 'testClient',
        }),
        'local',
      );
    });

    it('should process multiple deferred actions in order', async () => {
      const action1 = createPersistentAction(ActionType.TASK_SHARED_ADD);
      const action2 = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      const action3 = createPersistentAction(ActionType.TASK_SHARED_DELETE);

      bufferDeferredAction(action1);
      bufferDeferredAction(action2);
      bufferDeferredAction(action3);

      await effects.processDeferredActions();

      expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledTimes(3);

      const calls = mockOpLogStore.appendWithVectorClockUpdate.calls.all();
      expect(calls[0].args[0].actionType).toBe(ActionType.TASK_SHARED_ADD);
      expect(calls[1].args[0].actionType).toBe(ActionType.TASK_SHARED_UPDATE);
      expect(calls[2].args[0].actionType).toBe(ActionType.TASK_SHARED_DELETE);
    });

    it('should clear buffer after processing', async () => {
      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      bufferDeferredAction(action);

      await effects.processDeferredActions();

      // Call again - should not process anything (buffer cleared)
      mockOpLogStore.appendWithVectorClockUpdate.calls.reset();
      await effects.processDeferredActions();

      expect(mockOpLogStore.appendWithVectorClockUpdate).not.toHaveBeenCalled();
    });

    it('should continue processing remaining actions when one fails', async () => {
      const action1 = createPersistentAction(ActionType.TASK_SHARED_ADD);
      const action2 = createPersistentAction(ActionType.TASK_SHARED_UPDATE);

      bufferDeferredAction(action1);
      bufferDeferredAction(action2);

      // First action fails, second succeeds
      let callCount = 0;
      mockOpLogStore.appendWithVectorClockUpdate.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First action failed'));
        }
        return Promise.resolve(1);
      });

      // Should not throw - errors are logged but don't stop processing
      await expectAsync(effects.processDeferredActions()).toBeResolved();

      // Both actions should have been attempted
      expect(mockOpLogStore.appendWithVectorClockUpdate).toHaveBeenCalledTimes(2);
    });

    it('should use fresh vector clock for deferred actions', async () => {
      // Set up vector clock to return a specific value
      mockVectorClockService.getCurrentVectorClock.and.returnValue(
        Promise.resolve({ testClient: 100, otherClient: 50 }),
      );

      const action = createPersistentAction(ActionType.TASK_SHARED_UPDATE);
      bufferDeferredAction(action);

      await effects.processDeferredActions();

      const appendCall = mockOpLogStore.appendWithVectorClockUpdate.calls.mostRecent();
      const operation = appendCall.args[0];

      // Vector clock should be incremented from current value (includes remote ops)
      expect(operation.vectorClock['testClient']).toBe(101);
      expect(operation.vectorClock['otherClient']).toBe(50);
    });
  });
});
