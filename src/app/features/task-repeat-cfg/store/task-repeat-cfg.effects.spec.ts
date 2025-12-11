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

    it('should fallback to task.dueDay when startDate is undefined (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const dueDayStr = '2025-02-01';
        const startTimeStr = '10:00';

        // Create a repeat config without startDate - should gracefully fallback
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: undefined,
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            monday: true,
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

        // When startDate is undefined, skip getNewestPossibleDueDate and use task.dueDay
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

    it('should fallback to task.dueWithTime when startDate is undefined and no dueDay', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const dueWithTime = new Date(2025, 1, 15, 14, 30).getTime(); // Feb 15, 2025 14:30
        const startTimeStr = '10:00';

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: undefined,
            repeatCycle: 'DAILY',
            repeatEvery: 1,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });

        const taskWithDueWithTime: Task = {
          ...mockTask,
          dueDay: undefined,
          dueWithTime,
        };

        taskService.getByIdOnce$.and.returnValue(of(taskWithDueWithTime));

        // Fallback to task.dueWithTime when no startDate and no dueDay
        const expectedDateTime = getDateTimeFromClockString(startTimeStr, dueWithTime);

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: taskWithDueWithTime,
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

    it('should fallback to Date.now() when no dates available', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const startTimeStr = '10:00';
        const now = Date.now();

        // Mock Date.now for predictable results
        spyOn(Date, 'now').and.returnValue(now);

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: undefined,
            repeatCycle: 'DAILY',
            repeatEvery: 1,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });

        const taskWithNoDates: Task = {
          ...mockTask,
          dueDay: undefined,
          dueWithTime: undefined,
        };

        taskService.getByIdOnce$.and.returnValue(of(taskWithNoDates));

        const expectedDateTime = getDateTimeFromClockString(startTimeStr, now);

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: taskWithNoDates,
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

    it('should handle MONTHLY repeat pattern correctly (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const todayStr = getDbDateStr();
        const startTimeStr = '10:00';

        // Set startDate to today so MONTHLY pattern matches today
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: todayStr,
            repeatCycle: 'MONTHLY',
            repeatEvery: 1,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(mockTask));

        // For MONTHLY on the same day of month as startDate, should return today
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

    it('should fallback to task.dueDay when WEEKLY pattern does not match today (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const todayStr = getDbDateStr();
        const dueDayStr = '2025-03-15';
        const startTimeStr = '10:00';
        const today = new Date();
        const todayDayOfWeek = today.getDay();

        // Create a repeat config for a day that is NOT today
        // Find a weekday that is NOT today
        const notTodayDayOfWeek = (todayDayOfWeek + 3) % 7; // 3 days from today
        const weekdayKeys = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ] as const;
        const notTodayWeekdayKey = weekdayKeys[notTodayDayOfWeek];

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: todayStr,
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            monday: notTodayWeekdayKey === 'monday',
            tuesday: notTodayWeekdayKey === 'tuesday',
            wednesday: notTodayWeekdayKey === 'wednesday',
            thursday: notTodayWeekdayKey === 'thursday',
            friday: notTodayWeekdayKey === 'friday',
            saturday: notTodayWeekdayKey === 'saturday',
            sunday: notTodayWeekdayKey === 'sunday',
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

        // When WEEKLY pattern doesn't match today, getNewestPossibleDueDate returns null
        // So we should fall back to task.dueDay
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

    it('should fallback gracefully when repeatEvery is invalid (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const todayStr = getDbDateStr();
        const dueDayStr = '2025-03-15';
        const startTimeStr = '10:00';

        // Create a repeat config with invalid repeatEvery (0)
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: todayStr,
            repeatCycle: 'DAILY',
            repeatEvery: 0, // Invalid!
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

        // Should catch the error from getNewestPossibleDueDate and fall back
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

    it('should handle YEARLY repeat pattern correctly (issue #5594)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const todayStr = getDbDateStr();
        const startTimeStr = '10:00';

        // Set startDate to today so YEARLY pattern matches today
        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: {
            ...mockRepeatCfg,
            startDate: todayStr,
            repeatCycle: 'YEARLY',
            repeatEvery: 1,
          },
          taskId: 'parent-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(mockTask));

        // For YEARLY on the same day/month as startDate, should return today
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

/**
 * Deterministic tests using jasmine.clock() to mock specific dates.
 * These tests ensure reliable, reproducible results regardless of when they run.
 */
describe('TaskRepeatCfgEffects - Deterministic Date Scenarios', () => {
  let actions$: Observable<Action>;
  let effects: TaskRepeatCfgEffects;
  let taskService: jasmine.SpyObj<TaskService>;
  let testScheduler: TestScheduler;

  // Fixed reference date: Wednesday, January 15, 2025
  const FIXED_WEDNESDAY = new Date(2025, 0, 15, 12, 0, 0);

  const baseTask: Task = {
    ...DEFAULT_TASK,
    id: 'test-task-id',
    title: 'Test Task',
    projectId: 'test-project',
    repeatCfgId: 'repeat-cfg-id',
    subTaskIds: [],
    created: FIXED_WEDNESDAY.getTime(),
  };

  const baseRepeatCfg: TaskRepeatCfgCopy = {
    ...DEFAULT_TASK_REPEAT_CFG,
    id: 'repeat-cfg-id',
    title: 'Test Repeat',
    lastTaskCreationDay: '1970-01-01', // No previous creation
    shouldInheritSubtasks: false,
    disableAutoUpdateSubtasks: false,
    subTaskTemplates: [],
  };

  beforeEach(() => {
    // Install jasmine clock BEFORE TestBed setup
    jasmine.clock().install();
    jasmine.clock().mockDate(FIXED_WEDNESDAY);

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

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('Scenario: Wednesday creating task for different weekdays', () => {
    // Today is Wednesday (Jan 15, 2025)
    const scenarios = [
      {
        name: 'WEEKLY on Wednesday (today) - should schedule for today',
        weekday: 'wednesday',
        expectedDateStr: '2025-01-15',
        shouldMatchToday: true,
      },
      {
        // Friday (Jan 10) is in the previous ISO week, so diffInWeeks < 0 causes early break
        // Falls back to task.dueDay (Jan 20)
        name: 'WEEKLY on Friday - previous week, falls back to task.dueDay',
        weekday: 'friday',
        expectedDateStr: '2025-01-20', // Fallback to task.dueDay
        shouldMatchToday: false, // Uses fallback, not calculated date
      },
      {
        // Monday is 2 days behind, getNewestPossibleDueDate returns last Monday (Jan 13)
        name: 'WEEKLY on Monday - returns last Monday (Jan 13)',
        weekday: 'monday',
        expectedDateStr: '2025-01-13', // Last Monday before Jan 15
        shouldMatchToday: true, // Uses calculated date, not fallback
      },
    ];

    scenarios.forEach(({ name, weekday, expectedDateStr, shouldMatchToday }) => {
      it(name, () => {
        testScheduler.run(({ hot, expectObservable }) => {
          const startTimeStr = '10:00';
          const fallbackDueDay = '2025-01-20'; // Fallback date

          const repeatCfg: TaskRepeatCfgCopy = {
            ...baseRepeatCfg,
            startDate: '2025-01-15', // Today (Wednesday)
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            monday: weekday === 'monday',
            tuesday: weekday === 'tuesday',
            wednesday: weekday === 'wednesday',
            thursday: weekday === 'thursday',
            friday: weekday === 'friday',
            saturday: weekday === 'saturday',
            sunday: weekday === 'sunday',
          };

          const action = addTaskRepeatCfgToTask({
            taskRepeatCfg: repeatCfg,
            taskId: 'test-task-id',
            startTime: startTimeStr,
            remindAt: TaskReminderOptionId.AtStart,
          });

          actions$ = hot('-a', { a: action });

          const taskWithFallback: Task = {
            ...baseTask,
            dueDay: fallbackDueDay,
          };

          taskService.getByIdOnce$.and.returnValue(of(taskWithFallback));

          // Calculate expected date
          const targetDateStr = shouldMatchToday ? expectedDateStr : fallbackDueDay;
          const expectedDateTime = getDateTimeFromClockString(
            startTimeStr,
            dateStrToUtcDate(targetDateStr!).getTime(),
          );

          const expectedAction = TaskSharedActions.scheduleTaskWithTime({
            task: taskWithFallback,
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

  describe('Scenario: Monthly repeat patterns', () => {
    it('should schedule for today when MONTHLY and today matches the day of month', () => {
      // Today is Jan 15, startDate is also the 15th
      testScheduler.run(({ hot, expectObservable }) => {
        const startTimeStr = '09:00';

        const repeatCfg: TaskRepeatCfgCopy = {
          ...baseRepeatCfg,
          startDate: '2024-12-15', // Previous month, same day
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
        };

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: repeatCfg,
          taskId: 'test-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(baseTask));

        // Should calculate Jan 15, 2025 as the target date
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate('2025-01-15').getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: baseTask,
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

    it('should return last month occurrence when MONTHLY day has not occurred yet this month', () => {
      // Today is Jan 15, repeat is for the 20th
      // getNewestPossibleDueDate returns Dec 20 (last occurrence of the 20th)
      testScheduler.run(({ hot, expectObservable }) => {
        const startTimeStr = '09:00';
        // Dec 20, 2024 is the most recent 20th before Jan 15, 2025
        const expectedDateStr = '2024-12-20';

        const repeatCfg: TaskRepeatCfgCopy = {
          ...baseRepeatCfg,
          startDate: '2024-12-20', // 20th of month
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
        };

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: repeatCfg,
          taskId: 'test-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });

        taskService.getByIdOnce$.and.returnValue(of(baseTask));

        // getNewestPossibleDueDate returns Dec 20, 2024 (the last valid occurrence)
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate(expectedDateStr).getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: baseTask,
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

  describe('Scenario: Daily patterns', () => {
    it('should always schedule for today with DAILY pattern', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const startTimeStr = '08:00';

        const repeatCfg: TaskRepeatCfgCopy = {
          ...baseRepeatCfg,
          startDate: '2025-01-01', // Started earlier this month
          repeatCycle: 'DAILY',
          repeatEvery: 1,
        };

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: repeatCfg,
          taskId: 'test-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(baseTask));

        // DAILY always matches today
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate('2025-01-15').getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: baseTask,
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

    it('should handle DAILY with repeatEvery > 1', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const startTimeStr = '08:00';

        // Start date Jan 13, repeatEvery 2 means: Jan 13, 15, 17...
        // Today is Jan 15, which is a valid day
        const repeatCfg: TaskRepeatCfgCopy = {
          ...baseRepeatCfg,
          startDate: '2025-01-13',
          repeatCycle: 'DAILY',
          repeatEvery: 2,
        };

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: repeatCfg,
          taskId: 'test-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });
        taskService.getByIdOnce$.and.returnValue(of(baseTask));

        // Jan 15 is 2 days from Jan 13, so it matches the pattern
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate('2025-01-15').getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: baseTask,
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

  describe('Scenario: Edge cases and error handling', () => {
    it('should handle future startDate gracefully (fallback to task.dueDay)', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const startTimeStr = '10:00';
        const fallbackDueDay = '2025-01-15';

        // startDate is in the future
        const repeatCfg: TaskRepeatCfgCopy = {
          ...baseRepeatCfg,
          startDate: '2025-02-01', // Future date
          repeatCycle: 'DAILY',
          repeatEvery: 1,
        };

        const action = addTaskRepeatCfgToTask({
          taskRepeatCfg: repeatCfg,
          taskId: 'test-task-id',
          startTime: startTimeStr,
          remindAt: TaskReminderOptionId.AtStart,
        });

        actions$ = hot('-a', { a: action });

        const taskWithFallback: Task = {
          ...baseTask,
          dueDay: fallbackDueDay,
        };

        taskService.getByIdOnce$.and.returnValue(of(taskWithFallback));

        // Future startDate means getNewestPossibleDueDate returns null
        const expectedDateTime = getDateTimeFromClockString(
          startTimeStr,
          dateStrToUtcDate(fallbackDueDay).getTime(),
        );

        const expectedAction = TaskSharedActions.scheduleTaskWithTime({
          task: taskWithFallback,
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
