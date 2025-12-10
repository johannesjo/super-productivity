import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { TaskRepeatCfgEffects } from './task-repeat-cfg.effects';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import { MatDialog } from '@angular/material/dialog';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { addTaskRepeatCfgToTask, updateTaskRepeatCfg } from './task-repeat-cfg.actions';
import {
  DEFAULT_TASK,
  Task,
  TaskWithSubTasks,
  TaskReminderOptionId,
} from '../../tasks/task.model';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfgCopy } from '../task-repeat-cfg.model';
import { addSubTask } from '../../tasks/store/task.actions';
import { TestScheduler } from 'rxjs/testing';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { remindOptionToMilliseconds } from '../../tasks/util/remind-option-to-milliseconds';

describe('TaskRepeatCfgEffects - Repeatable Subtasks', () => {
  let actions$: Observable<Action>;
  let effects: TaskRepeatCfgEffects;
  let taskService: jasmine.SpyObj<TaskService>;
  let taskRepeatCfgService: jasmine.SpyObj<TaskRepeatCfgService>;
  let taskArchiveService: jasmine.SpyObj<TaskArchiveService>;
  let testScheduler: TestScheduler;

  const mockTask: Task = {
    ...DEFAULT_TASK,
    id: 'parent-task-id',
    title: 'Parent Task',
    projectId: 'test-project',
    repeatCfgId: 'repeat-cfg-id',
    subTaskIds: ['sub1', 'sub2'],
    created: Date.now(),
  };

  const mockSubTask1: Task = {
    ...DEFAULT_TASK,
    id: 'sub1',
    title: 'SubTask 1',
    projectId: 'test-project',
    notes: 'Notes 1',
    timeEstimate: 3600000,
    parentId: 'parent-task-id',
  };

  const mockSubTask2: Task = {
    ...DEFAULT_TASK,
    id: 'sub2',
    title: 'SubTask 2',
    projectId: 'test-project',
    notes: 'Notes 2',
    timeEstimate: 7200000,
    parentId: 'parent-task-id',
  };

  const mockTaskWithSubTasks: TaskWithSubTasks = {
    ...mockTask,
    subTasks: [mockSubTask1, mockSubTask2],
  };

  const mockRepeatCfg: TaskRepeatCfgCopy = {
    ...DEFAULT_TASK_REPEAT_CFG,
    id: 'repeat-cfg-id',
    lastTaskCreationDay: getDbDateStr(),
    shouldInheritSubtasks: true,
    disableAutoUpdateSubtasks: false,
    subTaskTemplates: [],
  };

  beforeEach(() => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'getByIdWithSubTaskData$',
      'getByIdOnce$',
      'getTasksByRepeatCfgId$',
      'getByIdsLive$',
      'getArchiveTasksForRepeatCfgId',
    ]);

    const taskRepeatCfgServiceSpy = jasmine.createSpyObj('TaskRepeatCfgService', [
      'updateTaskRepeatCfg',
      'getTaskRepeatCfgById$',
    ]);

    const matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const taskArchiveServiceSpy = jasmine.createSpyObj('TaskArchiveService', ['load']);

    TestBed.configureTestingModule({
      providers: [
        TaskRepeatCfgEffects,
        provideMockActions(() => actions$),
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: TaskRepeatCfgService, useValue: taskRepeatCfgServiceSpy },
        { provide: MatDialog, useValue: matDialogSpy },
        { provide: TaskArchiveService, useValue: taskArchiveServiceSpy },
      ],
    });

    effects = TestBed.inject(TaskRepeatCfgEffects);
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    taskRepeatCfgService = TestBed.inject(
      TaskRepeatCfgService,
    ) as jasmine.SpyObj<TaskRepeatCfgService>;
    taskArchiveService = TestBed.inject(
      TaskArchiveService,
    ) as jasmine.SpyObj<TaskArchiveService>;

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('Helper Methods', () => {
    it('should convert tasks to subtask templates', () => {
      const subs = [mockSubTask1, mockSubTask2];
      const templates = (effects as any)._toSubTaskTemplates(subs);

      expect(templates).toEqual([
        {
          title: 'SubTask 1',
          notes: 'Notes 1',
          timeEstimate: 3600000,
        },
        {
          title: 'SubTask 2',
          notes: 'Notes 2',
          timeEstimate: 7200000,
        },
      ]);
    });

    it('should correctly compare template arrays for equality', () => {
      const templates1 = [
        { title: 'Task 1', notes: 'Notes 1', timeEstimate: 3600000 },
        { title: 'Task 2', notes: '', timeEstimate: 0 },
      ];

      const templates2 = [
        { title: 'Task 1', notes: 'Notes 1', timeEstimate: 3600000 },
        { title: 'Task 2', notes: '', timeEstimate: 0 },
      ];

      const templates3 = [
        { title: 'Task 1', notes: 'Notes 1', timeEstimate: 3600000 },
        { title: 'Task 2 Modified', notes: '', timeEstimate: 0 },
      ];

      expect((effects as any)._templatesEqual(templates1, templates2)).toBe(true);
      expect((effects as any)._templatesEqual(templates1, templates3)).toBe(false);
      expect((effects as any)._templatesEqual(undefined, [])).toBe(true);
      expect((effects as any)._templatesEqual([], templates1)).toBe(false);
    });

    it('should handle missing notes and timeEstimate in template comparison', () => {
      const templates1 = [{ title: 'Task 1' }];
      const templates2 = [{ title: 'Task 1', notes: '', timeEstimate: 0 }];

      expect((effects as any)._templatesEqual(templates1, templates2)).toBe(true);
    });
  });

  describe('updateTaskAfterMakingItRepeatable$', () => {
    it('should capture subtasks as templates when adding repeat config', () => {
      const action = addTaskRepeatCfgToTask({
        taskRepeatCfg: mockRepeatCfg,
        taskId: 'parent-task-id',
      });

      actions$ = of(action);
      taskService.getByIdWithSubTaskData$.and.returnValue(of(mockTaskWithSubTasks));

      // Since this is a side effect, we verify the service methods are called
      spyOn(effects as any, '_updateRegularTaskInstance');

      effects.updateTaskAfterMakingItRepeatable$.subscribe().unsubscribe();

      expect(taskRepeatCfgService.updateTaskRepeatCfg).toHaveBeenCalledWith(
        'repeat-cfg-id',
        {
          subTaskTemplates: [
            { title: 'SubTask 1', notes: 'Notes 1', timeEstimate: 3600000 },
            { title: 'SubTask 2', notes: 'Notes 2', timeEstimate: 7200000 },
          ],
        },
      );
      expect((effects as any)._updateRegularTaskInstance).toHaveBeenCalled();
    });

    it('should handle task with no subtasks', () => {
      const taskWithoutSubs: TaskWithSubTasks = {
        ...mockTask,
        subTasks: [],
      };

      const action = addTaskRepeatCfgToTask({
        taskRepeatCfg: mockRepeatCfg,
        taskId: 'parent-task-id',
      });

      actions$ = of(action);
      taskService.getByIdWithSubTaskData$.and.returnValue(of(taskWithoutSubs));

      spyOn(effects as any, '_updateRegularTaskInstance');

      effects.updateTaskAfterMakingItRepeatable$.subscribe().unsubscribe();

      expect(taskRepeatCfgService.updateTaskRepeatCfg).toHaveBeenCalledWith(
        'repeat-cfg-id',
        {
          subTaskTemplates: [],
        },
      );
    });
  });

  describe('updateStartDateOnComplete$', () => {
    it('should update startDate and lastTaskCreationDay when completing a repeat-on-complete task', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = TaskSharedActions.updateTask({
          task: { id: 'parent-task-id', changes: { isDone: true } },
        });

        actions$ = hot('-a', { a: action });

        // full task with repeatCfgId
        taskService.getByIdOnce$.and.returnValue(of(mockTask));

        // repeat cfg with repeatOnComplete true
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({ ...mockRepeatCfg, repeatFromCompletionDate: true }),
        );

        const today = getDbDateStr();
        const expectedAction = updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: 'repeat-cfg-id',
            changes: { startDate: today, lastTaskCreationDay: today },
          },
        });

        expectObservable(effects.updateStartDateOnComplete$).toBe('-a', {
          a: expectedAction,
        });
      });
    });

    it('should not emit when task has no repeatCfgId', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = TaskSharedActions.updateTask({
          task: { id: 'no-repeat-task-id', changes: { isDone: true } },
        });

        const taskWithoutRepeat: Task = {
          ...DEFAULT_TASK,
          id: 'no-repeat-task-id',
          title: 'No Repeat',
        } as Task;

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(taskWithoutRepeat));

        expectObservable(effects.updateStartDateOnComplete$).toBe('--');
      });
    });

    it('should not emit when repeatOnComplete is false', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = TaskSharedActions.updateTask({
          task: { id: 'parent-task-id', changes: { isDone: true } },
        });

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(mockTask));
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({ ...mockRepeatCfg, repeatFromCompletionDate: false }),
        );

        expectObservable(effects.updateStartDateOnComplete$).toBe('--');
      });
    });

    it('should not emit when completing a non-latest instance', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = TaskSharedActions.updateTask({
          task: { id: 'parent-task-id', changes: { isDone: true } },
        });

        const oldTask: Task = {
          ...mockTask,
          created: new Date(2020, 0, 1).getTime(),
          dueDay: '2020-01-01',
        };

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(oldTask));
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({
            ...mockRepeatCfg,
            repeatFromCompletionDate: true,
            lastTaskCreationDay: '2020-01-02',
          }),
        );

        expectObservable(effects.updateStartDateOnComplete$).toBe('--');
      });
    });
  });

  describe('autoSyncSubtaskTemplatesFromNewest$', () => {
    it('should sync templates when subtask is added to repeatable task', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = addSubTask({
          task: mockSubTask1,
          parentId: 'parent-task-id',
        });

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(mockTask));
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({
            ...mockRepeatCfg,
            shouldInheritSubtasks: true,
            disableAutoUpdateSubtasks: false,
          }),
        );
        taskService.getTasksByRepeatCfgId$.and.returnValue(of([mockTask]));
        taskService.getByIdsLive$.and.returnValue(of([mockSubTask1, mockSubTask2]));

        const expectedAction = updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: 'repeat-cfg-id',
            changes: {
              subTaskTemplates: [
                { title: 'SubTask 1', notes: 'Notes 1', timeEstimate: 3600000 },
                { title: 'SubTask 2', notes: 'Notes 2', timeEstimate: 7200000 },
              ],
            },
          },
          isAskToUpdateAllTaskInstances: false,
        });

        expectObservable(effects.autoSyncSubtaskTemplatesFromNewest$).toBe('-a', {
          a: expectedAction,
        });
      });
    });

    it('should not sync when inherit is disabled', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = addSubTask({
          task: mockSubTask1,
          parentId: 'parent-task-id',
        });

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(mockTask));
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({ ...mockRepeatCfg, shouldInheritSubtasks: false }),
        );

        expectObservable(effects.autoSyncSubtaskTemplatesFromNewest$).toBe('--');
      });
    });

    it('should not sync when auto-update is disabled', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = addSubTask({
          task: mockSubTask1,
          parentId: 'parent-task-id',
        });

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(mockTask));
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({
            ...mockRepeatCfg,
            shouldInheritSubtasks: true,
            disableAutoUpdateSubtasks: true,
          }),
        );

        expectObservable(effects.autoSyncSubtaskTemplatesFromNewest$).toBe('--');
      });
    });

    it('should not sync when templates are already equal', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = addSubTask({
          task: mockSubTask1,
          parentId: 'parent-task-id',
        });

        actions$ = hot('-a', { a: action });

        const existingTemplates = [
          { title: 'SubTask 1', notes: 'Notes 1', timeEstimate: 3600000 },
          { title: 'SubTask 2', notes: 'Notes 2', timeEstimate: 7200000 },
        ];

        taskService.getByIdOnce$.and.returnValue(of(mockTask));
        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(
          of({
            ...mockRepeatCfg,
            shouldInheritSubtasks: true,
            subTaskTemplates: existingTemplates,
          }),
        );
        taskService.getTasksByRepeatCfgId$.and.returnValue(of([mockTask]));
        taskService.getByIdsLive$.and.returnValue(of([mockSubTask1, mockSubTask2]));

        expectObservable(effects.autoSyncSubtaskTemplatesFromNewest$).toBe('--');
      });
    });
  });

  describe('enableAutoUpdateOrInheritSnapshot$', () => {
    it('should snapshot subtasks when enabling inherit', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: 'repeat-cfg-id',
            changes: { shouldInheritSubtasks: true },
          },
          isAskToUpdateAllTaskInstances: false,
        });

        actions$ = hot('-a', { a: action });

        taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(of(mockRepeatCfg));
        taskService.getTasksByRepeatCfgId$.and.returnValue(of([mockTask]));
        taskService.getByIdsLive$.and.returnValue(of([mockSubTask1, mockSubTask2]));

        const expectedAction = updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: 'repeat-cfg-id',
            changes: {
              subTaskTemplates: [
                { title: 'SubTask 1', notes: 'Notes 1', timeEstimate: 3600000 },
                { title: 'SubTask 2', notes: 'Notes 2', timeEstimate: 7200000 },
              ],
            },
          },
          isAskToUpdateAllTaskInstances: false,
        });

        expectObservable(effects.enableAutoUpdateOrInheritSnapshot$).toBe('-a', {
          a: expectedAction,
        });
      });
    });

    it('should fallback to archive when no live instances exist', (done) => {
      const action = updateTaskRepeatCfg({
        taskRepeatCfg: {
          id: 'repeat-cfg-id',
          changes: { shouldInheritSubtasks: true },
        },
        isAskToUpdateAllTaskInstances: false,
      });

      actions$ = of(action);

      const archiveTask = { ...mockTask, created: Date.now() - 86400000 }; // Yesterday
      const archiveState = {
        ids: ['sub1', 'sub2'],
        entities: {
          sub1: mockSubTask1,
          sub2: mockSubTask2,
        },
      };

      taskRepeatCfgService.getTaskRepeatCfgById$.and.returnValue(of(mockRepeatCfg));
      taskService.getTasksByRepeatCfgId$.and.returnValue(of([])); // No live instances
      taskService.getArchiveTasksForRepeatCfgId.and.returnValue(
        Promise.resolve([archiveTask]),
      );
      taskArchiveService.load.and.returnValue(Promise.resolve(archiveState));

      effects.enableAutoUpdateOrInheritSnapshot$.subscribe((result) => {
        expect(result.taskRepeatCfg.changes).toEqual({
          subTaskTemplates: [
            { title: 'SubTask 1', notes: 'Notes 1', timeEstimate: 3600000 },
            { title: 'SubTask 2', notes: 'Notes 2', timeEstimate: 7200000 },
          ],
        });
        done();
      });
    });

    it('should not snapshot when inherit is not being enabled', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: 'repeat-cfg-id',
            changes: { title: 'New Title' }, // Not enabling inherit
          },
          isAskToUpdateAllTaskInstances: false,
        });

        actions$ = hot('-a', { a: action });

        expectObservable(effects.enableAutoUpdateOrInheritSnapshot$).toBe('--');
      });
    });
  });

  describe('addRepeatCfgToTaskUpdateTask$', () => {
    it('should schedule task for today when DAILY repeat pattern matches (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const todayStr = getDbDateStr();
        const startTimeStr = '10:00';
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: todayStr,
            repeatCycle: 'DAILY',
            repeatEvery: 1,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(mockTask));

        // For DAILY repeat, getNewestPossibleDueDate returns today
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate(todayStr).getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: mockTask,
          dueWithTime: expectedDateTime,
          remindAt: remindOptionToMilliseconds(
            expectedDateTime,
            TaskReminderOptionId.AtStart,
          ),
          isMoveToBacklog: false,
          isSkipAutoRemoveFromToday: true,
        });

        expectObservable(effects.addRepeatCfgToTaskUpdateTask$).toBe('-a', {
          a: expectedAction,
        });
      });
    });

    it('should schedule task for correct weekday when WEEKLY pattern is used (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const todayStr = getDbDateStr();
        const today = new Date();
        const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startTimeStr = '10:00';

        // Create a repeat config that repeats on today's weekday
        const weekdayKeys = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ] as const;
        const todayWeekdayKey = weekdayKeys[todayDayOfWeek];

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: todayStr,
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            monday: todayWeekdayKey === 'monday',
            tuesday: todayWeekdayKey === 'tuesday',
            wednesday: todayWeekdayKey === 'wednesday',
            thursday: todayWeekdayKey === 'thursday',
            friday: todayWeekdayKey === 'friday',
            saturday: todayWeekdayKey === 'saturday',
            sunday: todayWeekdayKey === 'sunday',
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(mockTask));

        // For WEEKLY repeat on today's weekday, should return today
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate(todayStr).getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: mockTask,
          dueWithTime: expectedDateTime,
          remindAt: remindOptionToMilliseconds(
            expectedDateTime,
            TaskReminderOptionId.AtStart,
          ),
          isMoveToBacklog: false,
          isSkipAutoRemoveFromToday: true,
        });

        expectObservable(effects.addRepeatCfgToTaskUpdateTask$).toBe('-a', {
          a: expectedAction,
        });
      });
    });

    it('should fallback to task.dueDay if repeat pattern returns null', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const dueDayStr = '2025-02-01';
        const startTimeStr = '10:00';

        // Create a repeat config that cannot calculate a date (no weekdays selected for weekly)
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: undefined,
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });

        const taskWithDueDay: Task = {
          ...mockTask,
          dueDay: dueDayStr,
        };

        taskService.getByIdOnce$.and.returnValue(of(taskWithDueDay));

        // Fallback to task.dueDay when getNewestPossibleDueDate returns null
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate(dueDayStr).getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: taskWithDueDay,
          dueWithTime: expectedDateTime,
          remindAt: remindOptionToMilliseconds(
            expectedDateTime,
            TaskReminderOptionId.AtStart,
          ),
          isMoveToBacklog: false,
          isSkipAutoRemoveFromToday: true,
        });

        expectObservable(effects.addRepeatCfgToTaskUpdateTask$).toBe('-a', {
          a: expectedAction,
        });
      });
    });

    it('should use dateStrToUtcDate to avoid UTC parsing issues (issue #5515)', () => {
      // This test verifies that date string parsing uses local midnight, not UTC midnight
      // In far-west timezones (e.g., Hawaii UTC-10), new Date('2025-01-15') would give
      // Jan 14th local date, but dateStrToUtcDate correctly gives Jan 15th local date
      testScheduler.run(({ hot, expectObservable }) => {
        const dateStr = getDbDateStr(); // Use today for predictable results
        const startTimeStr = '14:45'; // 2:45 PM - user's reported time
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: dateStr,
            repeatCycle: 'DAILY',
            repeatEvery: 1,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(mockTask));

        // Verify dateStrToUtcDate gives correct local date
        const localDate = dateStrToUtcDate(dateStr);
        const today = new Date();
        expect(localDate.getDate()).toBe(today.getDate());
        expect(localDate.getMonth()).toBe(today.getMonth());
        expect(localDate.getFullYear()).toBe(today.getFullYear());

        // The scheduled time should be 14:45 on today local time
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          localDate.getTime(),
        );
        const scheduledDate = new Date(expectedDateTime);
        expect(scheduledDate.getHours()).toBe(14);
        expect(scheduledDate.getMinutes()).toBe(45);

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: mockTask,
          dueWithTime: expectedDateTime,
          remindAt: remindOptionToMilliseconds(
            expectedDateTime,
            TaskReminderOptionId.AtStart,
          ),
          isMoveToBacklog: false,
          isSkipAutoRemoveFromToday: true,
        });

        expectObservable(effects.addRepeatCfgToTaskUpdateTask$).toBe('-a', {
          a: expectedAction,
        });
      });
    });
  });
});
