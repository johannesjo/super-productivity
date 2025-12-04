import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { OperationLogEffects } from './operation-log.effects';
import { OperationLogStoreService } from './store/operation-log-store.service';
import { LockService } from './sync/lock.service';
import { VectorClockService } from './sync/vector-clock.service';
import { OperationLogCompactionService } from './store/operation-log-compaction.service';
import { MultiTabCoordinatorService } from './sync/multi-tab-coordinator.service';
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
  let mockMultiTabCoordinator: jasmine.SpyObj<MultiTabCoordinatorService>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockInjector: jasmine.SpyObj<Injector>;

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
    ]);
    mockMultiTabCoordinator = jasmine.createSpyObj('MultiTabCoordinatorService', [
      'notifyNewOperation',
    ]);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockInjector = jasmine.createSpyObj('Injector', ['get']);

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
    mockInjector.get.and.returnValue(mockPfapiService);

    TestBed.configureTestingModule({
      providers: [
        OperationLogEffects,
        provideMockActions(() => actions$),
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: LockService, useValue: mockLockService },
        { provide: VectorClockService, useValue: mockVectorClockService },
        { provide: OperationLogCompactionService, useValue: mockCompactionService },
        { provide: MultiTabCoordinatorService, useValue: mockMultiTabCoordinator },
        { provide: SnackService, useValue: mockSnackService },
        { provide: Injector, useValue: mockInjector },
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

    it('should broadcast operation to other tabs', (done) => {
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          expect(mockMultiTabCoordinator.notifyNewOperation).toHaveBeenCalledWith(
            jasmine.objectContaining({
              actionType: '[Task] Update Task',
            }),
          );
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
          expect(operation.payload).toEqual({
            title: 'Updated Title',
            done: true,
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

    it('should handle quota exceeded error specially', (done) => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      mockOpLogStore.append.and.rejectWith(quotaError);
      const action = createPersistentAction('[Task] Update Task');
      actions$ = of(action);

      effects.persistOperation$.subscribe({
        complete: () => {
          // Quota exceeded triggers emergency compaction
          setTimeout(() => {
            expect(mockCompactionService.compact).toHaveBeenCalled();
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
  });
});
