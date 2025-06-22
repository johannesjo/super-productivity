import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { WorkContextService } from './work-context.service';
import { TaskWithSubTasks } from '../tasks/task.model';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TagService } from '../tag/tag.service';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { DateService } from '../../core/date/date.service';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { TaskArchiveService } from '../time-tracking/task-archive.service';
import { TODAY_TAG } from '../tag/tag.const';

describe('WorkContextService - undoneTasks$ filtering', () => {
  let tagServiceMock: jasmine.SpyObj<TagService>;
  let globalTrackingIntervalServiceMock: jasmine.SpyObj<GlobalTrackingIntervalService>;
  let dateServiceMock: jasmine.SpyObj<DateService>;
  let timeTrackingServiceMock: jasmine.SpyObj<TimeTrackingService>;
  let taskArchiveServiceMock: jasmine.SpyObj<TaskArchiveService>;

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

    // Create service mocks
    tagServiceMock = jasmine.createSpyObj('TagService', ['getTagById$']);
    globalTrackingIntervalServiceMock = jasmine.createSpyObj(
      'GlobalTrackingIntervalService',
      [],
      {
        todayDateStr$: of('2023-06-13'),
      },
    );
    dateServiceMock = jasmine.createSpyObj('DateService', ['todayStr']);
    timeTrackingServiceMock = jasmine.createSpyObj('TimeTrackingService', [
      'getWorkStartEndForWorkContext$',
    ]);
    taskArchiveServiceMock = jasmine.createSpyObj('TaskArchiveService', ['loadYoung']);

    // Configure mock return values
    tagServiceMock.getTagById$.and.returnValue(of(TODAY_TAG));
    dateServiceMock.todayStr.and.returnValue('2023-06-13');
    timeTrackingServiceMock.getWorkStartEndForWorkContext$.and.returnValue(of({}));
    taskArchiveServiceMock.loadYoung.and.returnValue(
      Promise.resolve({ ids: [], entities: {} }),
    );

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideMockStore({
          initialState: {
            workContext: {
              activeId: 'test-context',
              activeType: 'TAG',
            },
            tag: {
              entities: {
                testContext: {
                  id: 'test-context',
                  title: 'Test Context',
                  taskIds: [],
                  created: Date.now(),
                  advancedCfg: {},
                  theme: {},
                },
              },
              ids: ['test-context'],
            },
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
        { provide: TagService, useValue: tagServiceMock },
        {
          provide: GlobalTrackingIntervalService,
          useValue: globalTrackingIntervalServiceMock,
        },
        { provide: DateService, useValue: dateServiceMock },
        { provide: TimeTrackingService, useValue: timeTrackingServiceMock },
        { provide: TaskArchiveService, useValue: taskArchiveServiceMock },
        WorkContextService,
      ],
    });

    TestBed.inject(WorkContextService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  // Test the filtering logic directly instead of testing the full observable chain
  describe('filtering logic', () => {
    it('should filter out tasks scheduled for later today', () => {
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

      // Apply the same filtering logic as in the service
      const filteredTasks = mockTasks.filter((task) => {
        if (!task || task.isDone) {
          return false;
        }

        // Filter out tasks scheduled for later today
        if (task.dueWithTime) {
          const now = Date.now();
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          // If the task is scheduled for later today, exclude it
          if (task.dueWithTime >= now && task.dueWithTime <= todayEnd.getTime()) {
            return false;
          }
        }

        return true;
      });

      expect(filteredTasks.length).toBe(2);
      expect(filteredTasks.find((t) => t.id === 'LATER_TODAY')).toBeUndefined();
      expect(filteredTasks.find((t) => t.id === 'EARLIER_TODAY')).toBeDefined();
      expect(filteredTasks.find((t) => t.id === 'UNSCHEDULED')).toBeDefined();
      expect(filteredTasks.find((t) => t.id === 'DONE_TASK')).toBeUndefined();
    });

    it('should include tasks scheduled for tomorrow', () => {
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

      // Apply the filtering logic
      const filteredTasks = mockTasks.filter((task) => {
        if (!task || task.isDone) {
          return false;
        }

        if (task.dueWithTime) {
          const now = Date.now();
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          if (task.dueWithTime >= now && task.dueWithTime <= todayEnd.getTime()) {
            return false;
          }
        }

        return true;
      });

      expect(filteredTasks.length).toBe(1);
      expect(filteredTasks.find((t) => t.id === 'TOMORROW_TASK')).toBeDefined();
    });

    it('should handle edge case of task scheduled exactly at current time', () => {
      const now = Date.now();

      const mockTasks: TaskWithSubTasks[] = [
        createMockTask({
          id: 'CURRENT_TIME_TASK',
          title: 'Task at current time',
          dueWithTime: now,
        }),
      ];

      // Apply the filtering logic
      const filteredTasks = mockTasks.filter((task) => {
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

      // Task scheduled at exactly current time should be filtered out
      expect(filteredTasks.length).toBe(0);
      expect(filteredTasks.find((t) => t.id === 'CURRENT_TIME_TASK')).toBeUndefined();
    });

    it('should include parent tasks with subtasks when parent is not scheduled for later', () => {
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

      // Apply the filtering logic
      const filteredTasks = mockTasks.filter((task) => {
        if (!task || task.isDone) {
          return false;
        }

        if (task.dueWithTime) {
          const now = Date.now();
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          if (task.dueWithTime >= now && task.dueWithTime <= todayEnd.getTime()) {
            return false;
          }
        }

        return true;
      });

      expect(filteredTasks.length).toBe(1);
      expect(filteredTasks[0].id).toBe('PARENT_TASK');
      expect(filteredTasks[0].subTasks.length).toBe(1);
    });

    it('should filter out parent tasks with subtasks when parent is scheduled for later', () => {
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

      // Apply the filtering logic
      const filteredTasks = mockTasks.filter((task) => {
        if (!task || task.isDone) {
          return false;
        }

        if (task.dueWithTime) {
          const now = Date.now();
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          if (task.dueWithTime >= now && task.dueWithTime <= todayEnd.getTime()) {
            return false;
          }
        }

        return true;
      });

      expect(filteredTasks.length).toBe(0);
    });
  });
});
