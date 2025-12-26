import { TestBed } from '@angular/core/testing';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { OpType, extractActionPayload, MultiEntityPayload } from '../operation.types';
import { TestClient, resetTestUuidCounter } from './helpers/test-client.helper';
import { convertOpToAction } from '../operation-converter.util';
import { TaskSharedActions } from '../../../../root-store/meta/task-shared.actions';
import { Task, TaskWithSubTasks } from '../../../../features/tasks/task.model';
import { ArchiveService } from '../../../../features/time-tracking/archive.service';
import { ArchiveOperationHandler } from '../processing/archive-operation-handler.service';
import { TaskArchiveService } from '../../../../features/time-tracking/task-archive.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { TimeTrackingService } from '../../../../features/time-tracking/time-tracking.service';
import { flattenTasks } from '../../../../features/tasks/store/task.selectors';

/**
 * Integration tests for archive subtask sync.
 *
 * These tests verify that subtasks are preserved through the full
 * operation log round-trip:
 * 1. Action dispatch with TaskWithSubTasks[] (subTasks populated)
 * 2. Operation capture and storage
 * 3. Operation retrieval
 * 4. Action reconstruction via convertOpToAction
 * 5. Archive handler processing
 *
 * The issue being tested: When a remote client receives a moveToArchive
 * operation, the subTasks property may be undefined/empty, causing
 * subtasks to be lost during archiving.
 */
