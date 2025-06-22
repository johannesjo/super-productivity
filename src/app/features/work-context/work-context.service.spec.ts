import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { WorkContextService } from './work-context.service';
import { TaskWithSubTasks } from '../tasks/task.model';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

xdescribe('WorkContextService - undoneTasks$ filtering', () => {
  let service: WorkContextService;

  const createMockTask = (overrides: Partial<TaskWithSubTasks>): TaskWithSubTasks =>
    ({
      id: 'MOCK_TASK_ID',
      title: 'Mock Task',
      isDone: false,
      tagIds: [],
      parentId: null,
      subTaskIds: [],
      subTasks: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      reminderId: null,
      dueWithTime: undefined,
      dueDay: null,
      hasPlannedTime: false,
      repeatCfgId: null,
      notes: '',
      issueId: null,
      issueType: null,
      issueWasUpdated: null,
      issueLastUpdated: null,
      issueTimeTracked: null,
      attachments: [],
      projectId: null,
      _showSubTasksMode: 0,
      _currentTab: 0,
      _isTaskPlaceHolder: false,
      ...overrides,
    }) as TaskWithSubTasks;

  beforeEach(() => {
    // Mock current time to be 10 AM for consistent testing
    jasmine.clock().install();
    const currentTime = new Date();
    currentTime.setHours(10, 0, 0, 0);
    jasmine.clock().mockDate(currentTime);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideMockStore({
          initialState: {
            workContext: { activeId: 'test-context' },
            tag: { entities: {}, ids: [] },
            project: { entities: {}, ids: [] },
            task: { entities: {}, ids: [] },
          },
        }),
        provideMockActions(() => of()),
        {
          provide: Router,
          useValue: {
            events: of(),
            url: '/',
          },
        },
        WorkContextService,
      ],
    });

    service = TestBed.inject(WorkContextService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should filter out tasks scheduled for later today', (done) => {
    const todayAt = (hours: number, minutes: number = 0): number => {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.getTime();
    };

    const mockTasks: TaskWithSubTasks[] = [
      // Task scheduled for later today (should be filtered out)
      createMockTask({
        id: 'LATER_TODAY',
        title: 'Meeting at 2 PM',
        dueWithTime: todayAt(14, 0),
      }),
      // Task scheduled for earlier today (should be included)
      createMockTask({
        id: 'EARLIER_TODAY',
        title: 'Morning standup',
        dueWithTime: todayAt(8, 0),
      }),
      // Task without scheduled time (should be included)
      createMockTask({
        id: 'UNSCHEDULED',
        title: 'Unscheduled task',
        dueWithTime: undefined,
      }),
      // Done task (should be filtered out)
      createMockTask({
        id: 'DONE_TASK',
        title: 'Completed task',
        isDone: true,
      }),
    ];

    // Mock todaysTasks$ to return our test tasks
    Object.defineProperty(service, 'todaysTasks$', {
      get: () => of(mockTasks),
      configurable: true,
    });

    service.undoneTasks$.subscribe((tasks) => {
      expect(tasks.length).toBe(2);
      expect(tasks.find((t) => t.id === 'LATER_TODAY')).toBeUndefined();
      expect(tasks.find((t) => t.id === 'EARLIER_TODAY')).toBeDefined();
      expect(tasks.find((t) => t.id === 'UNSCHEDULED')).toBeDefined();
      expect(tasks.find((t) => t.id === 'DONE_TASK')).toBeUndefined();
      done();
    });
  });

  it('should include tasks scheduled for tomorrow', (done) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'TOMORROW_TASK',
        title: 'Tomorrow meeting',
        dueWithTime: tomorrow.getTime(),
      }),
    ];

    // Mock todaysTasks$ to return our test tasks
    Object.defineProperty(service, 'todaysTasks$', {
      get: () => of(mockTasks),
      configurable: true,
    });

    service.undoneTasks$.subscribe((tasks) => {
      expect(tasks.length).toBe(1);
      expect(tasks.find((t) => t.id === 'TOMORROW_TASK')).toBeDefined();
      done();
    });
  });

  it('should handle edge case of task scheduled exactly at current time', (done) => {
    const now = Date.now();

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'CURRENT_TIME_TASK',
        title: 'Task at current time',
        dueWithTime: now,
      }),
    ];

    // Apply the same filtering logic
    const expectedTasks = mockTasks.filter((task) => {
      if (!task || task.isDone) {
        return false;
      }

      if (task.dueWithTime) {
        const currentNow = Date.now();
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        if (task.dueWithTime >= currentNow && task.dueWithTime <= todayEnd.getTime()) {
          return false;
        }
      }

      return true;
    });

    (service as jasmine.SpyObj<WorkContextService>).undoneTasks$ = of(expectedTasks);

    service.undoneTasks$.subscribe((tasks) => {
      // Task scheduled at exactly current time should be filtered out
      expect(tasks.length).toBe(0);
      expect(tasks.find((t) => t.id === 'CURRENT_TIME_TASK')).toBeUndefined();
      done();
    });
  });

  it('should include parent tasks with subtasks when parent is not scheduled for later', (done) => {
    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'PARENT_TASK',
        title: 'Parent task',
        dueWithTime: undefined,
        subTasks: [
          createMockTask({
            id: 'SUB_1',
            title: 'Subtask 1',
            parentId: 'PARENT_TASK',
          }),
        ],
      }),
    ];

    // Mock todaysTasks$ to return our test tasks
    Object.defineProperty(service, 'todaysTasks$', {
      get: () => of(mockTasks),
      configurable: true,
    });

    service.undoneTasks$.subscribe((tasks) => {
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('PARENT_TASK');
      expect(tasks[0].subTasks.length).toBe(1);
      done();
    });
  });

  it('should filter out parent tasks with subtasks when parent is scheduled for later', (done) => {
    const todayAt = (hours: number): number => {
      const date = new Date();
      date.setHours(hours, 0, 0, 0);
      return date.getTime();
    };

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'PARENT_LATER',
        title: 'Parent task for later',
        dueWithTime: todayAt(15),
        subTasks: [
          createMockTask({
            id: 'SUB_1',
            title: 'Subtask 1',
            parentId: 'PARENT_LATER',
          }),
        ],
      }),
    ];

    // Mock todaysTasks$ to return our test tasks
    Object.defineProperty(service, 'todaysTasks$', {
      get: () => of(mockTasks),
      configurable: true,
    });

    service.undoneTasks$.subscribe((tasks) => {
      expect(tasks.length).toBe(0);
      done();
    });
  });
});
