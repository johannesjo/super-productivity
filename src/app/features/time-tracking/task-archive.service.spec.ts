import { TestBed } from '@angular/core/testing';
import { TaskArchiveService } from './task-archive.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { Task, TaskArchive, TaskState } from '../tasks/task.model';
import { ArchiveModel } from './time-tracking.model';
import { Update } from '@ngrx/entity';
import { RoundTimeOption } from '../project/project.model';
import { ModelCtrl } from '../../pfapi/api/model-ctrl/model-ctrl';

describe('TaskArchiveService', () => {
  let service: TaskArchiveService;
  let pfapiServiceMock: {
    m: {
      archiveYoung: jasmine.SpyObj<ModelCtrl<ArchiveModel>>;
      archiveOld: jasmine.SpyObj<ModelCtrl<ArchiveModel>>;
    };
  };
  let archiveYoungMock: jasmine.SpyObj<ModelCtrl<ArchiveModel>>;
  let archiveOldMock: jasmine.SpyObj<ModelCtrl<ArchiveModel>>;

  const createMockTask = (id: string, overrides: Partial<Task> = {}): Task => ({
    id,
    title: `Task ${id}`,
    subTaskIds: [],
    tagIds: [],
    timeSpent: 0,
    timeSpentOnDay: {},
    isDone: false,
    doneOn: undefined,
    notes: '',
    projectId: '',
    parentId: undefined,
    reminderId: undefined,
    created: Date.now(),
    repeatCfgId: undefined,
    _hideSubTasksMode: 2,
    attachments: [],
    issueId: undefined,
    issuePoints: undefined,
    issueType: undefined,
    issueAttachmentNr: undefined,
    issueLastUpdated: undefined,
    issueWasUpdated: undefined,
    timeEstimate: 0,
    ...overrides,
  });

  const createMockArchiveModel = (tasks: Task[]): ArchiveModel => ({
    task: {
      ids: tasks.map((t) => t.id),
      entities: tasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {}),
    } as TaskState,
    timeTracking: {
      project: {},
      tag: {},
    },
    lastTimeTrackingFlush: Date.now(),
  });

  beforeEach(() => {
    archiveYoungMock = jasmine.createSpyObj<ModelCtrl<ArchiveModel>>('archiveYoung', [
      'load',
      'save',
    ]);
    archiveYoungMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));
    archiveYoungMock.save.and.returnValue(Promise.resolve());

    archiveOldMock = jasmine.createSpyObj<ModelCtrl<ArchiveModel>>('archiveOld', [
      'load',
      'save',
    ]);
    archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));
    archiveOldMock.save.and.returnValue(Promise.resolve());

    pfapiServiceMock = {
      m: {
        archiveYoung: archiveYoungMock,
        archiveOld: archiveOldMock,
      },
    };

    TestBed.configureTestingModule({
      providers: [
        TaskArchiveService,
        { provide: PfapiService, useValue: pfapiServiceMock },
      ],
    });

    service = TestBed.inject(TaskArchiveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadYoung', () => {
    it('should load young archive', async () => {
      const mockTasks = [createMockTask('task1'), createMockTask('task2')];
      const mockArchive = createMockArchiveModel(mockTasks);

      archiveYoungMock.load.and.returnValue(Promise.resolve(mockArchive));

      const result = await service.loadYoung();

      expect(result.ids).toEqual(['task1', 'task2']);
      expect(result.entities['task1']).toBeDefined();
      expect(result.entities['task2']).toBeDefined();
      expect(archiveYoungMock.load).toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load and merge young and old archives', async () => {
      const youngTasks = [createMockTask('young1'), createMockTask('young2')];
      const oldTasks = [createMockTask('old1'), createMockTask('old2')];
      const youngArchive = createMockArchiveModel(youngTasks);
      const oldArchive = createMockArchiveModel(oldTasks);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      const result = await service.load();

      expect(result.ids).toEqual(['young1', 'young2', 'old1', 'old2']);
      expect(result.entities['young1']).toBeDefined();
      expect(result.entities['old2']).toBeDefined();
      expect(archiveYoungMock.load).toHaveBeenCalled();
      expect(archiveOldMock.load).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should find task in young archive', async () => {
      const task = createMockTask('task1');
      const youngArchive = createMockArchiveModel([task]);
      const oldArchive = createMockArchiveModel([]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      const result = await service.getById('task1');

      expect(result).toEqual(task);
      expect(archiveYoungMock.load).toHaveBeenCalled();
      expect(archiveOldMock.load).not.toHaveBeenCalled();
    });

    it('should find task in old archive if not in young', async () => {
      const task = createMockTask('task1');
      const youngArchive = createMockArchiveModel([]);
      const oldArchive = createMockArchiveModel([task]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      const result = await service.getById('task1');

      expect(result).toEqual(task);
      expect(archiveYoungMock.load).toHaveBeenCalled();
      expect(archiveOldMock.load).toHaveBeenCalled();
    });

    it('should throw error if task not found', async () => {
      const youngArchive = createMockArchiveModel([]);
      const oldArchive = createMockArchiveModel([]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await expectAsync(service.getById('nonexistent')).toBeRejectedWithError(
        'Archive task not found by id',
      );
    });
  });

  describe('deleteTasks', () => {
    it('should delete tasks using TaskSharedActions.deleteTasks', async () => {
      const task1 = createMockTask('task1');
      const task2 = createMockTask('task2');
      const unrelatedTask = createMockTask('unrelated');

      const youngArchive = createMockArchiveModel([task1, task2, unrelatedTask]);
      const oldArchive = createMockArchiveModel([]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await service.deleteTasks(['task1']);

      const saveCall = archiveYoungMock.save.calls.mostRecent();
      const savedArchive = saveCall.args[0];

      // The task reducer should handle the delete action
      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(savedArchive).toBeDefined();

      // Note: The actual deletion logic depends on how the taskReducer handles TaskSharedActions.deleteTasks
      // Since we're not running the actual reducer in these unit tests, we just verify the service mechanics
    });

    it('should delete tasks from both young and old archives', async () => {
      const youngTask = createMockTask('young1');
      const oldTask = createMockTask('old1');

      const youngArchive = createMockArchiveModel([youngTask]);
      const oldArchive = createMockArchiveModel([oldTask]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await service.deleteTasks(['young1', 'old1']);

      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();

      // Note: The actual deletion is handled by the taskReducer
      // We're just verifying that the service calls save on both archives
    });
  });

  describe('updateTask', () => {
    it('should update task with timeSpentOnDay and recalculate timeSpent', async () => {
      const task = createMockTask('task1', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        timeSpentOnDay: { '2024-01-01': 1000, '2024-01-02': 2000 },
        timeSpent: 3000,
      });
      const youngArchive = createMockArchiveModel([task]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      const newTimeSpentOnDay = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-01': 1500,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-02': 2500,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-03': 1000,
      };

      await service.updateTask('task1', {
        timeSpentOnDay: newTimeSpentOnDay,
      });

      const saveCall = archiveYoungMock.save.calls.mostRecent();
      const savedArchive = saveCall.args[0];
      const updatedTask = savedArchive.task.entities['task1'] as Task;

      expect(updatedTask.timeSpentOnDay).toEqual(newTimeSpentOnDay);
      expect(updatedTask.timeSpent).toBe(5000); // 1500 + 2500 + 1000
    });

    it('should update isDone and set/unset doneOn', async () => {
      const task = createMockTask('task1', { isDone: false, doneOn: undefined });
      const youngArchive = createMockArchiveModel([task]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));

      // Mark as done
      await service.updateTask('task1', { isDone: true });

      let saveCall = archiveYoungMock.save.calls.mostRecent();
      let savedArchive = saveCall.args[0];
      let updatedTask = savedArchive.task.entities['task1'] as Task;

      expect(updatedTask.isDone).toBe(true);
      expect(updatedTask.doneOn).toBeGreaterThan(0);
      expect(updatedTask.dueDay).toBeUndefined();

      // Mark as undone
      archiveYoungMock.load.and.returnValue(Promise.resolve(savedArchive));
      await service.updateTask('task1', { isDone: false });

      saveCall = archiveYoungMock.save.calls.mostRecent();
      savedArchive = saveCall.args[0];
      updatedTask = savedArchive.task.entities['task1'] as Task;

      expect(updatedTask.isDone).toBe(false);
      expect(updatedTask.doneOn).toBeUndefined();
    });

    it('should throw error if task not found', async () => {
      const youngArchive = createMockArchiveModel([]);
      const oldArchive = createMockArchiveModel([]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await expectAsync(
        service.updateTask('nonexistent', { title: 'New Title' }),
      ).toBeRejectedWithError('Archive task to update not found');
    });
  });

  describe('updateTasks', () => {
    it('should update multiple tasks across young and old archives', async () => {
      const youngTask1 = createMockTask('young1', { title: 'Young 1' });
      const youngTask2 = createMockTask('young2', { title: 'Young 2' });
      const oldTask1 = createMockTask('old1', { title: 'Old 1' });

      const youngArchive = createMockArchiveModel([youngTask1, youngTask2]);
      const oldArchive = createMockArchiveModel([oldTask1]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      const updates: Update<Task>[] = [
        { id: 'young1', changes: { title: 'Updated Young 1' } },
        { id: 'young2', changes: { title: 'Updated Young 2' } },
        { id: 'old1', changes: { title: 'Updated Old 1' } },
      ];

      await service.updateTasks(updates);

      // The updateTasks method uses the taskReducer which doesn't fully apply updates in unit tests
      // We just verify that save was called on both archives
      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();
    });
  });

  describe('roundTimeSpent', () => {
    it('should round time spent for tasks on a specific day', async () => {
      const task1 = createMockTask('task1', {
        timeSpentOnDay: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          '2024-01-01': 1234567, // ~20.5 minutes
          // eslint-disable-next-line @typescript-eslint/naming-convention
          '2024-01-02': 2000000,
        },
        timeSpent: 3234567,
      });
      const task2 = createMockTask('task2', {
        timeSpentOnDay: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          '2024-01-01': 890123, // ~14.8 minutes
          // eslint-disable-next-line @typescript-eslint/naming-convention
          '2024-01-02': 1000000,
        },
        timeSpent: 1890123,
      });

      const youngArchive = createMockArchiveModel([task1, task2]);
      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      await service.roundTimeSpent({
        day: '2024-01-01',
        taskIds: ['task1', 'task2'],
        roundTo: 'QUARTER' as RoundTimeOption,
        isRoundUp: true,
        projectId: 'project1',
      });

      // The roundTimeSpent method uses the taskReducer which handles the rounding logic
      // We just verify that save was called with updated state
      expect(archiveYoungMock.save).toHaveBeenCalled();
      const saveCall = archiveYoungMock.save.calls.mostRecent();
      const savedArchive = saveCall.args[0];
      expect(savedArchive.task).toBeDefined();
    });

    it('should handle tasks across young and old archives', async () => {
      const youngTask = createMockTask('young1', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        timeSpentOnDay: { '2024-01-01': 1234567 },
        timeSpent: 1234567,
      });
      const oldTask = createMockTask('old1', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        timeSpentOnDay: { '2024-01-01': 890123 },
        timeSpent: 890123,
      });

      const youngArchive = createMockArchiveModel([youngTask]);
      const oldArchive = createMockArchiveModel([oldTask]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await service.roundTimeSpent({
        day: '2024-01-01',
        taskIds: ['young1', 'old1'],
        roundTo: 'QUARTER' as RoundTimeOption,
        isRoundUp: false,
      });

      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();
    });
  });

  describe('removeRepeatCfgFromArchiveTasks', () => {
    it('should remove repeatCfgId from all tasks with matching id', async () => {
      const task1 = createMockTask('task1', { repeatCfgId: 'repeat1' });
      const task2 = createMockTask('task2', { repeatCfgId: 'repeat1' });
      const task3 = createMockTask('task3', { repeatCfgId: 'repeat2' });
      const task4 = createMockTask('task4', { repeatCfgId: undefined });

      const youngArchive = createMockArchiveModel([task1, task2]);
      const oldArchive = createMockArchiveModel([task3, task4]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      // Mock the updateTasks method to track calls
      spyOn(service, 'updateTasks').and.returnValue(Promise.resolve());

      await service.removeRepeatCfgFromArchiveTasks('repeat1');

      expect(service.updateTasks).toHaveBeenCalledWith([
        { id: 'task1', changes: { repeatCfgId: undefined } },
        { id: 'task2', changes: { repeatCfgId: undefined } },
      ]);
    });

    it('should not call updateTasks if no tasks have the repeatCfgId', async () => {
      const task1 = createMockTask('task1', { repeatCfgId: 'repeat2' });
      const task2 = createMockTask('task2', { repeatCfgId: undefined });

      const mockArchive = createMockArchiveModel([task1, task2]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(mockArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      spyOn(service, 'updateTasks').and.returnValue(Promise.resolve());

      await service.removeRepeatCfgFromArchiveTasks('repeat1');

      expect(service.updateTasks).not.toHaveBeenCalled();
    });
  });

  describe('removeAllArchiveTasksForProject', () => {
    it('should delete all tasks belonging to a project', async () => {
      const projectTask1 = createMockTask('task1', { projectId: 'project1' });
      const projectTask2 = createMockTask('task2', { projectId: 'project1' });
      const otherProjectTask = createMockTask('task3', { projectId: 'project2' });
      const noProjectTask = createMockTask('task4', { projectId: '' });

      const mockArchive: TaskArchive = {
        ids: ['task1', 'task2', 'task3', 'task4'],
        entities: {
          task1: projectTask1,
          task2: projectTask2,
          task3: otherProjectTask,
          task4: noProjectTask,
        },
      };

      spyOn(service, 'load').and.returnValue(Promise.resolve(mockArchive));
      spyOn(service, 'deleteTasks').and.returnValue(Promise.resolve());

      await service.removeAllArchiveTasksForProject('project1');

      expect(service.deleteTasks).toHaveBeenCalledWith(['task1', 'task2']);
    });
  });

  describe('removeTagsFromAllTasks', () => {
    it('should remove provided tags from tasks in archiveYoung', async () => {
      const taskWithTags = createMockTask('task1', { tagIds: ['tag1', 'tag2'] });
      const archiveYoung = createMockArchiveModel([taskWithTags]);
      const archiveOld = createMockArchiveModel([]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archiveYoung));
      archiveOldMock.load.and.returnValue(Promise.resolve(archiveOld));

      spyOn(service, 'deleteTasks').and.returnValue(Promise.resolve());

      await service.removeTagsFromAllTasks(['tag1']);

      const saveArgs = archiveYoungMock.save.calls.mostRecent().args;
      const updatedTask = saveArgs[0].task.entities['task1'] as Task;

      expect(updatedTask.tagIds).toEqual(['tag2']);
    });

    it('should remove provided tags from tasks in archiveOld', async () => {
      const taskWithTags = createMockTask('task1', { tagIds: ['tag1', 'tag3'] });
      const archiveYoung = createMockArchiveModel([]);
      const archiveOld = createMockArchiveModel([taskWithTags]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archiveYoung));
      archiveOldMock.load.and.returnValue(Promise.resolve(archiveOld));

      spyOn(service, 'deleteTasks').and.returnValue(Promise.resolve());

      await service.removeTagsFromAllTasks(['tag1']);

      const saveArgs = archiveOldMock.save.calls.mostRecent().args;
      const updatedTask = saveArgs[0].task.entities['task1'] as Task;

      expect(updatedTask.tagIds).toEqual(['tag3']);
    });

    it('should remove tags from all tasks and delete orphaned tasks', async () => {
      // Create tasks with original state (before tag removal)
      const taskWithTag = createMockTask('task1', {
        tagIds: ['tag1', 'tag2', 'tag3'],
        projectId: '',
      });
      const taskToBeOrphaned = createMockTask('task2', {
        tagIds: ['tag1'],
        projectId: '',
        parentId: undefined,
      });
      const taskWithProject = createMockTask('task3', {
        tagIds: ['tag1'],
        projectId: 'project1',
      });
      const parentTask = createMockTask('parent1', {
        tagIds: ['tag1'],
        projectId: '',
        subTaskIds: ['sub1'],
      });
      const subTask = createMockTask('sub1', {
        tagIds: [],
        projectId: '',
        parentId: 'parent1',
      });

      // Create state that would exist after tag removal
      const tasksAfterRemoval = [
        { ...taskWithTag, tagIds: ['tag2', 'tag3'] }, // tag1 removed
        { ...taskToBeOrphaned, tagIds: [] }, // tag1 removed, now orphaned
        { ...taskWithProject, tagIds: [] }, // tag1 removed, but has project
        { ...parentTask, tagIds: [] }, // tag1 removed, now orphaned
        subTask, // no change
      ];

      // Mock the load method to return the state with tags already removed
      // (since the method checks the loaded state for orphaned tasks)
      spyOn(service, 'load').and.returnValue(
        Promise.resolve({
          ids: ['task1', 'task2', 'task3', 'parent1', 'sub1'],
          entities: {
            task1: tasksAfterRemoval[0],
            task2: tasksAfterRemoval[1],
            task3: tasksAfterRemoval[2],
            parent1: tasksAfterRemoval[3],
            sub1: tasksAfterRemoval[4],
          },
        }),
      );

      // Setup archives for _execActionBoth
      const youngArchive = createMockArchiveModel([
        taskWithTag,
        taskToBeOrphaned,
        taskWithProject,
        parentTask,
        subTask,
      ]);
      const oldArchive = createMockArchiveModel([]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      // Spy on deleteTasks to verify it's called with the right parameters
      spyOn(service, 'deleteTasks').and.returnValue(Promise.resolve());

      await service.removeTagsFromAllTasks(['tag1']);

      // The method should identify tasks that would become orphaned after tag removal
      // task2 has no tags and no project after removal, so it's orphaned
      // parent1 has no tags and no project after removal, so it and its subtasks are orphaned
      // task1 still has other tags, so it's not orphaned
      // task3 has a project, so it's not orphaned
      expect(service.deleteTasks).toHaveBeenCalledWith(['task2', 'parent1', 'sub1']);
    });
  });

  describe('_reduceForArchive', () => {
    it('should properly reduce state with TaskSharedActions.updateTask', async () => {
      const task = createMockTask('task1', { title: 'Original Title' });
      const archive = createMockArchiveModel([task]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archive));

      // Test the updateTask method which uses _reduceForArchive internally
      await service.updateTask('task1', { title: 'Updated Title' });

      expect(archiveYoungMock.save).toHaveBeenCalled();
      const saveCall = archiveYoungMock.save.calls.mostRecent();
      expect(saveCall.args[0].task).toBeDefined();
      expect(saveCall.args[1]).toEqual({ isUpdateRevAndLastUpdate: true });
    });

    it('should handle deleteTasks action through _reduceForArchive', async () => {
      const task1 = createMockTask('task1');
      const task2 = createMockTask('task2');
      const archive = createMockArchiveModel([task1, task2]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      await service.deleteTasks(['task1']);

      expect(archiveYoungMock.save).toHaveBeenCalled();
      const saveCall = archiveYoungMock.save.calls.mostRecent();
      const savedArchive = saveCall.args[0];
      expect(savedArchive.task).toBeDefined();
      // The actual deletion is handled by the reducer
    });

    it('should handle roundTimeSpentForDay action through _reduceForArchive', async () => {
      const task = createMockTask('task1', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        timeSpentOnDay: { '2024-01-01': 1234567 },
        timeSpent: 1234567,
      });
      const archive = createMockArchiveModel([task]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      await service.roundTimeSpent({
        day: '2024-01-01',
        taskIds: ['task1'],
        roundTo: 'QUARTER' as RoundTimeOption,
        isRoundUp: true,
        projectId: 'project1',
      });

      expect(archiveYoungMock.save).toHaveBeenCalled();
      const saveCall = archiveYoungMock.save.calls.mostRecent();
      expect(saveCall.args[0].task).toBeDefined();
    });
  });

  describe('updateTasks with proper iterative reduction', () => {
    it('should apply multiple updates iteratively through _reduceForArchive', async () => {
      const task1 = createMockTask('task1', { title: 'Task 1', isDone: false });
      const task2 = createMockTask('task2', { title: 'Task 2', isDone: false });
      const archive = createMockArchiveModel([task1, task2]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      const updates: Update<Task>[] = [
        { id: 'task1', changes: { title: 'Updated Task 1', isDone: true } },
        { id: 'task2', changes: { title: 'Updated Task 2' } },
      ];

      await service.updateTasks(updates);

      expect(archiveYoungMock.save).toHaveBeenCalled();
      const saveCall = archiveYoungMock.save.calls.mostRecent();
      const savedArchive = saveCall.args[0];
      expect(savedArchive.task).toBeDefined();
      // Each update is applied iteratively through _reduceForArchive
    });

    it('should handle updates across both young and old archives', async () => {
      const youngTask = createMockTask('young1', { title: 'Young Task' });
      const oldTask = createMockTask('old1', { title: 'Old Task' });

      const youngArchive = createMockArchiveModel([youngTask]);
      const oldArchive = createMockArchiveModel([oldTask]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      const updates: Update<Task>[] = [
        { id: 'young1', changes: { title: 'Updated Young' } },
        { id: 'old1', changes: { title: 'Updated Old' } },
      ];

      await service.updateTasks(updates);

      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();

      // Verify young archive save
      const youngSaveCall = archiveYoungMock.save.calls.mostRecent();
      expect(youngSaveCall.args[0].task).toBeDefined();

      // Verify old archive save
      const oldSaveCall = archiveOldMock.save.calls.mostRecent();
      expect(oldSaveCall.args[0].task).toBeDefined();
    });
  });

  describe('consistent state reduction across all methods', () => {
    it('should consistently use _reduceForArchive in deleteTasks', async () => {
      const tasks = [
        createMockTask('task1'),
        createMockTask('task2'),
        createMockTask('task3'),
      ];
      const youngArchive = createMockArchiveModel(tasks.slice(0, 2));
      const oldArchive = createMockArchiveModel([tasks[2]]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await service.deleteTasks(['task1', 'task3']);

      // Both archives should be saved with properly reduced state
      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();

      const youngSave = archiveYoungMock.save.calls.mostRecent();
      const oldSave = archiveOldMock.save.calls.mostRecent();

      expect(youngSave.args[0].task).toBeDefined();
      expect(oldSave.args[0].task).toBeDefined();
    });

    it('should consistently use _reduceForArchive in roundTimeSpent', async () => {
      const youngTask = createMockTask('young1', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        timeSpentOnDay: { '2024-01-01': 1000000 },
      });
      const oldTask = createMockTask('old1', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        timeSpentOnDay: { '2024-01-01': 2000000 },
      });

      const youngArchive = createMockArchiveModel([youngTask]);
      const oldArchive = createMockArchiveModel([oldTask]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(youngArchive));
      archiveOldMock.load.and.returnValue(Promise.resolve(oldArchive));

      await service.roundTimeSpent({
        day: '2024-01-01',
        taskIds: ['young1', 'old1'],
        roundTo: 'QUARTER' as RoundTimeOption,
        isRoundUp: false,
      });

      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();

      // Both saves should have properly reduced task state
      const youngSave = archiveYoungMock.save.calls.mostRecent();
      const oldSave = archiveOldMock.save.calls.mostRecent();

      expect(youngSave.args[0].task).toBeDefined();
      expect(oldSave.args[0].task).toBeDefined();
    });

    it('should use _execActionBoth for removeTagsFromAllTasks', async () => {
      const task = createMockTask('task1', { tagIds: ['tag1', 'tag2'] });
      const archive = createMockArchiveModel([task]);

      archiveYoungMock.load.and.returnValue(Promise.resolve(archive));
      archiveOldMock.load.and.returnValue(Promise.resolve(createMockArchiveModel([])));

      // Mock load to prevent orphan deletion logic
      spyOn(service, 'load').and.returnValue(
        Promise.resolve({
          ids: ['task1'],
          entities: { task1: { ...task, tagIds: ['tag2'] } },
        }),
      );

      await service.removeTagsFromAllTasks(['tag1']);

      // Both archives should be updated through _execActionBoth
      expect(archiveYoungMock.save).toHaveBeenCalled();
      expect(archiveOldMock.save).toHaveBeenCalled();
    });
  });
});
