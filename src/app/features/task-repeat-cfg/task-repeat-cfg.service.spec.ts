import { TestBed } from '@angular/core/testing';
import { TaskRepeatCfgService } from './task-repeat-cfg.service';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../tasks/task.service';
import { WorkContextService } from '../work-context/work-context.service';
import {
  addTaskRepeatCfgToTask,
  deleteTaskRepeatCfg,
  deleteTaskRepeatCfgs,
  updateTaskRepeatCfg,
  updateTaskRepeatCfgs,
  upsertTaskRepeatCfg,
} from './store/task-repeat-cfg.actions';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from './task-repeat-cfg.model';
import { of } from 'rxjs';
import { WorkContextType } from '../work-context/work-context.model';
import { Task, DEFAULT_TASK } from '../tasks/task.model';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { getWorklogStr } from '../../util/get-work-log-str';
import { TODAY_TAG } from '../tag/tag.const';

describe('TaskRepeatCfgService', () => {
  let service: TaskRepeatCfgService;
  let store: MockStore;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let taskService: jasmine.SpyObj<TaskService>;
  let dispatchSpy: jasmine.Spy;

  const mockTaskRepeatCfg: TaskRepeatCfg = {
    ...DEFAULT_TASK_REPEAT_CFG,
    id: 'test-cfg-id',
    title: 'Test Repeat Task',
    projectId: 'test-project',
    repeatCycle: 'DAILY',
    startDate: new Date().toISOString().split('T')[0], // Use today's date
    // eslint-disable-next-line no-mixed-operators
    lastTaskCreation: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
    repeatEvery: 1,
    defaultEstimate: 3600000,
    notes: 'Test notes',
    tagIds: ['tag1', 'tag2', TODAY_TAG.id],
  };

  const mockTask: Task = {
    ...DEFAULT_TASK,
    id: 'test-task-id',
    title: 'Test Task',
    timeSpentOnDay: {},
    timeSpent: 0,
    created: Date.now(),
    dueDay: getWorklogStr(),
    subTaskIds: [],
    projectId: 'test-project',
    notes: 'Test notes',
    repeatCfgId: 'test-cfg-id',
    timeEstimate: 3600000,
    timeSpentOnDay: {},
  } as Task;

  beforeEach(() => {
    const matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'createNewTaskWithDefaults',
      'getTasksWithSubTasksByRepeatCfgId$',
    ]);
    const workContextServiceSpy = jasmine.createSpyObj('WorkContextService', [], {
      activeWorkContextType: WorkContextType.PROJECT,
      activeWorkContextId: 'test-project',
    });

    TestBed.configureTestingModule({
      providers: [
        TaskRepeatCfgService,
        provideMockStore(),
        { provide: MatDialog, useValue: matDialogSpy },
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: WorkContextService, useValue: workContextServiceSpy },
      ],
    });

    service = TestBed.inject(TaskRepeatCfgService);
    store = TestBed.inject(MockStore);
    matDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    dispatchSpy = spyOn(store, 'dispatch');

    // Default mock return values
    taskService.createNewTaskWithDefaults.and.returnValue(mockTask);
    taskService.getTasksWithSubTasksByRepeatCfgId$.and.returnValue(of([]));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addTaskRepeatCfgToTask', () => {
    it('should dispatch addTaskRepeatCfgToTask action', () => {
      const taskId = 'test-task-id';
      const projectId = 'test-project';
      const taskRepeatCfg = { ...DEFAULT_TASK_REPEAT_CFG };

      service.addTaskRepeatCfgToTask(taskId, projectId, taskRepeatCfg);

      expect(dispatchSpy).toHaveBeenCalledWith(
        addTaskRepeatCfgToTask({
          taskRepeatCfg: jasmine.objectContaining({
            ...taskRepeatCfg,
            projectId,
            id: jasmine.any(String),
          }),
          taskId,
        }),
      );
    });

    it('should dispatch addSubTask actions when subTasks are configured', () => {
      const taskId = 'test-task-id';
      const projectId = 'test-project';
      const taskRepeatCfg = {
        ...DEFAULT_TASK_REPEAT_CFG,
        subTasks: [
          { title: 'Subtask 1', notes: 'Notes 1', timeEstimate: 1800000 },
          { title: 'Subtask 2', notes: 'Notes 2', timeEstimate: 900000 },
        ],
      };

      service.addTaskRepeatCfgToTask(taskId, projectId, taskRepeatCfg);

      // Should dispatch addTaskRepeatCfgToTask plus one addSubTask for each subtask
      expect(dispatchSpy).toHaveBeenCalledTimes(3);
      expect(dispatchSpy).toHaveBeenCalledWith(
        addTaskRepeatCfgToTask(jasmine.any(Object)),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Task] Add sub task',
        }),
      );
    });
  });

  describe('deleteTaskRepeatCfg', () => {
    it('should dispatch deleteTaskRepeatCfg action', () => {
      const id = 'test-id';
      service.deleteTaskRepeatCfg(id);
      expect(dispatchSpy).toHaveBeenCalledWith(deleteTaskRepeatCfg({ id }));
    });
  });

  describe('updateTaskRepeatCfg', () => {
    it('should dispatch updateTaskRepeatCfg action', () => {
      const id = 'test-id';
      const changes = { title: 'Updated Title' };
      service.updateTaskRepeatCfg(id, changes);
      expect(dispatchSpy).toHaveBeenCalledWith(
        updateTaskRepeatCfg({
          taskRepeatCfg: { id, changes },
          isAskToUpdateAllTaskInstances: false,
        }),
      );
    });
  });

  describe('createRepeatableTask', () => {
    it('should dispatch actions returned by getActionsForTaskRepeatCfg', async () => {
      const targetDayDate = Date.now();
      const mockActions = [
        TaskSharedActions.addTask({
          task: mockTask,
          workContextType: WorkContextType.PROJECT,
          workContextId: 'test-project',
          isAddToBacklog: false,
          isAddToBottom: false,
        }),
        updateTaskRepeatCfg({
          taskRepeatCfg: {
            id: mockTaskRepeatCfg.id,
            changes: { lastTaskCreation: targetDayDate },
          },
        }),
      ];

      spyOn(service, 'getActionsForTaskRepeatCfg').and.returnValue(
        Promise.resolve(mockActions),
      );

      await service.createRepeatableTask(mockTaskRepeatCfg, targetDayDate);

      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      mockActions.forEach((action) => {
        expect(dispatchSpy).toHaveBeenCalledWith(action);
      });
    });
  });

  describe('getActionsForTaskRepeatCfg', () => {
    beforeEach(() => {
      taskService.getTasksWithSubTasksByRepeatCfgId$.and.returnValue(of([]));
    });

    it('should return empty array if task already exists for target date', async () => {
      const targetDayDate = Date.now();
      const existingTask = { ...mockTask, created: targetDayDate };
      taskService.getTasksWithSubTasksByRepeatCfgId$.and.returnValue(of([existingTask]));

      const actions = await service.getActionsForTaskRepeatCfg(
        mockTaskRepeatCfg,
        targetDayDate,
      );

      expect(actions).toEqual([]);
    });

    it('should create actions for new task when no existing task for target date', async () => {
      const targetDayDate = Date.now();

      const actions = await service.getActionsForTaskRepeatCfg(
        mockTaskRepeatCfg,
        targetDayDate,
      );

      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain(
        jasmine.objectContaining({
          type: '[Task Shared] Add Task',
        }),
      );
      expect(actions).toContain(
        jasmine.objectContaining({
          type: '[TaskRepeatCfg] Update Task Repeat Cfg',
        }),
      );
    });

    it('should include subtask actions when taskRepeatCfg has subTasks', async () => {
      const targetDayDate = Date.now();
      const taskRepeatCfgWithSubTasks = {
        ...mockTaskRepeatCfg,
        subTasks: [
          { title: 'Subtask 1', notes: 'Notes 1', timeEstimate: 1800000 },
          { title: 'Subtask 2', notes: 'Notes 2', timeEstimate: 900000 },
        ],
      };

      const actions = await service.getActionsForTaskRepeatCfg(
        taskRepeatCfgWithSubTasks,
        targetDayDate,
      );

      const subTaskActions = actions.filter((action) =>
        action.type.includes('Add sub task'),
      );
      expect(subTaskActions.length).toBe(2);
    });

    it('should include schedule action when startTime and remindAt are configured', async () => {
      const targetDayDate = Date.now();
      const taskRepeatCfgWithSchedule = {
        ...mockTaskRepeatCfg,
        startTime: '09:00',
        remindAt: 'AT_START',
      };

      const actions = await service.getActionsForTaskRepeatCfg(
        taskRepeatCfgWithSchedule,
        targetDayDate,
      );

      const scheduleActions = actions.filter((action) =>
        action.type.includes('Schedule'),
      );
      expect(scheduleActions.length).toBe(1);
    });

    it('should throw error if taskRepeatCfg.id is missing', async () => {
      const taskRepeatCfgWithoutId = { ...mockTaskRepeatCfg, id: undefined };

      await expectAsync(
        service.getActionsForTaskRepeatCfg(taskRepeatCfgWithoutId as any),
      ).toBeRejectedWithError('No taskRepeatCfg.id');
    });
  });

  describe('deleteTaskRepeatCfgWithDialog', () => {
    it('should open confirmation dialog and delete if confirmed', () => {
      const id = 'test-id';
      const dialogRef = {
        afterClosed: () => of(true),
      };
      matDialog.open.and.returnValue(dialogRef as any);

      service.deleteTaskRepeatCfgWithDialog(id);

      expect(matDialog.open).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(deleteTaskRepeatCfg({ id }));
    });

    it('should not delete if dialog is cancelled', () => {
      const id = 'test-id';
      const dialogRef = {
        afterClosed: () => of(false),
      };
      matDialog.open.and.returnValue(dialogRef as any);

      service.deleteTaskRepeatCfgWithDialog(id);

      expect(matDialog.open).toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalledWith(deleteTaskRepeatCfg({ id }));
    });
  });

  describe('selector methods', () => {
    it('should return observables from store selectors', () => {
      const dayDate = Date.now();
      const id = 'test-id';

      service.getRepeatableTasksDueForDayOnly$(dayDate);
      service.getRepeatableTasksDueForDayIncludingOverdue$(dayDate);
      service.getTaskRepeatCfgById$(id);
      service.getTaskRepeatCfgByIdAllowUndefined$(id);

      // These methods should return observables - we're just testing they don't throw
      expect(service.getRepeatableTasksDueForDayOnly$(dayDate)).toBeDefined();
      expect(service.getRepeatableTasksDueForDayIncludingOverdue$(dayDate)).toBeDefined();
      expect(service.getTaskRepeatCfgById$(id)).toBeDefined();
      expect(service.getTaskRepeatCfgByIdAllowUndefined$(id)).toBeDefined();
    });
  });

  describe('batch operations', () => {
    it('should handle deleteTaskRepeatCfgsNoTaskCleanup', () => {
      const ids = ['id1', 'id2', 'id3'];
      service.deleteTaskRepeatCfgsNoTaskCleanup(ids);
      expect(dispatchSpy).toHaveBeenCalledWith(deleteTaskRepeatCfgs({ ids }));
    });

    it('should handle updateTaskRepeatCfgs', () => {
      const ids = ['id1', 'id2'];
      const changes = { title: 'Updated Title' };
      service.updateTaskRepeatCfgs(ids, changes);
      expect(dispatchSpy).toHaveBeenCalledWith(updateTaskRepeatCfgs({ ids, changes }));
    });

    it('should handle upsertTaskRepeatCfg', () => {
      service.upsertTaskRepeatCfg(mockTaskRepeatCfg);
      expect(dispatchSpy).toHaveBeenCalledWith(
        upsertTaskRepeatCfg({ taskRepeatCfg: mockTaskRepeatCfg }),
      );
    });
  });

  describe('_getTaskRepeatTemplate (private method testing through public interface)', () => {
    it('should create correct task template through getActionsForTaskRepeatCfg', async () => {
      const targetDayDate = Date.now();
      const taskRepeatCfgWithSubTasks = {
        ...mockTaskRepeatCfg,
        subTasks: [
          {
            title: 'Subtask 1',
            notes: 'Notes 1',
            timeEstimate: 1800000,
            isDone: false,
          },
        ],
      };

      const actions = await service.getActionsForTaskRepeatCfg(
        taskRepeatCfgWithSubTasks,
        targetDayDate,
      );

      // The addTask action should contain the correct task data
      const addTaskAction = actions.find((action) =>
        action.type.includes('[Task Shared] Add Task'),
      );
      expect(addTaskAction).toBeDefined();
      expect(addTaskAction.task.title).toBe(mockTaskRepeatCfg.title);
      expect(addTaskAction.task.repeatCfgId).toBe(mockTaskRepeatCfg.id);

      // The addSubTask actions should contain the correct subtask data
      const addSubTaskActions = actions.filter((action) =>
        action.type.includes('Add sub task'),
      );
      expect(addSubTaskActions.length).toBe(1);
      expect(addSubTaskActions[0].task.title).toBe('Subtask 1');
      expect(addSubTaskActions[0].task.timeEstimate).toBe(1800000);
    });
  });
});
