import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { BehaviorSubject, Subject } from 'rxjs';
import { LS } from '../../core/persistence/storage-keys.const';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { GlobalConfigService } from '../config/global-config.service';
import { ProjectService } from '../project/project.service';
import { selectTaskEntities } from '../tasks/store/task.selectors';
import { Task } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { TaskFocusService } from '../tasks/task-focus.service';
import { WorkContextType } from '../work-context/work-context.model';
import { Event, NavigationEnd, Router } from '@angular/router';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { LOCAL_ACTIONS } from '../../util/local-actions.token';
import { OnboardingHintService } from './onboarding-hint.service';

const ONBOARDING_KEYS = [
  LS.ONBOARDING_PRESET_DONE,
  LS.ONBOARDING_HINTS_DONE,
  LS.IS_SKIP_TOUR,
  LS.EXAMPLE_TASKS_CREATED,
  LS.EXAMPLE_TASK_IDS,
];

const makeTask = (id: string, partial: Partial<Task> = {}): Task =>
  ({ id, title: id, isDone: false, subTaskIds: [], ...partial }) as Task;

const EXAMPLE_TASK = makeTask('example', { projectId: 'INBOX_PROJECT' });

describe('OnboardingHintService', () => {
  let store: MockStore;
  let isShowAddTaskBar: WritableSignal<boolean>;
  let selectedTaskId: WritableSignal<string | null>;
  let isTaskContextMenuOpen: WritableSignal<boolean>;
  let syncEnabled: WritableSignal<boolean>;
  let projects$: BehaviorSubject<{ id: string }[]>;
  let updateSection: jasmine.Spy;
  let localActions$: Subject<Action>;
  let dataLoaded$: BehaviorSubject<boolean> | Subject<boolean>;
  let routerEvents$: Subject<Event>;
  let savedLs: Record<string, string | null>;

  const setTasks = (tasks: Task[]): void => {
    store.overrideSelector(
      selectTaskEntities,
      Object.fromEntries(tasks.map((t) => [t.id, t])),
    );
    store.refreshState();
  };

  const createService = (): OnboardingHintService => {
    const service = TestBed.inject(OnboardingHintService);
    TestBed.tick();
    return service;
  };

  const createPhoneService = (): OnboardingHintService => {
    const service = createService();
    // Touch input cannot be simulated in the unit test browser.
    spyOn(service, 'isSwipeLayout').and.returnValue(true);
    return service;
  };

  const dispatchAddTask = (task: Task, extra: { isExampleTask?: boolean } = {}): void => {
    localActions$.next(
      TaskSharedActions.addTask({
        task,
        workContextId: 'INBOX_PROJECT',
        workContextType: WorkContextType.PROJECT,
        isAddToBacklog: false,
        isAddToBottom: false,
        ...extra,
      }),
    );
    TestBed.tick();
  };

  /** The first task, next to whatever other tasks exist (e.g. seeded examples). */
  const addFirstTask = (otherTasks: Task[] = [], id = 'task-1'): void => {
    const task = makeTask(id);
    setTasks([task, ...otherTasks]);
    dispatchAddTask(task);
  };

  const navigateTo = (url: string): void => {
    routerEvents$.next(new NavigationEnd(1, url, url));
    TestBed.tick();
  };

  const markDone = (id = 'task-1'): void => {
    localActions$.next(
      TaskSharedActions.updateTask({ task: { id, changes: { isDone: true } } }),
    );
    TestBed.tick();
  };

  beforeEach(() => {
    savedLs = {};
    for (const key of ONBOARDING_KEYS) {
      savedLs[key] = localStorage.getItem(key);
      localStorage.removeItem(key);
    }
    // A fresh install seeds example tasks; tests that need an older install unset it.
    localStorage.setItem(LS.EXAMPLE_TASKS_CREATED, 'true');
    localStorage.setItem(LS.EXAMPLE_TASK_IDS, JSON.stringify([EXAMPLE_TASK.id]));

    isShowAddTaskBar = signal(false);
    selectedTaskId = signal(null);
    isTaskContextMenuOpen = signal(false);
    syncEnabled = signal(false);
    projects$ = new BehaviorSubject<{ id: string }[]>([{ id: 'INBOX_PROJECT' }]);
    updateSection = jasmine.createSpy('updateSection');
    localActions$ = new Subject<Action>();
    dataLoaded$ = new BehaviorSubject(true);
    routerEvents$ = new Subject<Event>();

    TestBed.configureTestingModule({
      providers: [
        OnboardingHintService,
        provideMockStore(),
        {
          provide: LayoutService,
          useValue: { isShowAddTaskBar, isShowMobileBottomNav: signal(false) },
        },
        {
          provide: DataInitStateService,
          useValue: {
            get isAllDataLoadedInitially$() {
              return dataLoaded$;
            },
          },
        },
        { provide: ProjectService, useValue: { list$: projects$ } },
        {
          provide: GlobalConfigService,
          useValue: { sync: () => ({ isEnabled: syncEnabled() }), updateSection },
        },
        { provide: TaskService, useValue: { selectedTaskId } },
        { provide: TaskFocusService, useValue: { isTaskContextMenuOpen } },
        { provide: Router, useValue: { events: routerEvents$ } },
        { provide: LOCAL_ACTIONS, useValue: localActions$ },
      ],
    });
    store = TestBed.inject(MockStore);
    setTasks([]);
  });

  afterEach(() => {
    // overrideSelector mutates the shared memoized selector; reset it so the
    // override cannot leak into specs that run later.
    store.resetSelectors();
    for (const key of ONBOARDING_KEYS) {
      const value = savedLs[key];
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    }
  });

  describe('first task', () => {
    it('points at + for a new user and hides while the composer is open', () => {
      const service = createService();
      expect(service.currentStep()).toBe('create-task');

      isShowAddTaskBar.set(true);
      expect(service.currentStep()).toBeNull();

      isShowAddTaskBar.set(false);
      expect(service.currentStep()).toBe('create-task');
    });

    it('ignores example tasks, repeat instances and unknown task ids', () => {
      const service = createService();
      const example = makeTask('example');
      const repeated = makeTask('repeated', { repeatCfgId: 'cfg-1' });
      setTasks([example, repeated]);
      dispatchAddTask(example, { isExampleTask: true });
      dispatchAddTask(repeated);
      dispatchAddTask(makeTask('missing'));
      expect(service.currentStep()).toBe('create-task');
      expect(localStorage.getItem(LS.ONBOARDING_PRESET_DONE)).toBeNull();
    });

    it('counts a task created outside the global add-task bar', () => {
      // e.g. planner inline add, boards, share: all dispatch addTask locally
      const service = createService();
      addFirstTask([EXAMPLE_TASK], 'planner-task');
      expect(service.firstTaskId()).toBe('planner-task');
      expect(service.currentStep()).toBe('today-and-inbox');
    });

    it('ignores tasks added before data has loaded', () => {
      dataLoaded$ = new Subject<boolean>();
      const service = createService();
      addFirstTask();
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_PRESET_DONE)).toBeNull();

      dataLoaded$.next(true);
      TestBed.tick();
      expect(service.currentStep()).toBe('create-task');
    });

    it('never changes feature settings', () => {
      const service = createService();
      addFirstTask([EXAMPLE_TASK]);
      navigateTo('/project/INBOX_PROJECT/tasks');
      service.skip();
      expect(updateSection).not.toHaveBeenCalled();
    });
  });

  describe('who gets guidance', () => {
    it('skips returning users with more than the default projects', () => {
      projects$.next([{ id: 'INBOX_PROJECT' }, { id: 'p1' }, { id: 'p2' }]);
      const service = createService();
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });

    it('skips users with sync enabled', () => {
      syncEnabled.set(true);
      const service = createService();
      expect(service.currentStep()).toBeNull();
      expect(OnboardingHintService.isOnboardingInProgress()).toBeFalse();
    });

    it('ends guidance when sync is enabled mid-onboarding', () => {
      const service = createService();
      expect(service.currentStep()).toBe('create-task');
      syncEnabled.set(true);
      TestBed.tick();
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });

    it('does not start over after the first task was added in an earlier session', () => {
      localStorage.setItem(LS.ONBOARDING_PRESET_DONE, 'true');
      const service = createService();
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });

    it('skips installs whose tasks were not seeded by us', () => {
      localStorage.removeItem(LS.EXAMPLE_TASKS_CREATED);
      setTasks([makeTask('old-task')]);
      const service = createService();
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });

    it('keeps guiding when the only existing tasks are seeded examples', () => {
      setTasks([EXAMPLE_TASK]);
      const service = createService();
      expect(service.currentStep()).toBe('create-task');
    });

    it('reports onboarding as finished once a tip is closed', () => {
      const service = createService();
      expect(OnboardingHintService.isOnboardingInProgress()).toBeTrue();
      service.skip();
      expect(OnboardingHintService.isOnboardingInProgress()).toBeFalse();
      expect(service.currentStep()).toBeNull();
    });
  });

  describe('Today and Inbox tip', () => {
    it('follows the first task once the composer closes, until the Inbox is opened', () => {
      const service = createService();
      isShowAddTaskBar.set(true);
      addFirstTask([EXAMPLE_TASK]);
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_PRESET_DONE)).toBe('true');

      isShowAddTaskBar.set(false);
      expect(service.currentStep()).toBe('today-and-inbox');
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBeNull();

      navigateTo('/project/INBOX_PROJECT/tasks');
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });

    it('explains Today and the Inbox also when no example tasks are left', () => {
      const service = createService();
      addFirstTask([{ ...EXAMPLE_TASK, isDone: true }]);
      expect(service.currentStep()).toBe('today-and-inbox');
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBeNull();
    });

    it('ends on any navigation, also to pages without tasks', () => {
      const service = createService();
      // Earlier navigation (e.g. the start page) does not count.
      navigateTo('/tag/TODAY/tasks');
      addFirstTask([EXAMPLE_TASK]);
      expect(service.currentStep()).toBe('today-and-inbox');

      navigateTo('/config');
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });

    it('ends for good once closed', () => {
      const service = createService();
      addFirstTask();
      service.skip();
      expect(service.currentStep()).toBeNull();
      expect(OnboardingHintService.isOnboardingInProgress()).toBeFalse();
    });
  });

  describe('on phones', () => {
    it('introduces swipe left, then swipe right, then Today and the Inbox', () => {
      const service = createPhoneService();
      addFirstTask([EXAMPLE_TASK]);
      expect(service.currentStep()).toBe('task-swipe-left');
      expect(service.swipeTargetTaskId()).toBe('task-1');

      // Swiping left opens the task menu: hide while open, move on once closed.
      isTaskContextMenuOpen.set(true);
      TestBed.tick();
      expect(service.currentStep()).toBeNull();
      isTaskContextMenuOpen.set(false);
      TestBed.tick();
      expect(service.currentStep()).toBe('task-swipe-right');

      markDone();
      expect(service.currentStep()).toBe('today-and-inbox');
    });

    it('moves on to Today and the Inbox once a task is marked done', () => {
      const service = createPhoneService();
      addFirstTask();
      markDone();
      expect(service.currentStep()).toBe('today-and-inbox');
    });

    it('ends the swipe hints once the first task is deleted', () => {
      const service = createPhoneService();
      addFirstTask();
      expect(service.currentStep()).toBe('task-swipe-left');
      setTasks([]);
      TestBed.tick();
      expect(service.currentStep()).toBe('today-and-inbox');
    });

    it('hides swipe hints while a task detail panel is open', () => {
      const service = createPhoneService();
      addFirstTask();
      selectedTaskId.set('task-1');
      expect(service.currentStep()).toBeNull();
      selectedTaskId.set(null);
      expect(service.currentStep()).toBe('task-swipe-left');
    });

    it('auto-closes the composer only for the first task', () => {
      const service = createPhoneService();
      addFirstTask();
      expect(service.shouldAutoCloseFirstTaskComposer('task-1')).toBeTrue();
      expect(service.shouldAutoCloseFirstTaskComposer('task-1')).toBeFalse();
    });

    it('closing a tip ends all guidance, swipes included', () => {
      const service = createPhoneService();
      addFirstTask([EXAMPLE_TASK]);
      service.skip();
      expect(service.currentStep()).toBeNull();
      expect(localStorage.getItem(LS.ONBOARDING_HINTS_DONE)).toBe('true');
    });
  });

  it('never auto-closes the composer on desktop layouts', () => {
    const service = createService();
    addFirstTask();
    expect(service.shouldAutoCloseFirstTaskComposer('task-1')).toBeFalse();
  });
});
