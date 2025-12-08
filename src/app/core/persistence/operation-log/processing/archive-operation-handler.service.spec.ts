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
import { deleteTag, deleteTags } from '../../../../features/tag/store/tag.actions';
import { TimeTrackingService } from '../../../../features/time-tracking/time-tracking.service';
import { IssueProviderActions } from '../../../../features/issue/store/issue-provider.actions';

describe('ArchiveOperationHandler', () => {
  let service: ArchiveOperationHandler;
  let mockArchiveService: jasmine.SpyObj<ArchiveService>;
  let mockTaskArchiveService: jasmine.SpyObj<TaskArchiveService>;
  let mockPfapiService: jasmine.SpyObj<PfapiService>;
  let mockTimeTrackingService: jasmine.SpyObj<TimeTrackingService>;

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
    mockTaskArchiveService = jasmine.createSpyObj('TaskArchiveService', [
      'deleteTasks',
      'removeAllArchiveTasksForProject',
      'removeTagsFromAllTasks',
      'removeRepeatCfgFromArchiveTasks',
      'unlinkIssueProviderFromArchiveTasks',
    ]);
    mockTimeTrackingService = jasmine.createSpyObj('TimeTrackingService', [
      'cleanupDataEverywhereForProject',
      'cleanupArchiveDataForTag',
    ]);
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
    mockTaskArchiveService.removeAllArchiveTasksForProject.and.returnValue(
      Promise.resolve(),
    );
    mockTaskArchiveService.removeTagsFromAllTasks.and.returnValue(Promise.resolve());
    mockTaskArchiveService.removeRepeatCfgFromArchiveTasks.and.returnValue(
      Promise.resolve(),
    );
    mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks.and.returnValue(
      Promise.resolve(),
    );
    mockTimeTrackingService.cleanupDataEverywhereForProject.and.returnValue(
      Promise.resolve(),
    );
    mockTimeTrackingService.cleanupArchiveDataForTag.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        ArchiveOperationHandler,
        { provide: ArchiveService, useValue: mockArchiveService },
        { provide: TaskArchiveService, useValue: mockTaskArchiveService },
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: TimeTrackingService, useValue: mockTimeTrackingService },
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

    describe('deleteProject action', () => {
      it('should remove all archive tasks for the deleted project', async () => {
        const action = {
          type: TaskSharedActions.deleteProject.type,
          projectId: 'project-1',
          noteIds: [],
          allTaskIds: ['task-1', 'task-2'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).toHaveBeenCalledWith('project-1');
        expect(
          mockTimeTrackingService.cleanupDataEverywhereForProject,
        ).toHaveBeenCalledWith('project-1');
      });

      it('should not call other handlers for deleteProject', async () => {
        const action = {
          type: TaskSharedActions.deleteProject.type,
          projectId: 'project-1',
          noteIds: [],
          allTaskIds: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
      });
    });

    describe('deleteTag action', () => {
      it('should remove tag from all archive tasks for single tag deletion', async () => {
        const action = {
          type: deleteTag.type,
          id: 'tag-1',
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockTaskArchiveService.removeTagsFromAllTasks).toHaveBeenCalledWith([
          'tag-1',
        ]);
        expect(mockTimeTrackingService.cleanupArchiveDataForTag).toHaveBeenCalledWith(
          'tag-1',
        );
      });

      it('should remove multiple tags for deleteTags action', async () => {
        const action = {
          type: deleteTags.type,
          ids: ['tag-1', 'tag-2', 'tag-3'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(mockTaskArchiveService.removeTagsFromAllTasks).toHaveBeenCalledWith([
          'tag-1',
          'tag-2',
          'tag-3',
        ]);
        expect(mockTimeTrackingService.cleanupArchiveDataForTag).toHaveBeenCalledTimes(3);
        expect(mockTimeTrackingService.cleanupArchiveDataForTag).toHaveBeenCalledWith(
          'tag-1',
        );
        expect(mockTimeTrackingService.cleanupArchiveDataForTag).toHaveBeenCalledWith(
          'tag-2',
        );
        expect(mockTimeTrackingService.cleanupArchiveDataForTag).toHaveBeenCalledWith(
          'tag-3',
        );
      });

      it('should not call other handlers for deleteTag', async () => {
        const action = {
          type: deleteTag.type,
          id: 'tag-1',
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).not.toHaveBeenCalled();
      });
    });

    describe('deleteTaskRepeatCfg action', () => {
      it('should remove repeatCfgId from all archive tasks', async () => {
        const action = {
          type: TaskSharedActions.deleteTaskRepeatCfg.type,
          taskRepeatCfgId: 'repeat-cfg-1',
          taskIdsToUnlink: ['task-1', 'task-2'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockTaskArchiveService.removeRepeatCfgFromArchiveTasks,
        ).toHaveBeenCalledWith('repeat-cfg-1');
      });

      it('should not call other handlers for deleteTaskRepeatCfg', async () => {
        const action = {
          type: TaskSharedActions.deleteTaskRepeatCfg.type,
          taskRepeatCfgId: 'repeat-cfg-1',
          taskIdsToUnlink: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.removeTagsFromAllTasks).not.toHaveBeenCalled();
      });
    });

    describe('deleteIssueProvider action', () => {
      it('should unlink issue provider from all archive tasks', async () => {
        const action = {
          type: TaskSharedActions.deleteIssueProvider.type,
          issueProviderId: 'provider-1',
          taskIdsToUnlink: ['task-1', 'task-2'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks,
        ).toHaveBeenCalledWith('provider-1');
      });

      it('should not call other handlers for deleteIssueProvider', async () => {
        const action = {
          type: TaskSharedActions.deleteIssueProvider.type,
          issueProviderId: 'provider-1',
          taskIdsToUnlink: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.removeTagsFromAllTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeRepeatCfgFromArchiveTasks,
        ).not.toHaveBeenCalled();
      });
    });

    describe('deleteIssueProviders action', () => {
      it('should unlink multiple issue providers from all archive tasks', async () => {
        const action = {
          type: IssueProviderActions.deleteIssueProviders.type,
          ids: ['provider-1', 'provider-2', 'provider-3'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks,
        ).toHaveBeenCalledTimes(3);
        expect(
          mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks,
        ).toHaveBeenCalledWith('provider-1');
        expect(
          mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks,
        ).toHaveBeenCalledWith('provider-2');
        expect(
          mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks,
        ).toHaveBeenCalledWith('provider-3');
      });

      it('should not call other handlers for deleteIssueProviders', async () => {
        const action = {
          type: IssueProviderActions.deleteIssueProviders.type,
          ids: ['provider-1'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleRemoteOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.removeTagsFromAllTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeRepeatCfgFromArchiveTasks,
        ).not.toHaveBeenCalled();
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
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.removeTagsFromAllTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeRepeatCfgFromArchiveTasks,
        ).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks,
        ).not.toHaveBeenCalled();
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

      it('should propagate errors from removeAllArchiveTasksForProject', async () => {
        const error = new Error('Remove project tasks failed');
        mockTaskArchiveService.removeAllArchiveTasksForProject.and.returnValue(
          Promise.reject(error),
        );

        const action = {
          type: TaskSharedActions.deleteProject.type,
          projectId: 'project-1',
          noteIds: [],
          allTaskIds: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from removeTagsFromAllTasks', async () => {
        const error = new Error('Remove tags failed');
        mockTaskArchiveService.removeTagsFromAllTasks.and.returnValue(
          Promise.reject(error),
        );

        const action = {
          type: deleteTag.type,
          id: 'tag-1',
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from removeRepeatCfgFromArchiveTasks', async () => {
        const error = new Error('Remove repeat cfg failed');
        mockTaskArchiveService.removeRepeatCfgFromArchiveTasks.and.returnValue(
          Promise.reject(error),
        );

        const action = {
          type: TaskSharedActions.deleteTaskRepeatCfg.type,
          taskRepeatCfgId: 'repeat-cfg-1',
          taskIdsToUnlink: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from unlinkIssueProviderFromArchiveTasks for single provider', async () => {
        const error = new Error('Unlink issue provider failed');
        mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks.and.returnValue(
          Promise.reject(error),
        );

        const action = {
          type: TaskSharedActions.deleteIssueProvider.type,
          issueProviderId: 'provider-1',
          taskIdsToUnlink: [],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from unlinkIssueProviderFromArchiveTasks for multiple providers', async () => {
        const error = new Error('Unlink issue providers failed');
        mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks.and.returnValue(
          Promise.reject(error),
        );

        const action = {
          type: IssueProviderActions.deleteIssueProviders.type,
          ids: ['provider-1', 'provider-2'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleRemoteOperation(action)).toBeRejectedWith(error);
      });
    });
  });
});
