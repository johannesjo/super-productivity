import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import { ReminderService } from './reminder.service';
import { SnackService } from '../../core/snack/snack.service';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { GlobalConfigService } from '../config/global-config.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { TaskWithReminder } from '../tasks/task.model';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { selectAllTasksWithReminder } from '../tasks/store/task.selectors';

describe('ReminderService', () => {
  let service: ReminderService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockWorker: jasmine.SpyObj<Worker>;
  let mockPfapiService: any;
  let tasksWithReminderSubject: BehaviorSubject<TaskWithReminder[]>;
  let isDataImportInProgressSubject: BehaviorSubject<boolean>;

  // Store the original Worker
  const originalWorker = (window as any).Worker;

  beforeEach(() => {
    // Mock Worker
    mockWorker = jasmine.createSpyObj('Worker', [
      'postMessage',
      'addEventListener',
      'removeEventListener',
      'terminate',
    ]);

    // Replace Worker constructor with mock
    (window as any).Worker = jasmine.createSpy('Worker').and.returnValue(mockWorker);

    // Setup subjects
    tasksWithReminderSubject = new BehaviorSubject<TaskWithReminder[]>([]);
    isDataImportInProgressSubject = new BehaviorSubject<boolean>(false);

    // Mock store
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockStore.select.and.callFake((selector: unknown) => {
      if (selector === selectAllTasksWithReminder) {
        return tasksWithReminderSubject.asObservable();
      }
      return of(null);
    });

    // Mock services
    const snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);

    const imexViewServiceSpy = jasmine.createSpyObj('ImexViewService', [], {
      isDataImportInProgress$: isDataImportInProgressSubject.asObservable(),
    });

    const globalConfigServiceSpy = jasmine.createSpyObj('GlobalConfigService', ['cfg']);
    globalConfigServiceSpy.cfg.and.returnValue({
      reminder: { disableReminders: false } as any,
    });

    mockPfapiService = {
      pf: {
        m: {
          reminders: {
            load: jasmine.createSpy('load').and.returnValue(Promise.resolve([])),
            save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
          },
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ReminderService,
        { provide: Store, useValue: mockStore },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: ImexViewService, useValue: imexViewServiceSpy },
        { provide: GlobalConfigService, useValue: globalConfigServiceSpy },
        { provide: PfapiService, useValue: mockPfapiService },
      ],
    });

    service = TestBed.inject(ReminderService);
  });

  afterEach(() => {
    // Restore original Worker
    (window as any).Worker = originalWorker;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
    it('should add event listeners to worker', () => {
      service.init();

      expect(mockWorker.addEventListener).toHaveBeenCalledWith(
        'message',
        jasmine.any(Function),
      );
      expect(mockWorker.addEventListener).toHaveBeenCalledWith(
        'error',
        jasmine.any(Function),
      );
    });

    it('should subscribe to tasks with reminders', () => {
      service.init();

      expect(mockStore.select).toHaveBeenCalled();
    });

    it('should update worker with reminders when tasks change', () => {
      service.init();

      const tasks: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Test Task',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks);

      expect(mockWorker.postMessage).toHaveBeenCalledWith([
        { id: 'task1', remindAt: 1000, title: 'Test Task', type: 'TASK' },
      ]);
    });
  });

  describe('distinctUntilChanged optimization', () => {
    it('should not update worker when reminders have not changed', () => {
      service.init();
      // BehaviorSubject emits initial value ([]) on subscription, so we start at 1 call
      const initialCalls = mockWorker.postMessage.calls.count();

      const tasks: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Test Task',
          isDone: false,
        } as TaskWithReminder,
      ];

      // First emission with actual tasks
      tasksWithReminderSubject.next(tasks);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 1);

      // Same reminders (new array reference but same content)
      tasksWithReminderSubject.next([...tasks]);
      // Should still be same count because distinctUntilChanged filters it out
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 1);
    });

    it('should update worker when reminder id changes', () => {
      service.init();
      const initialCalls = mockWorker.postMessage.calls.count();

      const tasks1: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Test Task',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks1);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 1);

      const tasks2: TaskWithReminder[] = [
        {
          id: 'task2',
          remindAt: 1000,
          title: 'Test Task',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks2);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 2);
    });

    it('should update worker when remindAt changes', () => {
      service.init();
      const initialCalls = mockWorker.postMessage.calls.count();

      const tasks1: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Test Task',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks1);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 1);

      const tasks2: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 2000,
          title: 'Test Task',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks2);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 2);
    });

    it('should update worker when reminder count changes', () => {
      service.init();
      const initialCalls = mockWorker.postMessage.calls.count();

      const tasks1: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Test Task 1',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks1);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 1);

      const tasks2: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Test Task 1',
          isDone: false,
        } as TaskWithReminder,
        {
          id: 'task2',
          remindAt: 2000,
          title: 'Test Task 2',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks2);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 2);
    });

    it('should update worker when title changes', () => {
      service.init();
      const initialCalls = mockWorker.postMessage.calls.count();

      const tasks1: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Original Title',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks1);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 1);

      // Title changed - worker should be updated so notification shows correct title
      const tasks2: TaskWithReminder[] = [
        {
          id: 'task1',
          remindAt: 1000,
          title: 'Updated Title',
          isDone: false,
        } as TaskWithReminder,
      ];
      tasksWithReminderSubject.next(tasks2);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(initialCalls + 2);
      expect(mockWorker.postMessage).toHaveBeenCalledWith([
        { id: 'task1', remindAt: 1000, title: 'Updated Title', type: 'TASK' },
      ]);
    });
  });

  describe('legacy reminder migration', () => {
    it('should not dispatch actions when no legacy reminders exist', async () => {
      mockPfapiService.pf.m.reminders.load.and.returnValue(Promise.resolve([]));

      service.init();
      await Promise.resolve(); // Allow async migration to complete

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should migrate TASK reminders to task.remindAt', async () => {
      const legacyReminders = [
        {
          id: 'reminder1',
          remindAt: 1000,
          title: 'Task Reminder',
          type: 'TASK',
          relatedId: 'task1',
        },
      ];
      mockPfapiService.pf.m.reminders.load.and.returnValue(
        Promise.resolve(legacyReminders),
      );

      service.init();
      await Promise.resolve(); // Allow async migration to complete

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        TaskSharedActions.reScheduleTaskWithTime({
          task: { id: 'task1', title: 'Task Reminder' } as TaskWithReminder,
          dueWithTime: 1000,
          remindAt: 1000,
          isMoveToBacklog: false,
        }),
      );
    });

    it('should skip NOTE reminders during migration', async () => {
      const legacyReminders = [
        {
          id: 'reminder1',
          remindAt: 1000,
          title: 'Note Reminder',
          type: 'NOTE',
          relatedId: 'note1',
        },
      ];
      mockPfapiService.pf.m.reminders.load.and.returnValue(
        Promise.resolve(legacyReminders),
      );

      service.init();
      await Promise.resolve(); // Allow async migration to complete

      // Should not dispatch for NOTE reminders
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should clear legacy reminders after migration', async () => {
      const legacyReminders = [
        {
          id: 'reminder1',
          remindAt: 1000,
          title: 'Task Reminder',
          type: 'TASK',
          relatedId: 'task1',
        },
      ];
      mockPfapiService.pf.m.reminders.load.and.returnValue(
        Promise.resolve(legacyReminders),
      );

      service.init();
      await Promise.resolve(); // Allow async migration to complete

      expect(mockPfapiService.pf.m.reminders.save).toHaveBeenCalledWith([], {
        isUpdateRevAndLastUpdate: false,
      });
    });
  });

  describe('onRemindersActive$', () => {
    it('should emit when worker sends message and reminders are enabled', (done) => {
      const globalConfigService = TestBed.inject(
        GlobalConfigService,
      ) as jasmine.SpyObj<GlobalConfigService>;
      (globalConfigService.cfg as jasmine.Spy).and.returnValue({
        reminder: { disableReminders: false },
      } as any);

      service.init();

      // Get the message handler
      const messageHandler = mockWorker.addEventListener.calls
        .allArgs()
        .find((args) => args[0] === 'message')?.[1] as (event: MessageEvent) => void;

      service.onRemindersActive$.subscribe((reminders) => {
        expect(reminders.length).toBe(1);
        expect(reminders[0].id).toBe('task1');
        done();
      });

      // Simulate worker message
      messageHandler({
        data: [{ id: 'task1', remindAt: 1000, title: 'Test', type: 'TASK' }],
      } as MessageEvent);
    });

    it('should not emit when reminders are disabled', () => {
      const globalConfigService = TestBed.inject(
        GlobalConfigService,
      ) as jasmine.SpyObj<GlobalConfigService>;
      (globalConfigService.cfg as jasmine.Spy).and.returnValue({
        reminder: { disableReminders: true },
      } as any);

      service.init();

      const emittedValues: unknown[] = [];
      service.onRemindersActive$.subscribe((v) => emittedValues.push(v));

      // Get the message handler
      const messageHandler = mockWorker.addEventListener.calls
        .allArgs()
        .find((args) => args[0] === 'message')?.[1] as (event: MessageEvent) => void;

      // Simulate worker message
      messageHandler({
        data: [{ id: 'task1', remindAt: 1000, title: 'Test', type: 'TASK' }],
      } as MessageEvent);

      expect(emittedValues.length).toBe(0);
    });

    it('should skip emissions while data import is in progress', () => {
      isDataImportInProgressSubject.next(true);

      service.init();

      const emittedValues: unknown[] = [];
      service.onRemindersActive$.subscribe((v) => emittedValues.push(v));

      // Get the message handler
      const messageHandler = mockWorker.addEventListener.calls
        .allArgs()
        .find((args) => args[0] === 'message')?.[1] as (event: MessageEvent) => void;

      // Simulate worker message while import is in progress
      messageHandler({
        data: [{ id: 'task1', remindAt: 1000, title: 'Test', type: 'TASK' }],
      } as MessageEvent);

      expect(emittedValues.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should show snack error when worker errors', () => {
      const snackService = TestBed.inject(SnackService) as jasmine.SpyObj<SnackService>;

      service.init();

      // Get the error handler
      const errorHandler = mockWorker.addEventListener.calls
        .allArgs()
        .find((args) => args[0] === 'error')?.[1] as (event: ErrorEvent) => void;

      // Simulate worker error
      errorHandler(new ErrorEvent('error', { message: 'Worker error' }));

      expect(snackService.open).toHaveBeenCalledWith({
        type: 'ERROR',
        msg: jasmine.any(String),
      });
    });
  });
});