describe('Archive Subtask Sync Integration', () => {
  let storeService: OperationLogStoreService;

  /**
   * Creates a mock task with proper structure.
   */
  const createMockTask = (id: string, overrides: Partial<Task> = {}): Task =>
    ({
      id,
      title: `Task ${id}`,
      subTaskIds: [],
      tagIds: [],
      projectId: null,
      parentId: null,
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      isDone: false,
      doneOn: null,
      notes: '',
      attachments: [],
      created: Date.now(),
      ...overrides,
    }) as Task;

  /**
   * Creates a mock subtask with parentId set.
   */
  const createMockSubTask = (
    id: string,
    parentId: string,
    overrides: Partial<Task> = {},
  ): Task =>
    createMockTask(id, {
      parentId,
      ...overrides,
    });

  /**
   * Creates a TaskWithSubTasks with the subTasks property populated.
   * This simulates what NgRx selectors produce.
   */
  const createTaskWithSubTasks = (
    parentId: string,
    subTasks: Task[],
    overrides: Partial<Task> = {},
  ): TaskWithSubTasks => {
    const parent = createMockTask(parentId, {
      subTaskIds: subTasks.map((s) => s.id),
      ...overrides,
    });
    return {
      ...parent,
      subTasks,
    } as TaskWithSubTasks;
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OperationLogStoreService],
    });
    storeService = TestBed.inject(OperationLogStoreService);

    await storeService.init();
    await storeService._clearAllDataForTesting();
    resetTestUuidCounter();
  });

  describe('moveToArchive operation payload', () => {
    it('should preserve subTasks in operation payload when stored and retrieved', async () => {
      const client = new TestClient('client-test');

      // Create a parent task with 2 subtasks
      const subTask1 = createMockSubTask('sub-1', 'parent-1');
      const subTask2 = createMockSubTask('sub-2', 'parent-1');
      const parentTask = createTaskWithSubTasks('parent-1', [subTask1, subTask2], {
        isDone: true,
        doneOn: Date.now(),
      });

      // Verify the test data is set up correctly
      expect(parentTask.subTaskIds).toEqual(['sub-1', 'sub-2']);
      expect(parentTask.subTasks.length).toBe(2);
      expect(parentTask.subTasks[0].id).toBe('sub-1');
      expect(parentTask.subTasks[1].id).toBe('sub-2');

      // Create the operation payload as it would be captured by operation-log.effects.ts
      // The action payload is: { tasks: TaskWithSubTasks[] }
      const actionPayload = { tasks: [parentTask] };

      // Wrap in MultiEntityPayload format (as done by operation-log.effects.ts)
      const multiEntityPayload: MultiEntityPayload = {
        actionPayload: actionPayload as Record<string, unknown>,
        entityChanges: [],
      };

      // Create the operation
      const op = client.createOperation({
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'parent-1',
        entityIds: ['parent-1'],
        payload: multiEntityPayload,
      });

      // Store the operation
      await storeService.append(op, 'local');

      // Retrieve the operation
      const storedOps = await storeService.getOpsAfterSeq(0);
      expect(storedOps.length).toBe(1);
      const storedOp = storedOps[0].op;

      // Extract the action payload from the stored operation
      const retrievedPayload = extractActionPayload(storedOp.payload);

      // CRITICAL: Verify subtasks are still present after storage/retrieval
      expect(retrievedPayload['tasks']).toBeDefined();
      const tasks = retrievedPayload['tasks'] as TaskWithSubTasks[];
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('parent-1');
      expect(tasks[0].subTaskIds).toEqual(['sub-1', 'sub-2']);

      // THIS IS THE KEY ASSERTION - verify subTasks property is preserved
      expect(tasks[0].subTasks).toBeDefined();
      expect(tasks[0].subTasks.length).toBe(2);
      expect(tasks[0].subTasks[0].id).toBe('sub-1');
      expect(tasks[0].subTasks[1].id).toBe('sub-2');
      expect(tasks[0].subTasks[0].parentId).toBe('parent-1');
      expect(tasks[0].subTasks[1].parentId).toBe('parent-1');
    });

    it('should preserve subTasks when converting operation back to action', async () => {
      const client = new TestClient('client-test');

      // Create a parent task with subtasks
      const subTask1 = createMockSubTask('sub-1', 'parent-1', { title: 'Subtask 1' });
      const subTask2 = createMockSubTask('sub-2', 'parent-1', { title: 'Subtask 2' });
      const parentTask = createTaskWithSubTasks('parent-1', [subTask1, subTask2], {
        title: 'Parent Task',
        isDone: true,
      });

      // Create and store the operation
      const multiEntityPayload: MultiEntityPayload = {
        actionPayload: { tasks: [parentTask] } as Record<string, unknown>,
        entityChanges: [],
      };

      const op = client.createOperation({
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'parent-1',
        entityIds: ['parent-1'],
        payload: multiEntityPayload,
      });

      await storeService.append(op, 'local');

      // Retrieve and convert back to action (simulating remote sync)
      const storedOps = await storeService.getOpsAfterSeq(0);
      const storedOp = storedOps[0].op;
      const action = convertOpToAction(storedOp);

      // Verify action type
      expect(action.type).toBe(TaskSharedActions.moveToArchive.type);

      // CRITICAL: Verify subtasks are in the reconstructed action
      const actionTasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>)
        .tasks;
      expect(actionTasks).toBeDefined();
      expect(actionTasks.length).toBe(1);
      expect(actionTasks[0].subTasks).toBeDefined();
      expect(actionTasks[0].subTasks.length).toBe(2);
      expect(actionTasks[0].subTasks[0].id).toBe('sub-1');
      expect(actionTasks[0].subTasks[1].id).toBe('sub-2');
    });

    it('should handle multiple parent tasks with subtasks', async () => {
      const client = new TestClient('client-test');

      // Create two parent tasks, each with subtasks
      const parent1SubTasks = [
        createMockSubTask('p1-sub-1', 'parent-1'),
        createMockSubTask('p1-sub-2', 'parent-1'),
      ];
      const parent2SubTasks = [createMockSubTask('p2-sub-1', 'parent-2')];

      const parent1 = createTaskWithSubTasks('parent-1', parent1SubTasks);
      const parent2 = createTaskWithSubTasks('parent-2', parent2SubTasks);

      const multiEntityPayload: MultiEntityPayload = {
        actionPayload: { tasks: [parent1, parent2] } as Record<string, unknown>,
        entityChanges: [],
      };

      const op = client.createOperation({
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'parent-1',
        entityIds: ['parent-1', 'parent-2'],
        payload: multiEntityPayload,
      });

      await storeService.append(op, 'local');

      // Retrieve and convert
      const storedOps = await storeService.getOpsAfterSeq(0);
      const action = convertOpToAction(storedOps[0].op);

      const actionTasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>)
        .tasks;

      // Verify both parents and all their subtasks
      expect(actionTasks.length).toBe(2);

      expect(actionTasks[0].id).toBe('parent-1');
      expect(actionTasks[0].subTasks.length).toBe(2);

      expect(actionTasks[1].id).toBe('parent-2');
      expect(actionTasks[1].subTasks.length).toBe(1);
    });

    it('should handle parent tasks with no subtasks', async () => {
      const client = new TestClient('client-test');

      // Create a parent task without subtasks
      const parentTask = createTaskWithSubTasks('parent-1', []);

      const multiEntityPayload: MultiEntityPayload = {
        actionPayload: { tasks: [parentTask] } as Record<string, unknown>,
        entityChanges: [],
      };

      const op = client.createOperation({
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'parent-1',
        entityIds: ['parent-1'],
        payload: multiEntityPayload,
      });

      await storeService.append(op, 'local');

      // Retrieve and convert
      const storedOps = await storeService.getOpsAfterSeq(0);
      const action = convertOpToAction(storedOps[0].op);

      const actionTasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>)
        .tasks;

      expect(actionTasks.length).toBe(1);
      expect(actionTasks[0].subTasks).toEqual([]);
    });

    it('should preserve nested subtask data (time tracking, notes, etc.)', async () => {
      const client = new TestClient('client-test');

      // Create a subtask with realistic data
      const dateStr = '2024-01-15';
      const subTask = createMockSubTask('sub-1', 'parent-1', {
        title: 'Detailed Subtask',
        notes: 'Important notes',
        timeSpent: 3600000,
        timeEstimate: 7200000,
        timeSpentOnDay: { [dateStr]: 3600000 },
        isDone: true,
        doneOn: Date.now(),
      });

      const parentTask = createTaskWithSubTasks('parent-1', [subTask], {
        title: 'Parent with detailed subtask',
      });

      const multiEntityPayload: MultiEntityPayload = {
        actionPayload: { tasks: [parentTask] } as Record<string, unknown>,
        entityChanges: [],
      };

      const op = client.createOperation({
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'parent-1',
        entityIds: ['parent-1'],
        payload: multiEntityPayload,
      });

      await storeService.append(op, 'local');

      // Retrieve and convert
      const storedOps = await storeService.getOpsAfterSeq(0);
      const action = convertOpToAction(storedOps[0].op);

      const actionTasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>)
        .tasks;
      const retrievedSubTask = actionTasks[0].subTasks[0];

      // Verify all subtask data is preserved
      expect(retrievedSubTask.id).toBe('sub-1');
      expect(retrievedSubTask.parentId).toBe('parent-1');
      expect(retrievedSubTask.title).toBe('Detailed Subtask');
      expect(retrievedSubTask.notes).toBe('Important notes');
      expect(retrievedSubTask.timeSpent).toBe(3600000);
      expect(retrievedSubTask.timeEstimate).toBe(7200000);
      expect(retrievedSubTask.timeSpentOnDay[dateStr]).toBe(3600000);
      expect(retrievedSubTask.isDone).toBe(true);
    });

    it('should allow flattenTasks to extract subtasks from reconstructed action', async () => {
      const client = new TestClient('client-test');

      // Create parent with 2 subtasks
      const subTask1 = createMockSubTask('sub-1', 'parent-1', { title: 'Sub 1' });
      const subTask2 = createMockSubTask('sub-2', 'parent-1', { title: 'Sub 2' });
      const parentTask = createTaskWithSubTasks('parent-1', [subTask1, subTask2], {
        title: 'Parent',
      });

      const multiEntityPayload: MultiEntityPayload = {
        actionPayload: { tasks: [parentTask] } as Record<string, unknown>,
        entityChanges: [],
      };

      const op = client.createOperation({
        actionType: TaskSharedActions.moveToArchive.type,
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'parent-1',
        entityIds: ['parent-1'],
        payload: multiEntityPayload,
      });

      await storeService.append(op, 'local');

      // Simulate remote sync: retrieve, convert to action
      const storedOps = await storeService.getOpsAfterSeq(0);
      const action = convertOpToAction(storedOps[0].op);
      const actionTasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>)
        .tasks;

      // This is what ArchiveService.writeTasksToArchiveForRemoteSync calls
      // flattenTasks relies on task.subTasks being populated
      const flatTasks = flattenTasks(actionTasks);

      // CRITICAL: flattenTasks should extract both parent and subtasks
      expect(flatTasks.length).toBe(3); // 1 parent + 2 subtasks
      expect(flatTasks.map((t) => t.id).sort()).toEqual(['parent-1', 'sub-1', 'sub-2']);
    });
  });
});

