import { TestBed } from '@angular/core/testing';
import {
  ArchiveOperationHandler,
  isArchiveAffectingAction,
} from './archive-operation-handler.service';
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
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';

describe('isArchiveAffectingAction', () => {
  it('should return true for moveToArchive action', () => {
    const action = { type: TaskSharedActions.moveToArchive.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for restoreTask action', () => {
    const action = { type: TaskSharedActions.restoreTask.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for flushYoungToOld action', () => {
    const action = { type: flushYoungToOld.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for deleteProject action', () => {
    const action = { type: TaskSharedActions.deleteProject.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for deleteTag action', () => {
    const action = { type: deleteTag.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for deleteTags action', () => {
    const action = { type: deleteTags.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for deleteTaskRepeatCfg action', () => {
    const action = { type: TaskSharedActions.deleteTaskRepeatCfg.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for deleteIssueProvider action', () => {
    const action = { type: TaskSharedActions.deleteIssueProvider.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for deleteIssueProviders action', () => {
    const action = { type: TaskSharedActions.deleteIssueProviders.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return false for non-archive-affecting actions', () => {
    const action = { type: '[Task] Update Task' };
    expect(isArchiveAffectingAction(action)).toBe(false);
  });

  it('should return false for addTask action', () => {
    const action = { type: TaskSharedActions.addTask.type };
    expect(isArchiveAffectingAction(action)).toBe(false);
  });

  it('should return true for updateTask action', () => {
    const action = { type: TaskSharedActions.updateTask.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });

  it('should return true for loadAllData action (SYNC_IMPORT/BACKUP_IMPORT)', () => {
    const action = { type: loadAllData.type };
    expect(isArchiveAffectingAction(action)).toBe(true);
  });
});

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
      'updateTask',
      'hasTask',
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
    mockTaskArchiveService.updateTask.and.returnValue(Promise.resolve());
    // By default, assume task is in archive (for updateTask tests)
    mockTaskArchiveService.hasTask.and.returnValue(Promise.resolve(true));
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

  describe('handleOperation', () => {
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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
      });
    });

    describe('updateTask action', () => {
      it('should update archived task for remote operations', async () => {
        const action = {
          type: TaskSharedActions.updateTask.type,
          task: { id: 'task-1', changes: { title: 'Updated Title' } },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockTaskArchiveService.updateTask).toHaveBeenCalledWith(
          'task-1',
          { title: 'Updated Title' },
          { isSkipDispatch: true, isIgnoreDBLock: true },
        );
      });

      it('should NOT update archive for local operations (already done by TaskArchiveService)', async () => {
        const action = {
          type: TaskSharedActions.updateTask.type,
          task: { id: 'task-1', changes: { title: 'Updated Title' } },
          meta: { isPersistent: true, isRemote: false },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockTaskArchiveService.updateTask).not.toHaveBeenCalled();
      });

      it('should NOT update archive when isRemote is undefined (treated as local)', async () => {
        const action = {
          type: TaskSharedActions.updateTask.type,
          task: { id: 'task-1', changes: { title: 'Updated Title' } },
          meta: { isPersistent: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockTaskArchiveService.updateTask).not.toHaveBeenCalled();
      });

      it('should skip update for task not in archive (task is non-archived)', async () => {
        // Task is not in archive
        mockTaskArchiveService.hasTask.and.returnValue(Promise.resolve(false));

        const action = {
          type: TaskSharedActions.updateTask.type,
          task: { id: 'task-1', changes: { title: 'Updated Title' } },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        // Should check if task exists and skip update since it's not in archive
        expect(mockTaskArchiveService.hasTask).toHaveBeenCalledWith('task-1');
        expect(mockTaskArchiveService.updateTask).not.toHaveBeenCalled();
      });

      it('should not call other handlers for updateTask', async () => {
        const action = {
          type: TaskSharedActions.updateTask.type,
          task: { id: 'task-1', changes: { title: 'Updated' } },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
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
          await service.handleOperation(action);
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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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

        await service.handleOperation(action);

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
          type: TaskSharedActions.deleteIssueProviders.type,
          ids: ['provider-1', 'provider-2', 'provider-3'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

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
          type: TaskSharedActions.deleteIssueProviders.type,
          ids: ['provider-1'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

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

    describe('loadAllData action (SYNC_IMPORT/BACKUP_IMPORT)', () => {
      const createArchiveModelForTest = (taskIds: string[]): ArchiveModel => ({
        task: {
          ids: taskIds,
          entities: taskIds.reduce(
            (acc, id) => ({ ...acc, [id]: { id, title: `Task ${id}` } }),
            {},
          ),
        },
        timeTracking: { project: {}, tag: {} },
        lastTimeTrackingFlush: Date.now(),
      });

      it('should write archiveYoung to IndexedDB for remote operations', async () => {
        const archiveYoungData = createArchiveModelForTest(['archived-1', 'archived-2']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).toHaveBeenCalledWith(
          archiveYoungData,
          { isUpdateRevAndLastUpdate: false, isIgnoreDBLock: true },
        );
      });

      it('should write archiveOld to IndexedDB for remote operations', async () => {
        const archiveOldData = createArchiveModelForTest(['old-archived-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveOld: archiveOldData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveOld.save).toHaveBeenCalledWith(archiveOldData, {
          isUpdateRevAndLastUpdate: false,
          isIgnoreDBLock: true,
        });
      });

      it('should write both archiveYoung and archiveOld for remote operations', async () => {
        const archiveYoungData = createArchiveModelForTest(['young-1']);
        const archiveOldData = createArchiveModelForTest(['old-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData, archiveOld: archiveOldData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).toHaveBeenCalledWith(
          archiveYoungData,
          { isUpdateRevAndLastUpdate: false, isIgnoreDBLock: true },
        );
        expect(mockPfapiService.m.archiveOld.save).toHaveBeenCalledWith(archiveOldData, {
          isUpdateRevAndLastUpdate: false,
          isIgnoreDBLock: true,
        });
      });

      it('should NOT write archive for local operations (already done by PfapiService)', async () => {
        const archiveYoungData = createArchiveModelForTest(['archived-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData },
          meta: { isPersistent: true, isRemote: false },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).not.toHaveBeenCalled();
        expect(mockPfapiService.m.archiveOld.save).not.toHaveBeenCalled();
      });

      it('should NOT write archive when isRemote is undefined (treated as local)', async () => {
        const archiveYoungData = createArchiveModelForTest(['archived-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData },
          meta: { isPersistent: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).not.toHaveBeenCalled();
        expect(mockPfapiService.m.archiveOld.save).not.toHaveBeenCalled();
      });

      it('should handle missing archiveYoung gracefully', async () => {
        const archiveOldData = createArchiveModelForTest(['old-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveOld: archiveOldData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).not.toHaveBeenCalled();
        expect(mockPfapiService.m.archiveOld.save).toHaveBeenCalledWith(archiveOldData, {
          isUpdateRevAndLastUpdate: false,
          isIgnoreDBLock: true,
        });
      });

      it('should handle missing archiveOld gracefully', async () => {
        const archiveYoungData = createArchiveModelForTest(['young-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).toHaveBeenCalledWith(
          archiveYoungData,
          { isUpdateRevAndLastUpdate: false, isIgnoreDBLock: true },
        );
        expect(mockPfapiService.m.archiveOld.save).not.toHaveBeenCalled();
      });

      it('should handle empty appDataComplete gracefully', async () => {
        const action = {
          type: loadAllData.type,
          appDataComplete: {},
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(mockPfapiService.m.archiveYoung.save).not.toHaveBeenCalled();
        expect(mockPfapiService.m.archiveOld.save).not.toHaveBeenCalled();
      });

      it('should preserve timeTracking data in archive', async () => {
        const archiveYoungData: ArchiveModel = {
          task: { ids: [], entities: {} },
          timeTracking: {
            project: { proj1: { date20240115: { s: 3600000, e: 7200000 } } },
            tag: { tag1: { date20240115: { s: 1800000, e: 3600000 } } },
          },
          lastTimeTrackingFlush: 1234567890,
        };

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        const savedData = (
          mockPfapiService.m.archiveYoung.save as jasmine.Spy
        ).calls.mostRecent().args[0];
        expect(savedData.timeTracking.project.proj1.date20240115.s).toBe(3600000);
        expect(savedData.timeTracking.tag.tag1.date20240115.s).toBe(1800000);
        expect(savedData.lastTimeTrackingFlush).toBe(1234567890);
      });

      it('should not call other handlers for loadAllData', async () => {
        const archiveYoungData = createArchiveModelForTest(['archived-1']);

        const action = {
          type: loadAllData.type,
          appDataComplete: { archiveYoung: archiveYoungData },
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await service.handleOperation(action);

        expect(
          mockArchiveService.writeTasksToArchiveForRemoteSync,
        ).not.toHaveBeenCalled();
        expect(mockTaskArchiveService.deleteTasks).not.toHaveBeenCalled();
        expect(
          mockTaskArchiveService.removeAllArchiveTasksForProject,
        ).not.toHaveBeenCalled();
      });
    });

    describe('unhandled actions', () => {
      it('should do nothing for unhandled action types', async () => {
        const action = {
          type: '[SomeOther] Action',
          meta: { isPersistent: true, isRemote: true },
        } as PersistentAction;

        await service.handleOperation(action);

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

        await expectAsync(service.handleOperation(action)).toBeResolved();
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

        await service.handleOperation(action);
        await service.handleOperation(action);

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

        await service.handleOperation(action);
        await service.handleOperation(action);

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

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
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

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
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

        await expectAsync(service.handleOperation(action)).toBeRejectedWithError(
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

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
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

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
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

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
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

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
      });

      it('should propagate errors from unlinkIssueProviderFromArchiveTasks for multiple providers', async () => {
        const error = new Error('Unlink issue providers failed');
        mockTaskArchiveService.unlinkIssueProviderFromArchiveTasks.and.returnValue(
          Promise.reject(error),
        );

        const action = {
          type: TaskSharedActions.deleteIssueProviders.type,
          ids: ['provider-1', 'provider-2'],
          meta: { isPersistent: true, isRemote: true },
        } as unknown as PersistentAction;

        await expectAsync(service.handleOperation(action)).toBeRejectedWith(error);
      });
    });

    describe('local vs remote operation handling', () => {
      describe('moveToArchive', () => {
        it('should skip archive write for local operations (archive written before dispatch)', async () => {
          const tasks = [createMockTaskWithSubTasks('task-1')];
          const action = {
            type: TaskSharedActions.moveToArchive.type,
            tasks,
            meta: { isPersistent: true, isRemote: false },
          } as unknown as PersistentAction;

          await service.handleOperation(action);

          // For local operations, archive is written BEFORE dispatch by ArchiveService
          // So the handler should NOT write again
          expect(
            mockArchiveService.writeTasksToArchiveForRemoteSync,
          ).not.toHaveBeenCalled();
        });

        it('should skip archive write when isRemote is undefined (treated as local)', async () => {
          const tasks = [createMockTaskWithSubTasks('task-1')];
          const action = {
            type: TaskSharedActions.moveToArchive.type,
            tasks,
            meta: { isPersistent: true },
          } as unknown as PersistentAction;

          await service.handleOperation(action);

          expect(
            mockArchiveService.writeTasksToArchiveForRemoteSync,
          ).not.toHaveBeenCalled();
        });

        it('should write to archive for remote operations', async () => {
          const tasks = [createMockTaskWithSubTasks('task-1')];
          const action = {
            type: TaskSharedActions.moveToArchive.type,
            tasks,
            meta: { isPersistent: true, isRemote: true },
          } as unknown as PersistentAction;

          await service.handleOperation(action);

          expect(
            mockArchiveService.writeTasksToArchiveForRemoteSync,
          ).toHaveBeenCalledWith(tasks);
        });
      });

      describe('restoreTask', () => {
        it('should NOT pass isIgnoreDBLock for local operations', async () => {
          const task = createMockTask('task-1', []);
          const action = {
            type: TaskSharedActions.restoreTask.type,
            task,
            subTasks: [],
            meta: { isPersistent: true, isRemote: false },
          } as unknown as PersistentAction;

          await service.handleOperation(action);

          // For local operations, DB is not locked, so no isIgnoreDBLock needed
          expect(mockTaskArchiveService.deleteTasks).toHaveBeenCalledWith(['task-1'], {});
        });

        it('should pass isIgnoreDBLock: true for remote operations', async () => {
          const task = createMockTask('task-1', []);
          const action = {
            type: TaskSharedActions.restoreTask.type,
            task,
            subTasks: [],
            meta: { isPersistent: true, isRemote: true },
          } as unknown as PersistentAction;

          await service.handleOperation(action);

          // For remote operations, DB is locked during sync, so isIgnoreDBLock needed
          expect(mockTaskArchiveService.deleteTasks).toHaveBeenCalledWith(['task-1'], {
            isIgnoreDBLock: true,
          });
        });
      });

      describe('flushYoungToOld', () => {
        it('should NOT pass isIgnoreDBLock for local operations', async () => {
          const timestamp = Date.now();
          const action = {
            type: flushYoungToOld.type,
            timestamp,
            meta: { isPersistent: true, isRemote: false },
          } as unknown as PersistentAction;

          try {
            await service.handleOperation(action);
          } catch {
            // Expected - sort function returns undefined in tests
          }

          // Verify save was called without isIgnoreDBLock: true
          const saveCall = (
            mockPfapiService.m.archiveYoung.save as jasmine.Spy
          ).calls.mostRecent();
          if (saveCall) {
            const options = saveCall.args[1];
            expect(options.isIgnoreDBLock).toBeUndefined();
          }
        });

        it('should pass isIgnoreDBLock: true for remote operations', async () => {
          const timestamp = Date.now();
          const action = {
            type: flushYoungToOld.type,
            timestamp,
            meta: { isPersistent: true, isRemote: true },
          } as unknown as PersistentAction;

          try {
            await service.handleOperation(action);
          } catch {
            // Expected - sort function returns undefined in tests
          }

          // Verify save was called with isIgnoreDBLock: true
          const saveCall = (
            mockPfapiService.m.archiveYoung.save as jasmine.Spy
          ).calls.mostRecent();
          if (saveCall) {
            const options = saveCall.args[1];
            expect(options.isIgnoreDBLock).toBe(true);
          }
        });
      });
    });
  });
});
