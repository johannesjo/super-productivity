import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { TaskRepeatCfgService } from './task-repeat-cfg.service';
import { TaskService } from '../tasks/task.service';
import { TaskRepeatCfg } from './task-repeat-cfg.model';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskCopy } from '../tasks/task.model';
import { WorkContextType } from '../work-context/work-context.model';
import { addTask } from '../tasks/store/task.actions';

describe('TaskRepeatCfgService', () => {
  let service: TaskRepeatCfgService;
  let storeMock: jasmine.SpyObj<Store<any>>;
  let matDialogMock: jasmine.SpyObj<MatDialog>;
  let taskServiceMock: jasmine.SpyObj<TaskService>;
  let workContextServiceMock: jasmine.SpyObj<WorkContextService>;

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

  describe('getActionsForTaskRepeatCfg()', () => {
    it('should return an empty array if there are existing task instances for the given repeatCfgId', async () => {
      const TRID = 'taskRepeatCfgID';
      const taskRepeatCfg: TaskRepeatCfg = {
        id: TRID,
      } as any;
      taskServiceMock.getTasksWithSubTasksByRepeatCfgId$.and.callFake(() =>
        of([
          {
            id: 'taskID',
            created: Date.now(),
            repeatCfgId: TRID,
          } as Partial<TaskCopy> as any,
        ]),
      );

      const result = await service.getActionsForTaskRepeatCfg(taskRepeatCfg);

      expect(result).toEqual([]);
    });

    it('should return an array of actions if conditions are met', async () => {
      const TRID = 'taskRepeatCfgID';
      const taskRepeatCfg: TaskRepeatCfg = {
        id: TRID,
        tagIds: [],
        startDate: 24 * 60 * 60 * 1000,
        repeatEvery: 1,
        repeatCycle: 'DAILY',
        lastTaskCreation: 24,
      } as any;
      taskServiceMock.createNewTaskWithDefaults.and.callThrough();
      taskServiceMock.getTasksWithSubTasksByRepeatCfgId$.and.callFake(() =>
        of([
          {
            id: 'taskID',
            created: 24 * 60 * 60 * 1000,
            repeatCfgId: TRID,
            projectId: undefined,
            tagIds: [],
          } as Partial<TaskCopy> as any,
        ]),
      );

      const result = await service.getActionsForTaskRepeatCfg(taskRepeatCfg);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toEqual(addTask.type);
    });
  });
});
