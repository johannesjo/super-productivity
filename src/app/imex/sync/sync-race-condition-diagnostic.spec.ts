import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Action, Store } from '@ngrx/store';
import { TaskDueEffects } from '../../features/tasks/store/task-due.effects';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { SyncWrapperService } from './sync-wrapper.service';
import { AddTasksForTomorrowService } from '../../features/add-tasks-for-tomorrow/add-tasks-for-tomorrow.service';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { DataInitService } from '../../core/data-init/data-init.service';
import { PfapiService } from '../../pfapi/pfapi.service';

describe('Sync Race Condition - DIAGNOSTIC TEST', () => {
  // Helper function to replace await wait()
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  let actions$: Observable<Action>;
  let effects: TaskDueEffects;
  let store: MockStore;
  // let globalTrackingIntervalService: jasmine.SpyObj<GlobalTrackingIntervalService>;
  // let dataInitStateService: jasmine.SpyObj<DataInitStateService>;
  // let syncWrapperService: jasmine.SpyObj<SyncWrapperService>;
  let addTasksForTomorrowService: jasmine.SpyObj<AddTasksForTomorrowService>;
  let dataInitService: jasmine.SpyObj<DataInitService>;
  // let pfapiService: jasmine.SpyObj<PfapiService>;

  // Subjects to control timing
  let todayDateStr$: BehaviorSubject<string>;
  let isAllDataLoadedInitially$: BehaviorSubject<boolean>;
  let afterCurrentSyncDoneOrSyncDisabled$: Subject<unknown>;
  let isSyncInProgress$: BehaviorSubject<boolean>;
  let dispatchedActions: Action[] = [];

  // Mock task repeat configs
  const mockTaskRepeatConfigs = {
    repeat1: {
      id: 'repeat1',
      title: 'Daily Task',
      lastTaskCreation: '2025-06-22', // Yesterday - should create today
      repeatCfg: { repeatEvery: 1, repeatEveryUnit: 'DAY' },
    },
    repeat2: {
      id: 'repeat2',
      title: 'Another Daily Task',
      lastTaskCreation: '2025-06-23', // Today - should NOT create
      repeatCfg: { repeatEvery: 1, repeatEveryUnit: 'DAY' },
    },
  };

  // Mock sync data that would come from remote
  const mockRemoteSyncData: any = {
    taskRepeatCfg: {
      ids: ['repeat1', 'repeat2'],
      entities: {
        repeat1: { ...mockTaskRepeatConfigs.repeat1, lastTaskCreation: '2025-06-23' }, // Updated today
        repeat2: { ...mockTaskRepeatConfigs.repeat2, lastTaskCreation: '2025-06-23' }, // Already today
      },
    },
    task: { ids: [], entities: {} }, // No tasks - they were deleted on mobile
    // Add minimal required properties for AppDataCompleteLegacy
    project: { ids: [], entities: {} },
    globalConfig: {} as any,
    planner: {} as any,
    boards: {} as any,
    note: { ids: [], entities: {} },
    issueProvider: {} as any,
    metric: {} as any,
    improvement: {} as any,
    obstruction: {} as any,
    tag: { ids: [], entities: {} },
    simpleCounter: { ids: [], entities: {} },
    reminders: [],
    taskArchive: { ids: [], entities: {} },
    archivedProjects: [],
    lastLocalSyncModelChange: null,
    lastArchiveUpdate: null,
  };

  // State tracking
  let currentAppState = {
    taskRepeatCfg: mockTaskRepeatConfigs,
    lastDataLoadAction: null as Action | null,
  };

  beforeEach(() => {
    // Initialize actions$ before use
    actions$ = new Subject<Action>();
    // Reset state
    dispatchedActions = [];
    currentAppState = {
      taskRepeatCfg: { ...mockTaskRepeatConfigs },
      lastDataLoadAction: null as Action | null,
    };

    // Create subjects
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

    const syncWrapperSpy = jasmine.createSpyObj('SyncWrapperService', ['sync'], {
      afterCurrentSyncDoneOrSyncDisabled$:
        afterCurrentSyncDoneOrSyncDisabled$.asObservable(),
      isSyncInProgress$: isSyncInProgress$.asObservable(),
    });

    const addTasksForTomorrowSpy = jasmine.createSpyObj('AddTasksForTomorrowService', [
      'addAllDueToday',
    ]);

    const dataInitSpy = jasmine.createSpyObj('DataInitService', ['reInit']);

    const pfapiSpy = jasmine.createSpyObj('PfapiService', [], {
      pf: jasmine.createSpyObj('pf', ['getAllSyncModelData']),
    });

    // Mock the data loading behavior
    dataInitSpy.reInit.and.callFake(async () => {
      console.log('=== DataInitService.reInit() called ===');
      // Simulate loading the synced data
      currentAppState.taskRepeatCfg = mockRemoteSyncData.taskRepeatCfg.entities;
      store.dispatch(
        loadAllData({
          appDataComplete: mockRemoteSyncData,
          isOmitTokens: false,
        }),
      );
    });

    // Mock addAllDueToday to check what state it sees
    addTasksForTomorrowSpy.addAllDueToday.and.callFake(() => {
      console.log('=== addAllDueToday() called ===');
      console.log('Current taskRepeatCfg state:', currentAppState.taskRepeatCfg);

      // Check which tasks would be created based on current state
      const tasksToCreate: any[] = [];
      for (const [, config] of Object.entries(currentAppState.taskRepeatCfg)) {
        if ('lastTaskCreation' in config && config.lastTaskCreation < '2025-06-23') {
          tasksToCreate.push(config);
        }
      }

      console.log('Tasks that would be created:', tasksToCreate);
      return tasksToCreate;
    });

    TestBed.configureTestingModule({
      providers: [
        TaskDueEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            taskRepeatCfg: mockTaskRepeatConfigs,
          },
        }),
        { provide: GlobalTrackingIntervalService, useValue: globalTrackingIntervalSpy },
        { provide: DataInitStateService, useValue: dataInitStateSpy },
        { provide: SyncWrapperService, useValue: syncWrapperSpy },
        { provide: AddTasksForTomorrowService, useValue: addTasksForTomorrowSpy },
        { provide: DataInitService, useValue: dataInitSpy },
        { provide: PfapiService, useValue: pfapiSpy },
      ],
    });

    effects = TestBed.inject(TaskDueEffects);
    store = TestBed.inject(Store) as MockStore;
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
    dataInitService = TestBed.inject(DataInitService) as jasmine.SpyObj<DataInitService>;
    // pfapiService = TestBed.inject(PfapiService) as jasmine.SpyObj<PfapiService>;

    // Track dispatched actions
    store.scannedActions$.subscribe((action) => {
      dispatchedActions.push(action);
      if (action.type === '[SP_ALL] Load(import) all data') {
        currentAppState.lastDataLoadAction = action;
      }
    });
  });

  describe('DIAGNOSTIC: Which scenario causes the bug?', () => {
    xit('Scenario 1: Task creation happens BEFORE reInit completes (timing issue)', async () => {
      console.log('\n=== TESTING SCENARIO 1: TIMING ISSUE ===\n');

      const timeline: string[] = [];
      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Step 1: App starts
      timeline.push('1. App startup');
      todayDateStr$.next('2025-06-23');
      isAllDataLoadedInitially$.next(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Step 2: Sync starts
      timeline.push('2. Sync starts (UpdateLocal)');
      isSyncInProgress$.next(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Sync downloads data but hasn't called reInit yet
      timeline.push('3. Sync completes download');
      isSyncInProgress$.next(false);
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);

      // Step 4: Effect waits 1000ms
      timeline.push('4. Effect waiting 1000ms...');
      await wait(50);

      // Step 5: ReInit starts but hasn't completed
      timeline.push('5. ReInit starts (async)');
      dataInitService.reInit();

      // Step 6: Effect finishes waiting
      await wait(50);
      timeline.push('6. Effect calls addAllDueToday (reInit still running!)');

      // Check what happened
      const returnValue =
        addTasksForTomorrowService.addAllDueToday.calls.mostRecent()?.returnValue;
      const tasksCreated = returnValue || [];

      // Step 7: ReInit completes
      await wait(10);
      timeline.push('7. ReInit completes (too late!)');

      console.log('Timeline:', timeline);
      console.log('Tasks created:', tasksCreated);
      console.log(
        'Would old repeat configs be used?',
        Array.isArray(tasksCreated) && tasksCreated.length > 0,
      );

      // DIAGNOSTIC RESULT
      if (Array.isArray(tasksCreated) && tasksCreated.length > 0) {
        console.log(
          "✅ SCENARIO 1 CONFIRMED: Tasks were created with OLD data because reInit hadn't completed",
        );
      } else {
        console.log(
          '❌ SCENARIO 1 NOT THE ISSUE: No tasks created even with timing issue',
        );
      }

      expect(Array.isArray(tasksCreated) ? tasksCreated.length : 0).toBe(1); // Should create 1 task with old data
      expect(Array.isArray(tasksCreated) ? tasksCreated[0]?.id : undefined).toBe(
        'repeat1',
      );

      effectSub.unsubscribe();
    });

    xit('Scenario 2: ReInit loads wrong data (data import failure)', async () => {
      console.log('\n=== TESTING SCENARIO 2: DATA IMPORT FAILURE ===\n');

      const timeline: string[] = [];

      // Override reInit to simulate loading OLD data instead of synced data
      dataInitService.reInit.and.callFake(async () => {
        console.log(
          '=== FAULTY reInit: Loading OLD local data instead of synced data ===',
        );
        // Keep old state - simulating failure to load synced data
        currentAppState.taskRepeatCfg = { ...mockTaskRepeatConfigs };
        store.dispatch(
          loadAllData({
            appDataComplete: {
              ...mockRemoteSyncData,
              taskRepeatCfg: {
                ids: Object.keys(mockTaskRepeatConfigs),
                entities: mockTaskRepeatConfigs,
              },
            },
            isOmitTokens: false,
          }),
        );
      });

      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Step 1: App starts
      timeline.push('1. App startup');
      todayDateStr$.next('2025-06-23');
      isAllDataLoadedInitially$.next(true);
      await wait(0);

      // Step 2: Sync completes
      timeline.push('2. Sync completes');
      isSyncInProgress$.next(false);
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);

      // Step 3: ReInit is called and completes
      timeline.push('3. ReInit called (loads WRONG data)');
      await wait(10);
      dataInitService.reInit();
      await wait(10);

      // Step 4: Effect waits and then runs
      timeline.push('4. Effect waiting...');
      await wait(10);
      timeline.push('5. Effect calls addAllDueToday');

      // Check what happened
      const returnValue =
        addTasksForTomorrowService.addAllDueToday.calls.mostRecent()?.returnValue;
      const tasksCreated = returnValue || [];

      console.log('Timeline:', timeline);
      console.log('Tasks created:', tasksCreated);
      console.log(
        'Did reInit load old data?',
        currentAppState.taskRepeatCfg['repeat1'].lastTaskCreation === '2025-06-22',
      );

      // DIAGNOSTIC RESULT
      if (
        Array.isArray(tasksCreated) &&
        tasksCreated.length > 0 &&
        currentAppState.taskRepeatCfg['repeat1'].lastTaskCreation === '2025-06-22'
      ) {
        console.log(
          '✅ SCENARIO 2 CONFIRMED: ReInit loaded OLD data instead of synced data',
        );
      } else {
        console.log('❌ SCENARIO 2 NOT THE ISSUE: ReInit worked correctly');
      }

      expect(Array.isArray(tasksCreated) ? tasksCreated.length : 0).toBe(1);
      expect(currentAppState.taskRepeatCfg['repeat1'].lastTaskCreation).toBe(
        '2025-06-22',
      ); // Old data

      effectSub.unsubscribe();
    });

    xit('Scenario 3: Both issues combined (worst case)', async () => {
      console.log('\n=== TESTING SCENARIO 3: BOTH ISSUES ===\n');

      const timeline: string[] = [];
      let reInitStarted = false;
      let reInitCompleted = false;

      // Track reInit timing
      dataInitService.reInit.and.callFake(async () => {
        reInitStarted = true;
        console.log('=== ReInit started ===');
        // Simulate async delay
        return new Promise((resolve) => {
          setTimeout(() => {
            console.log('=== ReInit completing (with OLD data) ===');
            currentAppState.taskRepeatCfg = { ...mockTaskRepeatConfigs }; // Wrong data
            reInitCompleted = true;
            resolve(undefined);
          }, 2000); // Takes 2 seconds
        });
      });

      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Run the sequence
      timeline.push('1. App startup');
      todayDateStr$.next('2025-06-23');
      isAllDataLoadedInitially$.next(true);
      await wait(0);

      timeline.push('2. Sync completes');
      isSyncInProgress$.next(false);
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);

      // Effect waits 1000ms
      await wait(10);
      timeline.push(
        '3. Effect fires - reInit started? ' +
          reInitStarted +
          ', completed? ' +
          reInitCompleted,
      );

      const returnVal3 =
        addTasksForTomorrowService.addAllDueToday.calls.mostRecent()?.returnValue;
      const tasksCreated = returnVal3 || [];

      // Let reInit complete
      await wait(200);
      timeline.push('4. ReInit finally completes');

      console.log('Timeline:', timeline);
      console.log(
        'Tasks created before reInit completed?',
        Array.isArray(tasksCreated) && tasksCreated.length > 0 && !reInitCompleted,
      );
      console.log(
        'ReInit loaded wrong data?',
        currentAppState.taskRepeatCfg['repeat1'].lastTaskCreation === '2025-06-22',
      );

      // DIAGNOSTIC RESULT
      console.log('\n🔍 FINAL DIAGNOSIS:');
      if (Array.isArray(tasksCreated) && tasksCreated.length > 0 && !reInitCompleted) {
        console.log('- ✅ TIMING ISSUE: Tasks created before reInit completed');
      }
      if (currentAppState.taskRepeatCfg['repeat1'].lastTaskCreation === '2025-06-22') {
        console.log('- ✅ DATA ISSUE: ReInit loaded old data');
      }

      effectSub.unsubscribe();
    });

    xit('Control Test: Everything works correctly', async () => {
      console.log('\n=== CONTROL TEST: CORRECT BEHAVIOR ===\n');

      // Setup correct behavior
      dataInitService.reInit.and.callFake(async () => {
        console.log('=== ReInit loading CORRECT synced data ===');
        currentAppState.taskRepeatCfg = mockRemoteSyncData.taskRepeatCfg.entities;
        store.dispatch(
          loadAllData({
            appDataComplete: mockRemoteSyncData,
            isOmitTokens: false,
          }),
        );
      });

      const effectSub = effects.createRepeatableTasksAndAddDueToday$.subscribe();

      // Run sequence with proper timing
      todayDateStr$.next('2025-06-23');
      isAllDataLoadedInitially$.next(true);
      await wait(0);

      // Sync and reInit complete properly
      isSyncInProgress$.next(false);
      dataInitService.reInit();
      await wait(10);

      // Then signal sync done
      afterCurrentSyncDoneOrSyncDisabled$.next(undefined);
      await wait(10);

      const returnVal4 =
        addTasksForTomorrowService.addAllDueToday.calls.mostRecent()?.returnValue;
      const tasksCreated = returnVal4 || [];

      console.log('Tasks created with correct data:', tasksCreated);
      console.log(
        '✅ EXPECTED: No tasks created because lastTaskCreation is already today',
      );

      expect(Array.isArray(tasksCreated) ? tasksCreated.length : 0).toBe(0);

      effectSub.unsubscribe();
    });
  });
});
