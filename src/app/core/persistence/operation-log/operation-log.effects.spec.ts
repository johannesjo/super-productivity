import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { OperationLogEffects } from './operation-log.effects';
import { OperationLogStoreService } from './store/operation-log-store.service';
import { LockService } from './sync/lock.service';
import { VectorClockService } from './sync/vector-clock.service';
import { OperationLogCompactionService } from './store/operation-log-compaction.service';
import { SnackService } from '../../snack/snack.service';
import { Injector } from '@angular/core';
import { OpType } from './operation.types';
import { PersistentAction } from './persistent-action.interface';
import { COMPACTION_THRESHOLD } from './operation-log.const';

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
      'incrementCompactionCounter',
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

    // Default mock implementations
    mockLockService.request.and.callFake(
      async (_name: string, fn: () => Promise<void>) => {
        await fn();
      },
    );
    mockOpLogStore.append.and.returnValue(Promise.resolve(1));
    mockOpLogStore.incrementCompactionCounter.and.returnValue(Promise.resolve(0));
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
      ],
    });

    effects = TestBed.inject(OperationLogEffects);
  });

  describe('persistOperation$', () => {
    it('should persist operation for persistent action', (done) => {
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.append).toHaveBeenCalledWith(
            jasmine.objectContaining({
              actionType: '[Task] Update Task',
              opType: OpType.Update,
              entityType: 'TASK',
              clientId: 'testClient',
            }),
          );
          done();
        },
      });
    });

    it('should skip remote actions', (done) => {
      const action = createPersistentAction('[Task] Update Task', true);
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.append).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should skip non-persistent actions', (done) => {
      const action = { type: '[Task] Regular Action' };
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockOpLogStore.append).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should acquire lock before writing operation', (done) => {
      const action = createPersistentAction('[Task] Update Task');
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
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockVectorClockService.getCurrentVectorClock).toHaveBeenCalled();
          const appendCall = mockOpLogStore.append.calls.mostRecent();
          const operation = appendCall.args[0];
          expect(operation.vectorClock['testClient']).toBe(6); // Incremented from 5
          done();
        },
      });
    });

    it('should update PFAPI vector clock when not syncing', (done) => {
      mockPfapiService.pf.isSyncInProgress = false;
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(
            mockPfapiService.pf.metaModel.incrementVectorClockForLocalChange,
          ).toHaveBeenCalledWith('testClient');
          done();
        },
      });
    });

    it('should skip PFAPI update when sync is in progress', (done) => {
      // Reset the spy from previous tests
      mockPfapiService.pf.metaModel.incrementVectorClockForLocalChange.calls.reset();
      mockPfapiService.pf.isSyncInProgress = true;
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(
            mockPfapiService.pf.metaModel.incrementVectorClockForLocalChange,
          ).not.toHaveBeenCalled();
          // Restore for other tests
          mockPfapiService.pf.isSyncInProgress = false;
          done();
        },
      });
    });

    it('should trigger compaction when threshold reached', (done) => {
      mockOpLogStore.incrementCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD),
      );
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.incrementCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD - 1),
      );
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockCompactionService.compact).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should include payload from action', (done) => {
      const action = createPersistentAction('[Task] Update Task', false, {
        title: 'Updated Title',
        done: true,
      });
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          const appendCall = mockOpLogStore.append.calls.mostRecent();
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
      mockOpLogStore.append.and.rejectWith(new Error('Write failed'));
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.append.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(quotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          // Quota exceeded triggers emergency compaction and retry
          setTimeout(() => {
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            // Should have tried to append twice (initial + retry after compaction)
            expect(mockOpLogStore.append).toHaveBeenCalledTimes(2);
            done();
          }, 10);
        },
      });
    });

    it('should cache clientId after first load', (done) => {
      // Reset the spy counter
      mockPfapiService.pf.metaModel.loadClientId.calls.reset();

      // Emit two actions
      const action1 = createPersistentAction('[Task] Action 1');
      const action2 = createPersistentAction('[Task] Action 2');

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
      mockOpLogStore.append.and.returnValue(Promise.reject(quotaError));
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.append.and.callFake(() => {
        return Promise.reject(quotaError);
      });
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should have tried twice (initial + one retry after compaction)
            expect(mockOpLogStore.append).toHaveBeenCalledTimes(2);
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
      mockOpLogStore.append.and.returnValue(Promise.reject(quotaError));
      // Emergency compaction fails
      mockCompactionService.emergencyCompact.and.returnValue(Promise.resolve(false));
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(mockCompactionService.emergencyCompact).toHaveBeenCalled();
            // No retry after failed compaction
            expect(mockOpLogStore.append).toHaveBeenCalledTimes(1);
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
      mockOpLogStore.append.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(firefoxQuotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.append.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(safariQuotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.append.and.returnValue(Promise.reject(regularError));
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.append.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(quotaError);
        }
        return Promise.resolve(1);
      });
      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.incrementCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD),
      );
      mockCompactionService.compact.and.returnValue(Promise.reject(new Error('Failed')));

      const action = createPersistentAction('[Task] Update Task');
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
      mockOpLogStore.incrementCompactionCounter.and.returnValue(
        Promise.resolve(COMPACTION_THRESHOLD),
      );
      mockCompactionService.compact.and.returnValue(Promise.resolve());

      const action = createPersistentAction('[Task] Update Task');
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
});
