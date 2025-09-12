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
import { DEFAULT_TASK, Task, TaskWithSubTasks } from '../../tasks/task.model';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfgCopy } from '../task-repeat-cfg.model';
import { addSubTask } from '../../tasks/store/task.actions';
import { TestScheduler } from 'rxjs/testing';

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
});
