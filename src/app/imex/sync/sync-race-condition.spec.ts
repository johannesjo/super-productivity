import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Action } from '@ngrx/store';
import { TaskDueEffects } from '../../features/tasks/store/task-due.effects';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { SyncWrapperService } from './sync-wrapper.service';
import { AddTasksForTomorrowService } from '../../features/add-tasks-for-tomorrow/add-tasks-for-tomorrow.service';
import { provideMockStore } from '@ngrx/store/testing';

describe('Sync Race Condition - Repeating Tasks Recreation Bug', () => {
  // Helper function to replace await wait()
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const actions$: Observable<Action> = new Subject<Action>();
  let effects: TaskDueEffects;
  // let globalTrackingIntervalService: jasmine.SpyObj<GlobalTrackingIntervalService>;
  // let dataInitStateService: jasmine.SpyObj<DataInitStateService>;
  // let syncWrapperService: jasmine.SpyObj<SyncWrapperService>;
  let addTasksForTomorrowService: jasmine.SpyObj<AddTasksForTomorrowService>;

  // Subjects to control timing
  let todayDateStr$: BehaviorSubject<string>;
  let isAllDataLoadedInitially$: BehaviorSubject<boolean>;
  let afterCurrentSyncDoneOrSyncDisabled$: Subject<unknown>;
  let isSyncInProgress$: BehaviorSubject<boolean>;

  beforeEach(() => {
    // Create subjects for precise timing control
    todayDateStr$ = new BehaviorSubject<string>('2025-06-23');
    isAllDataLoadedInitially$ = new BehaviorSubject<boolean>(false);
    afterCurrentSyncDoneOrSyncDisabled$ = new Subject<unknown>();
    isSyncInProgress$ = new BehaviorSubject<boolean>(false);

    // Create spies
    const globalTrackingIntervalSpy = jasmine.createSpyObj(
      'GlobalTrackingIntervalService',
      [],
      {
        todayDateStr$: todayDateStr$.asObservable(),
      },
    );

    const dataInitStateSpy = jasmine.createSpyObj('DataInitStateService', [], {
      isAllDataLoadedInitially$: isAllDataLoadedInitially$.asObservable(),
    });

    const syncWrapperSpy = jasmine.createSpyObj('SyncWrapperService', [], {
      afterCurrentSyncDoneOrSyncDisabled$:
        afterCurrentSyncDoneOrSyncDisabled$.asObservable(),
      isSyncInProgress$: isSyncInProgress$.asObservable(),
    });

    const addTasksForTomorrowSpy = jasmine.createSpyObj('AddTasksForTomorrowService', [
      'addAllDueToday',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskDueEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: GlobalTrackingIntervalService, useValue: globalTrackingIntervalSpy },
        { provide: DataInitStateService, useValue: dataInitStateSpy },
        { provide: SyncWrapperService, useValue: syncWrapperSpy },
        { provide: AddTasksForTomorrowService, useValue: addTasksForTomorrowSpy },
      ],
    });

    effects = TestBed.inject(TaskDueEffects);
    // globalTrackingIntervalService = TestBed.inject(
    //   GlobalTrackingIntervalService,
    // ) as jasmine.SpyObj<GlobalTrackingIntervalService>;
    // dataInitStateService = TestBed.inject(
    //   DataInitStateService,
    // ) as jasmine.SpyObj<DataInitStateService>;
    // syncWrapperService = TestBed.inject(
    //   SyncWrapperService,
    // ) as jasmine.SpyObj<SyncWrapperService>;
    addTasksForTomorrowService = TestBed.inject(
      AddTasksForTomorrowService,
    ) as jasmine.SpyObj<AddTasksForTomorrowService>;
  });

  describe('Race Condition Reproduction', () => {
    xit('should reproduce the bug: tasks are created after sync but before data is fully loaded', async () => {
      // Step 1: Subscribe to the effect
      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Step 2: Simulate app startup sequence
      console.log('=== SIMULATING APP STARTUP ===');

      // Day change happens early
      console.log('1. DAY_CHANGE event');
      todayDateStr$.next('2025-06-23');

      // Initial data load (but sync hasn't happened yet)
      console.log('2. Initial data loaded (pre-sync)');
      isAllDataLoadedInitially$.next(true);
      await wait(0);

      // Step 3: Simulate first sync (UpdateLocal)
      console.log('3. Starting first sync (UpdateLocal)');
      isSyncInProgress$.next(true);
      await wait(0);

      // Sync downloads data from mobile (with deleted tasks)
      console.log('4. Sync downloading remote data...');
      await wait(50);

      // Sync completes
      console.log('5. First sync done (data downloaded but not fully processed)');
      isSyncInProgress$.next(false);
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);

      // The 1000ms debounce in the effect
      console.log('6. Waiting 1000ms debounce...');
      await wait(10);

      // At this point, the effect will check if sync is in progress (it's not)
      // and then call addAllDueToday()

      // Step 4: Verify the bug - tasks are created!
      expect(addTasksForTomorrowService.addAllDueToday).toHaveBeenCalledTimes(1);
      console.log('7. BUG: addAllDueToday() was called before data reinit!');

      // Step 5: Simulate what happens next - second sync
      console.log('8. Data reinit happens (too late)');
      // In real app, this would reload all data from IndexedDB

      console.log('9. Second sync starts (UpdateRemote)');
      isSyncInProgress$.next(true);
      await wait(0);

      console.log('10. Second sync uploads the incorrectly created tasks');

      effectSub.unsubscribe();
    });

    xit('should demonstrate the fix: wait for data reinit after sync', async () => {
      // This test shows what SHOULD happen

      // Create a new subject to simulate proper data reload
      const dataReloadComplete$ = new Subject<void>();

      // The fix would involve waiting for data reload after sync
      // For example, the effect should listen to a signal that indicates
      // the sync data has been fully processed into the app state

      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Startup sequence
      todayDateStr$.next('2025-06-23');
      isAllDataLoadedInitially$.next(true);
      await wait(0);

      // First sync
      isSyncInProgress$.next(true);
      await wait(50);
      isSyncInProgress$.next(false);

      // Sync completes but DON'T signal afterCurrentSyncDoneOrSyncDisabled$ yet
      console.log('Sync done but waiting for data reload...');

      // Simulate data reload
      await wait(50);
      console.log('Data reload complete');
      dataReloadComplete$.next();

      // NOW signal that sync is truly done
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);
      await wait(10);

      // With proper fix, addAllDueToday would be called here
      // after data is fully reloaded

      effectSub.unsubscribe();
    });
  });

  describe('Detailed Timeline Analysis', () => {
    xit('should show exact timing of events from the logs', async () => {
      // This test recreates the exact sequence from the logs

      const timeline: string[] = [];

      // Override spy to track calls
      addTasksForTomorrowService.addAllDueToday.and.callFake(async () => {
        timeline.push('addAllDueToday called');
        return 'ADDED' as const;
      });

      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Recreate exact sequence from logs
      timeline.push('DAY_CHANGE 2025-06-23');
      todayDateStr$.next('2025-06-23');

      timeline.push('[SP_ALL] Load(import) all data');
      isAllDataLoadedInitially$.next(true);
      await wait(0);

      timeline.push('sync(effect)..... INITIAL_SYNC_TRIGGER');
      timeline.push('_ Database.lock()');
      isSyncInProgress$.next(true);

      timeline.push('_ SyncService.sync(): __SYNC_START__ metaFileCheck UpdateLocal');
      await wait(10);

      timeline.push('_ ModelSyncService.updateLocalMainModelsFromRemoteMetaFile()');
      await wait(10);

      timeline.push('_ sync() result: Object');
      timeline.push('_ EV:syncDone');
      timeline.push('_ EV:syncStatusChange IN_SYNC');
      isSyncInProgress$.next(false);
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);

      timeline.push('[Task Shared] removeTasksFromTodayTag');
      await wait(10);

      timeline.push('_ Database.unlock()');

      // The debounce delay
      await wait(10);

      // This is where the bug happens
      timeline.push('[Task Shared] addTask - BUG!');

      // Verify timeline
      expect(timeline).toContain('addAllDueToday called');

      const syncDoneIndex = timeline.indexOf('_ EV:syncDone');
      const addTaskIndex = timeline.indexOf('addAllDueToday called');
      const databaseUnlockIndex = timeline.indexOf('_ Database.unlock()');

      // The bug: tasks are added after sync but potentially before full data processing
      expect(addTaskIndex).toBeGreaterThan(syncDoneIndex);
      expect(addTaskIndex).toBeGreaterThan(databaseUnlockIndex);

      console.log('Timeline:', timeline);

      effectSub.unsubscribe();
    });
  });
});