/**
 * Separate test suite for ArchiveOperationHandler integration.
 * This needs its own TestBed configuration with mocks.
 */
describe('Archive Subtask Sync - Handler Integration', () => {
  let storeService: OperationLogStoreService;
  let archiveHandler: ArchiveOperationHandler;
  let mockArchiveService: jasmine.SpyObj<ArchiveService>;
  let capturedTasks: TaskWithSubTasks[] | null = null;

  /**
   * Creates a mock task with proper structure.
   */
  const createMockTask = (id: string, overrides: Partial<Task> = {}): Task =>
    ({
      id,
      title: `Task ${id}`,
      subTaskIds: [],
      tagIds: [],
      projectId: null,
      parentId: null,
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      isDone: false,
      doneOn: null,
      notes: '',
      attachments: [],
      created: Date.now(),
      ...overrides,
    }) as Task;

  /**
   * Creates a mock subtask with parentId set.
   */
  const createMockSubTask = (
    id: string,
    parentId: string,
    overrides: Partial<Task> = {},
  ): Task =>
    createMockTask(id, {
      parentId,
      ...overrides,
    });

  /**
   * Creates a TaskWithSubTasks with the subTasks property populated.
   */
  const createTaskWithSubTasks = (
    parentId: string,
    subTasks: Task[],
    overrides: Partial<Task> = {},
  ): TaskWithSubTasks => {
    const parent = createMockTask(parentId, {
      subTaskIds: subTasks.map((s) => s.id),
      ...overrides,
    });
    return {
      ...parent,
      subTasks,
    } as TaskWithSubTasks;
  };

  beforeEach(async () => {
    // Create a spy that captures what tasks are passed to writeTasksToArchiveForRemoteSync
    mockArchiveService = jasmine.createSpyObj('ArchiveService', [
      'writeTasksToArchiveForRemoteSync',
    ]);
    mockArchiveService.writeTasksToArchiveForRemoteSync.and.callFake(
      async (tasks: TaskWithSubTasks[]) => {
        capturedTasks = tasks;
      },
    );

    const mockTaskArchiveService = jasmine.createSpyObj('TaskArchiveService', [
      'deleteTasks',
      'updateTask',
      'hasTask',
      'removeAllArchiveTasksForProject',
      'removeTagsFromAllTasks',
      'removeRepeatCfgFromArchiveTasks',
      'unlinkIssueProviderFromArchiveTasks',
    ]);
    mockTaskArchiveService.hasTask.and.returnValue(Promise.resolve(false));

    const mockPfapiService = jasmine.createSpyObj('PfapiService', [], {
      m: {
        archiveYoung: {
          load: jasmine.createSpy('load').and.returnValue(
            Promise.resolve({
              task: { ids: [], entities: {} },
              timeTracking: { project: {}, tag: {} },
              lastTimeTrackingFlush: 0,
            }),
          ),
          save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
        },
        archiveOld: {
          load: jasmine.createSpy('load').and.returnValue(
            Promise.resolve({
              task: { ids: [], entities: {} },
              timeTracking: { project: {}, tag: {} },
              lastTimeTrackingFlush: 0,
            }),
          ),
          save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
        },
      },
    });

    const mockTimeTrackingService = jasmine.createSpyObj('TimeTrackingService', [
      'cleanupDataEverywhereForProject',
      'cleanupArchiveDataForTag',
    ]);

    TestBed.configureTestingModule({
      providers: [
        OperationLogStoreService,
        ArchiveOperationHandler,
        { provide: ArchiveService, useValue: mockArchiveService },
        { provide: TaskArchiveService, useValue: mockTaskArchiveService },
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: TimeTrackingService, useValue: mockTimeTrackingService },
      ],
    });

    storeService = TestBed.inject(OperationLogStoreService);
    archiveHandler = TestBed.inject(ArchiveOperationHandler);

    await storeService.init();
    await storeService._clearAllDataForTesting();
    resetTestUuidCounter();
    capturedTasks = null;
  });

  it('should pass tasks with subtasks to writeTasksToArchiveForRemoteSync', async () => {
    const client = new TestClient('client-test');

    // Create parent with subtasks
    const subTask1 = createMockSubTask('sub-1', 'parent-1');
    const subTask2 = createMockSubTask('sub-2', 'parent-1');
    const parentTask = createTaskWithSubTasks('parent-1', [subTask1, subTask2]);

    const multiEntityPayload: MultiEntityPayload = {
      actionPayload: { tasks: [parentTask] } as Record<string, unknown>,
      entityChanges: [],
    };

    const op = client.createOperation({
      actionType: TaskSharedActions.moveToArchive.type,
      opType: OpType.Update,
      entityType: 'TASK',
      entityId: 'parent-1',
      entityIds: ['parent-1'],
      payload: multiEntityPayload,
    });

    await storeService.append(op, 'local');

    // Simulate remote sync: retrieve, convert to action, handle
    const storedOps = await storeService.getOpsAfterSeq(0);
    const action = convertOpToAction(storedOps[0].op);

    // Mark as remote to trigger writeTasksToArchiveForRemoteSync
    const remoteAction = {
      ...action,
      meta: { ...action.meta, isRemote: true },
    };

    await archiveHandler.handleOperation(remoteAction);

    // Verify writeTasksToArchiveForRemoteSync was called
    expect(mockArchiveService.writeTasksToArchiveForRemoteSync).toHaveBeenCalled();

    // CRITICAL: Verify the tasks passed include subtasks
    expect(capturedTasks).toBeDefined();
    expect(capturedTasks!.length).toBe(1);
    expect(capturedTasks![0].id).toBe('parent-1');
    expect(capturedTasks![0].subTasks).toBeDefined();
    expect(capturedTasks![0].subTasks.length).toBe(2);
    expect(capturedTasks![0].subTasks[0].id).toBe('sub-1');
    expect(capturedTasks![0].subTasks[1].id).toBe('sub-2');
  });
});
