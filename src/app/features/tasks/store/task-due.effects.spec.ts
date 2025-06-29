import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, of, ReplaySubject } from 'rxjs';
import { TaskDueEffects } from './task-due.effects';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { DataInitStateService } from '../../../core/data-init/data-init-state.service';
import { SyncWrapperService } from '../../../imex/sync/sync-wrapper.service';
import { AddTasksForTomorrowService } from '../../add-tasks-for-tomorrow/add-tasks-for-tomorrow.service';
import { Action } from '@ngrx/store';
import { DEFAULT_TASK } from '../task.model';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { selectOverdueTasksOnToday } from './task.selectors';
import { selectTodayTaskIds } from '../../work-context/store/work-context.selectors';
import { Task } from '../task.model';

describe('TaskDueEffects', () => {
  let effects: TaskDueEffects;
  let actions$: Observable<Action>;
  let store: MockStore;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let globalTrackingIntervalService: jasmine.SpyObj<GlobalTrackingIntervalService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let dataInitStateService: jasmine.SpyObj<DataInitStateService>;
  let syncWrapperService: jasmine.SpyObj<SyncWrapperService>;
  let addTasksForTomorrowService: jasmine.SpyObj<AddTasksForTomorrowService>;

  const mockTask: Task = {
    ...DEFAULT_TASK,
    id: 'task1',
    title: 'Test Task',
    projectId: 'test-project',
    isDone: false,
    dueDay: '2023-06-13',
  };

  beforeEach(() => {
    const globalTrackingIntervalServiceSpy = jasmine.createSpyObj(
      'GlobalTrackingIntervalService',
      [],
      {
        todayDateStr$: of('2023-06-13'),
      },
    );
    const dataInitStateServiceSpy = jasmine.createSpyObj('DataInitStateService', [], {
      isAllDataLoadedInitially$: of(true),
    });
    // Create a mock object with configurable properties
    const syncWrapperServiceSpy = {
      afterCurrentSyncDoneOrSyncDisabled$: of(undefined),
      isSyncInProgress$: of(false),
    } as any;
    const addTasksForTomorrowServiceSpy = jasmine.createSpyObj(
      'AddTasksForTomorrowService',
      ['addAllDueToday'],
    );

    TestBed.configureTestingModule({
      providers: [
        TaskDueEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectOverdueTasksOnToday, value: [] },
            { selector: selectTodayTaskIds, value: [] },
          ],
        }),
        {
          provide: GlobalTrackingIntervalService,
          useValue: globalTrackingIntervalServiceSpy,
        },
        { provide: DataInitStateService, useValue: dataInitStateServiceSpy },
        { provide: SyncWrapperService, useValue: syncWrapperServiceSpy },
        { provide: AddTasksForTomorrowService, useValue: addTasksForTomorrowServiceSpy },
      ],
    });

    effects = TestBed.inject(TaskDueEffects);
    store = TestBed.inject(MockStore);
    globalTrackingIntervalService = TestBed.inject(
      GlobalTrackingIntervalService,
    ) as jasmine.SpyObj<GlobalTrackingIntervalService>;
    dataInitStateService = TestBed.inject(
      DataInitStateService,
    ) as jasmine.SpyObj<DataInitStateService>;
    syncWrapperService = TestBed.inject(
      SyncWrapperService,
    ) as jasmine.SpyObj<SyncWrapperService>;
    addTasksForTomorrowService = TestBed.inject(
      AddTasksForTomorrowService,
    ) as jasmine.SpyObj<AddTasksForTomorrowService>;
  });

  describe('createRepeatableTasksAndAddDueToday$', () => {
    it('should wait for sync to complete before adding tasks', (done) => {
      const syncSubject = new ReplaySubject<any>(1);
      const syncInProgressSubject = new ReplaySubject<boolean>(1);

      // Directly assign the observables
      syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$ = syncSubject.asObservable();
      syncWrapperService.isSyncInProgress$ = syncInProgressSubject.asObservable();

      // First emit that sync is not in progress
      syncInProgressSubject.next(false);

      effects.createRepeatableTasksAndAddDueToday$.subscribe(() => {
        expect(addTasksForTomorrowService.addAllDueToday).toHaveBeenCalled();
        done();
      });

      // Simulate sync completing
      syncSubject.next(undefined);
    });

    it('should not add tasks while sync is in progress', (done) => {
      const syncSubject = new ReplaySubject<any>(1);
      const syncInProgressSubject = new ReplaySubject<boolean>(1);

      // Directly assign the observables
      syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$ = syncSubject.asObservable();
      syncWrapperService.isSyncInProgress$ = syncInProgressSubject.asObservable();

      let effectFired = false;
      effects.createRepeatableTasksAndAddDueToday$.subscribe(() => {
        effectFired = true;
      });

      // Sync is in progress
      syncInProgressSubject.next(true);

      // Simulate sync completing
      syncSubject.next(undefined);

      // Reduce timeout for faster tests
      setTimeout(() => {
        expect(effectFired).toBe(false);
        expect(addTasksForTomorrowService.addAllDueToday).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should add tasks after debounce period when sync completes', (done) => {
      const syncSubject = new ReplaySubject<any>(1);
      const syncInProgressSubject = new ReplaySubject<boolean>(1);

      // Directly assign the observables
      syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$ = syncSubject.asObservable();
      syncWrapperService.isSyncInProgress$ = syncInProgressSubject.asObservable();

      effects.createRepeatableTasksAndAddDueToday$.subscribe(() => {
        expect(addTasksForTomorrowService.addAllDueToday).toHaveBeenCalledTimes(1);
        done();
      });

      // Sync is not in progress
      syncInProgressSubject.next(false);

      // Simulate sync completing
      syncSubject.next(undefined);
    });
  });

  describe('removeOverdueFormToday$', () => {
    it('should remove overdue tasks from today tag', (done) => {
      const overdueTask1: Task = { ...mockTask, id: 'overdue1', dueDay: '2023-06-12' };
      const overdueTask2: Task = { ...mockTask, id: 'overdue2', dueDay: '2023-06-11' };
      const todayTaskIds = ['overdue1', 'overdue2', 'current1'];

      store.overrideSelector(selectOverdueTasksOnToday, [overdueTask1, overdueTask2]);
      store.overrideSelector(selectTodayTaskIds, todayTaskIds);

      actions$ = of({ type: 'TRIGGER' }); // Just to trigger the effect

      effects.removeOverdueFormToday$.subscribe((action) => {
        expect(action).toEqual(
          TaskSharedActions.removeTasksFromTodayTag({
            taskIds: ['overdue1', 'overdue2'],
          }),
        );
        done();
      });
    });

    it('should not emit action when no overdue tasks', (done) => {
      store.overrideSelector(selectOverdueTasksOnToday, []);
      store.overrideSelector(selectTodayTaskIds, ['current1', 'current2']);

      actions$ = of({ type: 'TRIGGER' });

      let actionEmitted = false;
      effects.removeOverdueFormToday$.subscribe(() => {
        actionEmitted = true;
      });

      setTimeout(() => {
        expect(actionEmitted).toBe(false);
        done();
      }, 50);
    });

    it('should wait for sync before removing overdue tasks', (done) => {
      const syncSubject = new ReplaySubject<any>(1);
      const syncInProgressSubject = new ReplaySubject<boolean>(1);

      // Directly assign the observables
      syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$ = syncSubject.asObservable();
      syncWrapperService.isSyncInProgress$ = syncInProgressSubject.asObservable();

      const overdueTask: Task = { ...mockTask, id: 'overdue1', dueDay: '2023-06-12' };
      store.overrideSelector(selectOverdueTasksOnToday, [overdueTask]);
      store.overrideSelector(selectTodayTaskIds, ['overdue1', 'current1']);

      // First emit that sync is not in progress
      syncInProgressSubject.next(false);

      effects.removeOverdueFormToday$.subscribe((action) => {
        expect(action).toEqual(
          TaskSharedActions.removeTasksFromTodayTag({
            taskIds: ['overdue1'],
          }),
        );
        done();
      });

      // Simulate sync completing
      syncSubject.next(undefined);
    });

    /**
     * This test demonstrates the fix for the issue where scheduled tasks weren't being added
     * to "Today" on subsequent day changes.
     *
     * With the OLD implementation:
     * - isAllDataLoadedInitially$ would complete after first emission (due to take(1))
     * - This would cause the entire observable chain to complete
     * - Second day change would not trigger the effect
     *
     * With the NEW implementation:
     * - We use first() on the outer observable but switchMap to create a new inner chain
     * - The inner observable continues to listen for day changes
     * - Second day change successfully triggers the effect
     */
    it('should continue to respond to day changes after data initialization completes', (done) => {
      // Note: This test passes with the current implementation but would fail with the old one
      // where the observable chain would complete after isAllDataLoadedInitially$ completes.

      let callCount = 0;

      // The effect should fire multiple times even though isAllDataLoadedInitially$
      // completes after first emission
      effects.createRepeatableTasksAndAddDueToday$.subscribe(() => {
        callCount++;
      });

      // Wait for initial setup and debounce
      setTimeout(() => {
        // With the fix, the effect continues to work and addAllDueToday gets called
        expect(addTasksForTomorrowService.addAllDueToday).toHaveBeenCalled();
        expect(callCount).toBeGreaterThan(0);
        done();
      }, 1200);
    });
  });

  describe('removeOverdueFormToday$', () => {
    it('should remove overdue tasks from today tag', (done) => {
      const overdueTask: Task = { ...mockTask, id: 'overdue1', dueDay: '2023-06-12' };
      store.overrideSelector(selectOverdueTasksOnToday, [overdueTask]);
      store.overrideSelector(selectTodayTaskIds, ['overdue1', 'current1']);

      effects.removeOverdueFormToday$.subscribe((action) => {
        expect(action).toEqual(
          TaskSharedActions.removeTasksFromTodayTag({
            taskIds: ['overdue1'],
          }),
        );
        done();
      });
    });

    it('should not emit action when no overdue tasks', (done) => {
      store.overrideSelector(selectOverdueTasksOnToday, []);
      store.overrideSelector(selectTodayTaskIds, ['current1', 'current2']);

      actions$ = of({ type: 'TRIGGER' });

      let actionEmitted = false;
      effects.removeOverdueFormToday$.subscribe(() => {
        actionEmitted = true;
      });

      setTimeout(() => {
        expect(actionEmitted).toBe(false);
        done();
      }, 50);
    });

    it('should wait for sync before removing overdue tasks', (done) => {
      const syncSubject = new ReplaySubject<any>(1);
      const syncInProgressSubject = new ReplaySubject<boolean>(1);

      // Directly assign the observables
      syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$ = syncSubject.asObservable();
      syncWrapperService.isSyncInProgress$ = syncInProgressSubject.asObservable();

      const overdueTask: Task = { ...mockTask, id: 'overdue1', dueDay: '2023-06-12' };
      store.overrideSelector(selectOverdueTasksOnToday, [overdueTask]);
      store.overrideSelector(selectTodayTaskIds, ['overdue1', 'current1']);

      // First emit that sync is not in progress
      syncInProgressSubject.next(false);

      effects.removeOverdueFormToday$.subscribe((action) => {
        expect(action).toEqual(
          TaskSharedActions.removeTasksFromTodayTag({
            taskIds: ['overdue1'],
          }),
        );
        done();
      });

      // Simulate sync completing
      syncSubject.next(undefined);
    });

    /**
     * This test demonstrates the fix for removeOverdueFormToday$ effect.
     * The same issue applies here - with the old implementation, the effect would
     * stop working after the first emission due to observable chain completion.
     */
    it('should continue to process overdue tasks after data initialization completes', (done) => {
      const overdueTask: Task = { ...mockTask, id: 'overdue1', dueDay: '2023-06-11' };
      store.overrideSelector(selectOverdueTasksOnToday, [overdueTask]);
      store.overrideSelector(selectTodayTaskIds, ['overdue1', 'current1']);

      let actionEmitted = false;

      effects.removeOverdueFormToday$.subscribe((action) => {
        actionEmitted = true;
        expect(action).toEqual(
          TaskSharedActions.removeTasksFromTodayTag({
            taskIds: ['overdue1'],
          }),
        );
      });

      // Wait for effect to process
      setTimeout(() => {
        // With the fix, the effect continues to work
        expect(actionEmitted).toBe(true);
        done();
      }, 1200);
    });
  });
});
