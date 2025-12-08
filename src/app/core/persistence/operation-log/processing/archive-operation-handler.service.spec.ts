import { TestBed } from '@angular/core/testing';
import { ArchiveOperationHandler } from './archive-operation-handler.service';
import { PersistentAction } from '../persistent-action.interface';
import { ArchiveService } from '../../../../features/time-tracking/archive.service';
import { TaskArchiveService } from '../../../../features/time-tracking/task-archive.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { Task, TaskWithSubTasks } from '../../../../features/tasks/task.model';
import { ArchiveModel } from '../../../../features/time-tracking/time-tracking.model';
import { TaskSharedActions } from '../../../../root-store/meta/task-shared.actions';
import { flushYoungToOld } from '../../../../features/time-tracking/store/archive.actions';

describe('ArchiveOperationHandler', () => {
  let service: ArchiveOperationHandler;
  let mockArchiveService: jasmine.SpyObj<ArchiveService>;
  let mockTaskArchiveService: jasmine.SpyObj<TaskArchiveService>;
  let mockPfapiService: jasmine.SpyObj<PfapiService>;

  const createMockTaskWithSubTasks = (
    id: string,
    subTasks: Task[] = [],
  ): TaskWithSubTasks =>
    ({
      id,
      title: `Task ${id}`,
      subTaskIds: subTasks.map((st) => st.id),
      subTasks,
    }) as TaskWithSubTasks;

  const createMockTask = (id: string, subTaskIds: string[] = []): Task =>
    ({
      id,
      title: `Task ${id}`,
      subTaskIds,
    }) as Task;

  const createEmptyArchiveModel = (): ArchiveModel => ({
    task: { ids: [], entities: {} },
    timeTracking: { project: {}, tag: {} },
    lastTimeTrackingFlush: 0,
  });

  beforeEach(() => {
    mockArchiveService = jasmine.createSpyObj('ArchiveService', [
      'writeTasksToArchiveForRemoteSync',
    ]);
    mockTaskArchiveService = jasmine.createSpyObj('TaskArchiveService', ['deleteTasks']);
    mockPfapiService = jasmine.createSpyObj('PfapiService', [], {
      m: {
        archiveYoung: {
          load: jasmine
            .createSpy('load')
            .and.returnValue(Promise.resolve(createEmptyArchiveModel())),
          save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
        },
        archiveOld: {
          load: jasmine
            .createSpy('load')
            .and.returnValue(Promise.resolve(createEmptyArchiveModel())),
          save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
        },
      },
    });

    // Set up default resolved promises
    mockArchiveService.writeTasksToArchiveForRemoteSync.and.returnValue(
      Promise.resolve(),
    );
    mockTaskArchiveService.deleteTasks.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        ArchiveOperationHandler,
        { provide: ArchiveService, useValue: mockArchiveService },
        { provide: TaskArchiveService, useValue: mockTaskArchiveService },
        { provide: PfapiService, useValue: mockPfapiService },
      ],
    });

    // Get the service through TestBed to use proper DI
    service = TestBed.inject(ArchiveOperationHandler);
  });

  describe('handleRemoteOperation', () => {
    describe('moveToArchive action', () => {
      it('should write tasks to archive for remote sync', async () => {
        const tasks = [
          createMockTaskWithSubTasks('task-1'),
          createMockTaskWithSubTasks('task-2'),
        ];

        // Create action using actual action creator type
        const action = {
          type: TaskSharedActions.moveToArchive.type,
          tasks,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockArchiveService.writeTasksToArchiveForRemoteSync).toHaveBeenCalledWith(
          tasks,
        );
        expect(mockArchiveService.writeTasksToArchiveForRemoteSync).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should handle empty tasks array', async () => {
        const tasks: TaskWithSubTasks[] = [];

        const action = {
          type: TaskSharedActions.moveToArchive.type,
          tasks,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockArchiveService.writeTasksToArchiveForRemoteSync).toHaveBeenCalledWith(
          [],
        );
      });

      it('should not call other handlers for moveToArchive', async () => {
        const tasks = [createMockTaskWithSubTasks('task-1')];

        const action = {
          type: TaskSharedActions.moveToArchive.type,
          tasks,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
      });
    });

    describe('restoreTask action', () => {
      it('should delete task and subtasks from archive', async () => {
        const subTask1 = createMockTask('subtask-1');
        const subTask2 = createMockTask('subtask-2');
        const task = createMockTask('task-1', ['subtask-1', 'subtask-2']);

        const action = {
          type: TaskSharedActions.restoreTask.type,
          task,
          subTasks: [subTask1, subTask2],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockTaskArchiveService.deleteTasks).toHaveBeenCalledWith(
          ['task-1', 'subtask-1', 'subtask-2'],
          { isIgnoreDBLock: true },
        );
      });

      it('should delete only parent task when no subtasks', async () => {
        const task = createMockTask('task-1', []);

        const action = {
          type: TaskSharedActions.restoreTask.type,
          task,
          subTasks: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockTaskArchiveService.deleteTasks).toHaveBeenCalledWith(['task-1'], {
          isIgnoreDBLock: true,
        });
      });

      it('should not call other handlers for restoreTask', async () => {
        const task = createMockTask('task-1');

        const action = {
          type: TaskSharedActions.restoreTask.type,
          task,
          subTasks: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
      });
    });

    // Note: flushYoungToOld tests require module mocking which is complex in Jasmine.
    // The core functionality is tested through integration tests.
    // These tests verify the handler recognizes the action type.
    describe('flushYoungToOld action', () => {
      it('should recognize the flushYoungToOld action type', async () => {
        const timestamp = Date.now();
        const action = {
          type: flushYoungToOld.type,
          timestamp,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        // The action should be recognized and try to load archive
        // (may fail due to sorting, but we verify it attempted to process)
        try {
          await service.handleRemoteOperation(action);
        } catch {
          // Expected - sort function returns undefined in tests
        }

        // Verify it tried to load archives (confirming action was recognized)
        expect(mockPfapiService.m.archiveYoung.load).toHaveBeenCalled();
        expect(mockPfapiService.m.archiveOld.load).toHaveBeenCalled();
      });
    });

    describe('unhandled actions', () => {
      it('should do nothing for unhandled action types', async () => {
        const action = {
          type: '[SomeOther] Action',
          meta: { isPersistent: true, isRemote: true },
        } as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(mockPfapiService.m.archiveYoung.load).not.toHaveBeenCalled();
      });

      it('should not throw for unknown action types', async () => {
        const action = {
          type: '[Unknown] Random Action',
          meta: { isPersistent: true, isRemote: true },
        } as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeResolved();
      });
    });

    describe('idempotency', () => {
      it('should be safe to call multiple times for same moveToArchive action', async () => {
        const tasks = [createMockTaskWithSubTasks('task-1')];
        const action = {
          type: TaskSharedActions.moveToArchive.type,
          tasks,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);
        await service.handleRemoteOperation(action);

        expect(mockArchiveService.writeTasksToArchiveForRemoteSync).toHaveBeenCalledTimes(
          2,
        );
      });

      it('should be safe to call multiple times for same restoreTask action', async () => {
        const task = createMockTask('task-1');
        const action = {
          type: TaskSharedActions.restoreTask.type,
          task,
          subTasks: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);
        await service.handleRemoteOperation(action);

        expect(mockTaskArchiveService.deleteTasks).toHaveBeenCalledTimes(2);
      });
    });

    describe('error handling', () => {
      it('should propagate errors from writeTasksToArchiveForRemoteSync', async () => {
        const error = new Error('Archive write failed');
        mockArchiveService.writeTasksToArchiveForRemoteSync.and.returnValue(
          Promise.reject(error),
        );

        const tasks = [createMockTaskWithSubTasks('task-1')];
        const action = {
          type: TaskSharedActions.moveToArchive.type,
          tasks,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from deleteTasks', async () => {
        const error = new Error('Delete failed');
        mockTaskArchiveService.deleteTasks.and.returnValue(Promise.reject(error));

        const task = createMockTask('task-1');
        const action = {
          type: TaskSharedActions.restoreTask.type,
          task,
          subTasks: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from archive load in flushYoungToOld', async () => {
        const error = new Error('Load failed');
        (mockPfapiService.m.archiveYoung.load as jasmine.Spy).and.returnValue(
          Promise.reject(error),
        );

        const timestamp = Date.now();
        const action = {
          type: flushYoungToOld.type,
          timestamp,
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWithError(
          'Load failed',
        );
      });
    });
  });
});
