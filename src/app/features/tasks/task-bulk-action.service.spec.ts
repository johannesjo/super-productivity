import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { TaskBulkActionService } from './task-bulk-action.service';
import { TaskService } from './task.service';
import { TaskMultiSelectService } from './task-multi-select.service';
import { TaskMoveToProjectService } from './task-move-to-project.service';
import { ProjectService } from '../project/project.service';
import { SnackService } from '../../core/snack/snack.service';
import { DateService } from '../../core/date/date.service';
import { GlobalConfigService } from '../config/global-config.service';
import { WorkContextService } from '../work-context/work-context.service';
import { DEFAULT_TASK, Task } from './task.model';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { T } from '../../t.const';

describe('TaskBulkActionService', () => {
  let service: TaskBulkActionService;
  let taskService: jasmine.SpyObj<TaskService>;
  let currentTaskId: ReturnType<typeof signal<string | null>>;
  let store: { dispatch: jasmine.Spy; selectSignal: jasmine.Spy; select: jasmine.Spy };
  let matDialog: { open: jasmine.Spy };
  let snackService: { open: jasmine.Spy };
  let moveToProjectService: { moveToProject: jasmine.Spy };
  let entities: ReturnType<typeof signal<Record<string, Task>>>;
  let selectedIds: ReturnType<typeof signal<ReadonlySet<string>>>;
  let multiSelect: {
    selectedIds: typeof selectedIds;
    selectedIdsInDomOrder: jasmine.Spy;
    clear: jasmine.Spy;
  };
  let dialogResult: unknown;

  const t = (id: string, overrides: Partial<Task> = {}): Task => ({
    ...DEFAULT_TASK,
    id,
    title: id,
    projectId: 'p1',
    ...overrides,
  });

  const select = (tasks: Task[]): void => {
    const map: Record<string, Task> = {};
    tasks.forEach((task) => (map[task.id] = task));
    entities.set(map);
    selectedIds.set(new Set(tasks.map((task) => task.id)));
    multiSelect.selectedIdsInDomOrder.and.returnValue(tasks.map((task) => task.id));
  };

  const dispatchedTypes = (): string[] =>
    store.dispatch.calls.allArgs().map(([action]) => (action as { type: string }).type);

  beforeEach(() => {
    entities = signal<Record<string, Task>>({});
    selectedIds = signal<ReadonlySet<string>>(new Set());
    dialogResult = true;

    taskService = jasmine.createSpyObj<TaskService>('TaskService', [
      'setDone',
      'setUnDone',
      'removeMultipleTasks',
      'updateTags',
      'update',
      'scheduleTask',
    ]);
    currentTaskId = signal<string | null>(null);
    (taskService as unknown as { currentTaskId: unknown }).currentTaskId = currentTaskId;

    store = {
      dispatch: jasmine.createSpy('dispatch'),
      selectSignal: jasmine.createSpy('selectSignal').and.returnValue(entities),
      select: jasmine
        .createSpy('select')
        .and.callFake((_sel: unknown, props: { id: string }) =>
          of({ ...entities()[props.id], subTasks: [] }),
        ),
    };
    matDialog = {
      open: jasmine
        .createSpy('open')
        .and.callFake(() => ({ afterClosed: () => of(dialogResult) })),
    };
    snackService = { open: jasmine.createSpy('open') };
    moveToProjectService = {
      moveToProject: jasmine.createSpy('moveToProject').and.resolveTo(true),
    };
    multiSelect = {
      selectedIds,
      selectedIdsInDomOrder: jasmine
        .createSpy('selectedIdsInDomOrder')
        .and.returnValue([]),
      clear: jasmine.createSpy('clear'),
    };

    TestBed.configureTestingModule({
      providers: [
        TaskBulkActionService,
        { provide: Store, useValue: store },
        { provide: TaskService, useValue: taskService },
        { provide: TaskMultiSelectService, useValue: multiSelect },
        { provide: TaskMoveToProjectService, useValue: moveToProjectService },
        {
          provide: ProjectService,
          useValue: {
            getByIdOnce$: () => of({ id: 'p2', title: 'Project 2' }),
            moveTaskToBacklog: jasmine.createSpy('moveTaskToBacklog'),
            moveTaskToTodayList: jasmine.createSpy('moveTaskToTodayList'),
          },
        },
        { provide: MatDialog, useValue: matDialog },
        { provide: SnackService, useValue: snackService },
        {
          provide: DateService,
          useValue: {
            todayStr: () => '2026-09-05',
            getStartOfNextDayDiffMs: () => 0,
            isToday: () => false,
          },
        },
        {
          provide: GlobalConfigService,
          useValue: { sound: signal({ doneSound: null }), cfg: signal(undefined) },
        },
        { provide: WorkContextService, useValue: { flatDoneTodayNr$: of(0) } },
      ],
    });
    service = TestBed.inject(TaskBulkActionService);
  });

  describe('markDone', () => {
    it('marks every undone task individually, subtasks first and the tracked task last', async () => {
      currentTaskId.set('tracked');
      select([
        t('tracked'),
        t('parent'),
        t('sub', { parentId: 'parent' }),
        t('done', { isDone: true }),
      ]);

      await service.markDone();

      expect(taskService.setDone.calls.allArgs().map(([id]) => id)).toEqual([
        'sub',
        'parent',
        'tracked',
      ]);
      expect(snackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          msg: T.F.TASK.MULTI_SELECT.S.DONE,
          translateParams: { count: 3 },
        }),
      );
    });

    it('suppresses per-task feedback only while the loop runs', async () => {
      let wasSuppressedDuringLoop = false;
      taskService.setDone.and.callFake(() => {
        wasSuppressedDuringLoop = service.isFeedbackSuppressed();
      });
      select([t('a')]);

      await service.markDone();

      expect(wasSuppressedDuringLoop).toBeTrue();
      expect(service.isFeedbackSuppressed()).toBeFalse();
    });

    it('does nothing when everything is already done', async () => {
      select([t('a', { isDone: true })]);
      await service.markDone();
      expect(taskService.setDone).not.toHaveBeenCalled();
      expect(snackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({ msg: T.F.TASK.MULTI_SELECT.S.NOTHING_TO_DO }),
      );
    });
  });

  describe('toggleDone', () => {
    it('marks all undone when every task is done', async () => {
      select([t('a', { isDone: true }), t('b', { isDone: true })]);
      await service.toggleDone();
      expect(taskService.setUnDone).toHaveBeenCalledTimes(2);
      expect(taskService.setDone).not.toHaveBeenCalled();
    });
  });

  describe('deleteSelected', () => {
    it('confirms, dedupes subtasks of selected parents and clears the selection', async () => {
      select([
        t('parent', { subTaskIds: ['sub'] }),
        t('sub', { parentId: 'parent' }),
        t('lone', { parentId: 'x' }),
      ]);

      await service.deleteSelected();

      expect(matDialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({
          data: jasmine.objectContaining({ translateParams: { count: 2 } }),
        }),
      );
      expect(taskService.removeMultipleTasks).toHaveBeenCalledWith(['parent', 'lone']);
      expect(multiSelect.clear).toHaveBeenCalled();
    });

    it('does nothing when the confirmation is cancelled', async () => {
      dialogResult = false;
      select([t('a')]);
      await service.deleteSelected();
      expect(taskService.removeMultipleTasks).not.toHaveBeenCalled();
    });
  });

  describe('moveToProject', () => {
    it('moves parents once per repeat config, skips subtasks and reports partial', async () => {
      select([
        t('r1', { repeatCfgId: 'cfg' }),
        t('r2', { repeatCfgId: 'cfg' }),
        t('plain'),
        t('already', { projectId: 'p2' }),
        t('sub', { parentId: 'other' }),
      ]);

      await service.moveToProject('p2');

      const movedIds = moveToProjectService.moveToProject.calls
        .allArgs()
        .map(([task]) => (task as Task).id);
      expect(movedIds).toEqual(['plain', 'r1']);
      expect(snackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          msg: T.F.TASK.MULTI_SELECT.S.MOVED_TO_PROJECT,
          translateParams: { count: 2, projectTitle: 'Project 2' },
        }),
      );
      expect(snackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({ msg: T.F.TASK.MULTI_SELECT.S.APPLIED_PARTIAL }),
      );
      expect(service.isFeedbackSuppressed()).toBeFalse();
    });
  });

  describe('toggleTag', () => {
    it('adds the tag to all when not every task has it', async () => {
      select([t('a', { tagIds: ['x'] }), t('b', { tagIds: [] })]);
      await service.toggleTag('x');
      expect(taskService.updateTags).toHaveBeenCalledTimes(1);
      expect(taskService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'b' }),
        ['x'],
      );
    });

    it('removes the tag from all when every task has it', async () => {
      select([t('a', { tagIds: ['x', 'y'] }), t('b', { tagIds: ['x'] })]);
      await service.toggleTag('x');
      expect(taskService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'a' }),
        ['y'],
      );
      expect(taskService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'b' }),
        [],
      );
    });
  });

  describe('unschedule', () => {
    it('dispatches per task with the toast skipped and shows one summary', async () => {
      select([t('a', { dueDay: '2026-09-10' }), t('b'), t('c', { dueWithTime: 123 })]);
      await service.unschedule();
      const actions = store.dispatch.calls.allArgs().map(([a]) => a);
      expect(actions.length).toBe(2);
      actions.forEach((a) => {
        expect(a.type).toBe(TaskSharedActions.unscheduleTask.type);
        expect(a.isSkipToast).toBeTrue();
      });
      expect(snackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({ translateParams: { count: 2 } }),
      );
    });
  });

  describe('addToToday', () => {
    it('uses the existing bulk planTasksForToday action once', async () => {
      select([t('a'), t('b', { dueDay: '2026-09-05' }), t('sub', { parentId: 'a' })]);
      await service.addToToday();
      expect(dispatchedTypes()).toEqual([TaskSharedActions.planTasksForToday.type]);
      const action = store.dispatch.calls.mostRecent().args[0];
      expect(action.taskIds).toEqual(['a', 'sub']);
      expect(action.parentTaskMap).toEqual({ a: undefined, sub: 'a' });
    });
  });

  describe('setEstimate', () => {
    it('skips parents with subtasks and unchanged values', async () => {
      select([
        t('a', { timeEstimate: 0 }),
        t('p', { subTaskIds: ['x'] }),
        t('same', { timeEstimate: 5 }),
      ]);
      await service.setEstimate(5);
      expect(taskService.update).toHaveBeenCalledTimes(1);
      expect(taskService.update).toHaveBeenCalledWith('a', { timeEstimate: 5 });
    });
  });
});
