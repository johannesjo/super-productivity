import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { TaskRepeatCfgService } from './task-repeat-cfg.service';
import { TaskService } from '../tasks/task.service';
import { TaskRepeatCfg } from './task-repeat-cfg.model';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskCopy, TaskReminderOptionId } from '../tasks/task.model';
import { WorkContextType } from '../work-context/work-context.model';
import { addTask, addSubTask, scheduleTaskWithTime } from '../tasks/store/task.actions';
import { SubTaskRepeatTemplate } from './task-repeat-cfg.model';
import { DEFAULT_TASK_REPEAT_CFG } from './task-repeat-cfg.model';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import 'jasmine';


describe('Task Repeat Config Tests', () => {
  let service: TaskRepeatCfgService;
  let storeMock: jasmine.SpyObj<Store<any>>;
  let matDialogMock: jasmine.SpyObj<MatDialog>;
  let taskServiceMock: jasmine.SpyObj<TaskService>;
  let workContextServiceMock: jasmine.SpyObj<WorkContextService>;

  const mockSubTasks: SubTaskRepeatTemplate[] = [
    {
      title: 'Test Subtask 1',
      notes: 'Test Notes 1',
      timeEstimate: 1000,
    },
    {
      title: 'Test Subtask 2',
      notes: 'Test Notes 2',
      timeEstimate: 2000,
    },
  ];

  const mockTaskRepeatCfg: TaskRepeatCfg = {
    ...DEFAULT_TASK_REPEAT_CFG,
    id: 'testRepeatCfgId',
    tagIds: [],
    startDate: '2025-06-09', // Use string date format
    repeatEvery: 1,
    repeatCycle: 'DAILY',
    lastTaskCreation: Date.now(),
    subTasks: mockSubTasks,
    title: 'Test Task',
    notes: '',
    projectId: null,
    isPaused: false,
    quickSetting: 'DAILY',
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    order: 0,
  };

  beforeEach(() => {
    storeMock = jasmine.createSpyObj('Store', ['pipe', 'dispatch']);
    matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    workContextServiceMock = jasmine.createSpyObj('WorkContextService', [
      'getTimeWorkedForDay$',
    ]);
    workContextServiceMock.activeWorkContextType = WorkContextType.PROJECT;
    workContextServiceMock.activeWorkContextId = '999';

    taskServiceMock = jasmine.createSpyObj('TaskService', [
      'getTasksWithSubTasksByRepeatCfgId$',
      'createNewTaskWithDefaults',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskRepeatCfgService,
        { provide: Store, useValue: storeMock },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: WorkContextService, useValue: workContextServiceMock },
      ],
    });

    service = TestBed.inject(TaskRepeatCfgService);
  });

  describe('Subtask Creation Tests', () => {
    beforeEach(() => {
      taskServiceMock.createNewTaskWithDefaults.and.callFake((config) => ({
        id: 'newTaskId',
        ...config.additional,
        title: config.title,
      }));
      taskServiceMock.getTasksWithSubTasksByRepeatCfgId$.and.returnValue(of([]));
    });

    it('should return an array of actions including subtask actions', async () => {
      const result = await service.getActionsForTaskRepeatCfg(mockTaskRepeatCfg);

      // Expect main task + update action + 2 subtask actions
      expect(result.length).toBe(4);
      expect(result[0].type).toBe(addTask.type);
      expect(result[2].type).toBe(addSubTask.type);
      expect(result[3].type).toBe(addSubTask.type);

      // Check subtask actions
      const subtaskAction1 = result[2] as ReturnType<typeof addSubTask>;
      const subtaskAction2 = result[3] as ReturnType<typeof addSubTask>;

      expect(subtaskAction1.task.title).toBe(mockSubTasks[0].title);
      expect(subtaskAction1.task.notes).toBe(mockSubTasks[0].notes);
      expect(subtaskAction1.task.timeEstimate).toBe(mockSubTasks[0].timeEstimate);

      expect(subtaskAction2.task.title).toBe(mockSubTasks[1].title);
      expect(subtaskAction2.task.notes).toBe(mockSubTasks[1].notes);
      expect(subtaskAction2.task.timeEstimate).toBe(mockSubTasks[1].timeEstimate);
    });

    it('should include schedule action when startTime and remindAt are set', async () => {
      const taskRepeatCfgWithTime: TaskRepeatCfg = {
        ...mockTaskRepeatCfg,
        startTime: '10:00',
        remindAt: 'AT_START',
      };

      const result = await service.getActionsForTaskRepeatCfg(taskRepeatCfgWithTime);

      // Expect main task + update action + 2 subtask actions + schedule action
      expect(result.length).toBe(5);
      expect(result[4].type).toBe(scheduleTaskWithTime.type);
    });

    it('should create subtasks with proper defaults', async () => {
      const subTasksWithDefaults: SubTaskRepeatTemplate[] = [
        {
          title: 'Test Subtask',
          notes: 'Test Notes',
          timeEstimate: 1000,
          isDone: true,
        },
      ];

      const cfgWithDefaultSubtasks: TaskRepeatCfg = {
        ...mockTaskRepeatCfg,
        subTasks: subTasksWithDefaults,
      };

      const result = await service.getActionsForTaskRepeatCfg(cfgWithDefaultSubtasks);
      const subtaskAction = result[2] as ReturnType<typeof addSubTask>;

      expect(subtaskAction.task.isDone).toBe(true);
      expect(subtaskAction.task.timeEstimate).toBe(1000);
    });

    it('should not create any actions for existing task instance', async () => {
      taskServiceMock.getTasksWithSubTasksByRepeatCfgId$.and.returnValue(
        of([
          {
            id: 'existingTaskId',
            created: Date.now(),
            repeatCfgId: mockTaskRepeatCfg.id,
          } as Partial<TaskCopy> as TaskCopy],
        ),
      );

      const result = await service.getActionsForTaskRepeatCfg(mockTaskRepeatCfg);
      expect(result).toEqual([]);
    });

    it('should throw error if taskRepeatCfg has no id', async () => {
      const invalidCfg = {
        ...mockTaskRepeatCfg,
        id: undefined,
      };
      let error: Error | undefined;

      try {
        await service.getActionsForTaskRepeatCfg(invalidCfg as any);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error?.message).toBe('No taskRepeatCfg.id');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toEqual(TaskSharedActions.addTask.type);
    });
  });
});
