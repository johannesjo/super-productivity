import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { TaskReminderEffects } from './task-reminder.effects';
import { provideMockStore } from '@ngrx/store/testing';
import { ReminderService } from '../../reminder/reminder.service';
import { SnackService } from '../../../core/snack/snack.service';
import { TaskService } from '../task.service';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { Task, TaskWithSubTasks } from '../task.model';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';

describe('TaskReminderEffects', () => {
  let effects: TaskReminderEffects;
  let actions$: Observable<any>;
  let reminderServiceMock: jasmine.SpyObj<ReminderService>;

  const createMockTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: 'task-123',
      title: 'Test Task',
      projectId: null,
      tagIds: [],
      subTaskIds: [],
      parentId: null,
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      isDone: false,
      notes: '',
      doneOn: undefined,
      plannedAt: null,
      reminderId: null,
      repeatCfgId: null,
      issueId: null,
      issueType: null,
      issueProviderId: null,
      issueWasUpdated: false,
      issueLastUpdated: null,
      issueTimeTracked: null,
      attachments: [],
      created: Date.now(),
      _showSubTasksMode: 2,
      ...overrides,
    }) as Task;

  const createMockTaskWithSubTasks = (
    overrides: Partial<TaskWithSubTasks> = {},
  ): TaskWithSubTasks =>
    ({
      ...createMockTask(),
      subTasks: [],
      ...overrides,
    }) as TaskWithSubTasks;

  beforeEach(() => {
    reminderServiceMock = jasmine.createSpyObj('ReminderService', [
      'removeReminderByRelatedIdIfSet',
      'removeRemindersByRelatedIds',
      'removeReminder',
      'addReminder',
      'updateReminder',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskReminderEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: {} }),
        { provide: ReminderService, useValue: reminderServiceMock },
        {
          provide: SnackService,
          useValue: jasmine.createSpyObj('SnackService', ['open']),
        },
        {
          provide: TaskService,
          useValue: jasmine.createSpyObj('TaskService', [
            'getByIdOnce$',
            'getByIdsLive$',
          ]),
        },
        {
          provide: LocaleDatePipe,
          useValue: jasmine.createSpyObj('LocaleDatePipe', ['transform']),
        },
      ],
    });

    effects = TestBed.inject(TaskReminderEffects);
  });

  describe('clearRemindersOnDelete$', () => {
    it('should call removeReminderByRelatedIdIfSet for deleted task', (done) => {
      const task = createMockTaskWithSubTasks({ id: 'task-to-delete' });
      actions$ = of(TaskSharedActions.deleteTask({ task }));

      effects.clearRemindersOnDelete$.subscribe(() => {
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledWith(
          'task-to-delete',
        );
        done();
      });
    });

    it('should call removeReminderByRelatedIdIfSet for all subtasks', (done) => {
      const task = createMockTaskWithSubTasks({
        id: 'parent-task',
        subTaskIds: ['subtask-1', 'subtask-2'],
      });
      actions$ = of(TaskSharedActions.deleteTask({ task }));

      effects.clearRemindersOnDelete$.subscribe(() => {
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledTimes(
          3,
        );
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledWith(
          'parent-task',
        );
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledWith(
          'subtask-1',
        );
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledWith(
          'subtask-2',
        );
        done();
      });
    });

    it('should handle task with empty subtaskIds', (done) => {
      const task = createMockTaskWithSubTasks({
        id: 'task-no-subtasks',
        subTaskIds: [],
      });
      actions$ = of(TaskSharedActions.deleteTask({ task }));

      effects.clearRemindersOnDelete$.subscribe(() => {
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledTimes(
          1,
        );
        expect(reminderServiceMock.removeReminderByRelatedIdIfSet).toHaveBeenCalledWith(
          'task-no-subtasks',
        );
        done();
      });
    });
  });

  describe('clearMultipleReminders', () => {
    it('should call removeRemindersByRelatedIds with all task IDs', (done) => {
      const taskIds = ['task-1', 'task-2', 'task-3'];
      actions$ = of(TaskSharedActions.deleteTasks({ taskIds }));

      effects.clearMultipleReminders.subscribe(() => {
        expect(reminderServiceMock.removeRemindersByRelatedIds).toHaveBeenCalledWith(
          taskIds,
        );
        done();
      });
    });

    it('should handle empty task IDs array', (done) => {
      const taskIds: string[] = [];
      actions$ = of(TaskSharedActions.deleteTasks({ taskIds }));

      effects.clearMultipleReminders.subscribe(() => {
        expect(reminderServiceMock.removeRemindersByRelatedIds).toHaveBeenCalledWith([]);
        done();
      });
    });
  });

  describe('clearRemindersForArchivedTasks$', () => {
    it('should call removeReminder for each task with a reminderId', (done) => {
      const tasks = [
        createMockTaskWithSubTasks({ id: 'archived-1', reminderId: 'rem-1' }),
        createMockTaskWithSubTasks({ id: 'archived-2', reminderId: 'rem-2' }),
      ];
      actions$ = of(TaskSharedActions.moveToArchive({ tasks }));

      effects.clearRemindersForArchivedTasks$.subscribe(() => {
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledTimes(2);
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledWith('rem-1');
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledWith('rem-2');
        done();
      });
    });

    it('should not call removeReminder for tasks without reminderId', (done) => {
      const tasks = [
        createMockTaskWithSubTasks({ id: 'archived-1', reminderId: undefined }),
        createMockTaskWithSubTasks({ id: 'archived-2', reminderId: 'rem-2' }),
      ];
      actions$ = of(TaskSharedActions.moveToArchive({ tasks }));

      effects.clearRemindersForArchivedTasks$.subscribe(() => {
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledTimes(1);
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledWith('rem-2');
        done();
      });
    });

    it('should not call removeReminder when tasks array is empty', (done) => {
      const tasks: TaskWithSubTasks[] = [];
      actions$ = of(TaskSharedActions.moveToArchive({ tasks }));

      effects.clearRemindersForArchivedTasks$.subscribe(() => {
        expect(reminderServiceMock.removeReminder).not.toHaveBeenCalled();
        done();
      });
    });

    it('should handle nested subtasks in archived tasks', (done) => {
      const tasks = [
        createMockTaskWithSubTasks({
          id: 'parent-1',
          reminderId: 'rem-parent',
          subTasks: [
            createMockTask({
              id: 'sub-1',
              reminderId: 'rem-sub-1',
              parentId: 'parent-1',
            }),
            createMockTask({
              id: 'sub-2',
              reminderId: 'rem-sub-2',
              parentId: 'parent-1',
            }),
          ],
        }),
      ];
      actions$ = of(TaskSharedActions.moveToArchive({ tasks }));

      effects.clearRemindersForArchivedTasks$.subscribe(() => {
        // flattenTasks should include parent + subtasks
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledWith('rem-parent');
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledWith('rem-sub-1');
        expect(reminderServiceMock.removeReminder).toHaveBeenCalledWith('rem-sub-2');
        done();
      });
    });
  });
});
