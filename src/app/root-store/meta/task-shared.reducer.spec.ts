/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { taskSharedMetaReducer } from './task-shared.reducer';
import { TaskSharedActions } from './task-shared.actions';
import { RootState } from '../root-state';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { DEFAULT_TASK, Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { Action, ActionReducer } from '@ngrx/store';
import { getWorklogStr } from '../../util/get-work-log-str';
import { DEFAULT_PROJECT } from '../../features/project/project.const';
import { DEFAULT_TAG } from '../../features/tag/tag.const';

describe('taskSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  // =============================================================================
  // TEST HELPERS
  // =============================================================================

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    ...DEFAULT_TASK,
    id: 'task1',
    title: 'Test Task',
    tagIds: ['tag1'],
    projectId: 'project1',
    ...overrides,
  });

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    ...DEFAULT_PROJECT,
    id: 'project1',
    title: 'Test Project',
    isEnableBacklog: true,
    ...overrides,
  });

  const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
    ...DEFAULT_TAG,
    id: 'tag1',
    title: 'Test Tag',
    ...overrides,
  });

  const createStateWithExistingTasks = (
    projectTaskIds: string[] = [],
    projectBacklogIds: string[] = [],
    tagTaskIds: string[] = [],
    todayTaskIds: string[] = [],
  ): RootState => {
    // Collect all unique task IDs
    const allTaskIds = [
      ...new Set([
        ...projectTaskIds,
        ...projectBacklogIds,
        ...tagTaskIds,
        ...todayTaskIds,
      ]),
    ];

    // Create task entities
    const taskEntities: Record<string, Task> = {};
    const taskIds: string[] = [];

    allTaskIds.forEach((taskId) => {
      taskEntities[taskId] = createMockTask({
        id: taskId,
        tagIds: tagTaskIds.includes(taskId) ? ['tag1'] : [],
        projectId:
          projectTaskIds.includes(taskId) || projectBacklogIds.includes(taskId)
            ? 'project1'
            : undefined,
      });
      taskIds.push(taskId);
    });

    return {
      ...baseState,
      [TASK_FEATURE_NAME]: {
        ...baseState[TASK_FEATURE_NAME],
        ids: taskIds,
        entities: taskEntities,
      },
      [PROJECT_FEATURE_NAME]: {
        ...baseState[PROJECT_FEATURE_NAME],
        entities: {
          ...baseState[PROJECT_FEATURE_NAME].entities,
          project1: {
            ...baseState[PROJECT_FEATURE_NAME].entities.project1,
            taskIds: projectTaskIds,
            backlogTaskIds: projectBacklogIds,
          } as Project,
        },
      },
      [TAG_FEATURE_NAME]: {
        ...baseState[TAG_FEATURE_NAME],
        entities: {
          ...baseState[TAG_FEATURE_NAME].entities,
          tag1: {
            ...baseState[TAG_FEATURE_NAME].entities.tag1,
            taskIds: tagTaskIds,
          } as Tag,
          TODAY: {
            ...baseState[TAG_FEATURE_NAME].entities.TODAY,
            taskIds: todayTaskIds,
          } as Tag,
        },
      },
    };
  };

  const expectStateUpdate = (
    expectedState: any,
    action: Action,
    testState: RootState = baseState,
  ) => {
    metaReducer(testState, action);
    expect(mockReducer).toHaveBeenCalledWith(
      jasmine.objectContaining(expectedState),
      action,
    );
  };

  const expectProjectUpdate = (projectId: string, changes: Partial<Project>) => ({
    [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
      entities: jasmine.objectContaining({
        [projectId]: jasmine.objectContaining(changes),
      }),
    }),
  });

  const expectTagUpdate = (tagId: string, changes: Partial<Tag>) => ({
    [TAG_FEATURE_NAME]: jasmine.objectContaining({
      entities: jasmine.objectContaining({
        [tagId]: jasmine.objectContaining(changes),
      }),
    }),
  });

  const expectTagUpdates = (updates: Record<string, Partial<Tag>>) => ({
    [TAG_FEATURE_NAME]: jasmine.objectContaining({
      entities: jasmine.objectContaining(
        Object.fromEntries(
          Object.entries(updates).map(([tagId, changes]) => [
            tagId,
            jasmine.objectContaining(changes),
          ]),
        ),
      ),
    }),
  });

  // =============================================================================
  // SETUP
  // =============================================================================

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = taskSharedMetaReducer(mockReducer);

    const mockProject = createMockProject();
    const mockTag = createMockTag();

    baseState = {
      [TASK_FEATURE_NAME]: {
        ids: [],
        entities: {},
        currentTaskId: null,
        selectedTaskId: null,
        taskDetailTargetPanel: null,
        lastCurrentTaskId: null,
        isDataLoaded: false,
      },
      [TAG_FEATURE_NAME]: {
        ids: ['tag1', 'TODAY'],
        entities: {
          tag1: mockTag,
          TODAY: {
            ...mockTag,
            id: 'TODAY',
            title: 'Today',
            taskIds: [],
          },
        },
      },
      [PROJECT_FEATURE_NAME]: {
        ids: ['project1'],
        entities: { project1: mockProject },
      },
    } as any as RootState;
  });

  // =============================================================================
  // TESTS
  // =============================================================================

  describe('addTask action', () => {
    const createAddTaskAction = (
      taskOverrides: Partial<Task> = {},
      actionOverrides = {},
    ) =>
      TaskSharedActions.addTask({
        task: createMockTask(taskOverrides),
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: false,
        isAddToBacklog: false,
        ...actionOverrides,
      });

    it('should add task to project taskIds when not adding to backlog', () => {
      const action = createAddTaskAction();

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
        },
        action,
      );
    });

    it('should add task to project backlogTaskIds when adding to backlog', () => {
      const action = createAddTaskAction({}, { isAddToBacklog: true });

      expectStateUpdate(
        expectProjectUpdate('project1', { backlogTaskIds: ['task1'] }),
        action,
      );
    });

    it('should add task to Today tag when due today', () => {
      const action = createAddTaskAction({ dueDay: getWorklogStr() });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['task1'] },
          TODAY: { taskIds: ['task1'] },
        }),
        action,
      );
    });

    it('should add task to bottom when isAddToBottom is true', () => {
      const testState = createStateWithExistingTasks(
        ['existing-task'],
        [],
        ['existing-task'],
      );
      const action = createAddTaskAction({}, { isAddToBottom: true });

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['existing-task', 'task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['existing-task', 'task1'] }),
        },
        action,
        testState,
      );
    });

    it('should skip project update when task has no projectId', () => {
      const action = createAddTaskAction({ projectId: '' });

      expectStateUpdate(expectTagUpdate('tag1', { taskIds: ['task1'] }), action);
    });
  });

  describe('convertToMainTask action', () => {
    const createConvertAction = (
      taskOverrides: Partial<Task> = {},
      actionOverrides = {},
    ) =>
      TaskSharedActions.convertToMainTask({
        task: createMockTask(taskOverrides),
        parentTagIds: ['tag1'],
        isPlanForToday: false,
        ...actionOverrides,
      });

    it('should add task to project taskIds', () => {
      const action = createConvertAction();

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
        },
        action,
      );
    });

    it('should add task to Today tag when isPlanForToday is true', () => {
      const action = createConvertAction({}, { isPlanForToday: true });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['task1'] },
          TODAY: { taskIds: ['task1'] },
        }),
        action,
      );
    });

    it('should add task at the beginning of existing taskIds', () => {
      const testState = createStateWithExistingTasks(
        ['existing-task'],
        [],
        ['existing-task'],
      );
      const action = createConvertAction();

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1', 'existing-task'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1', 'existing-task'] }),
        },
        action,
        testState,
      );
    });
  });

  describe('deleteTask action', () => {
    const createDeleteAction = (taskOverrides: Partial<TaskWithSubTasks> = {}) =>
      TaskSharedActions.deleteTask({
        task: {
          ...createMockTask(),
          subTasks: [],
          ...taskOverrides,
        } as TaskWithSubTasks,
      });

    it('should remove task from project taskIds and backlogTaskIds', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'other-task'],
        ['task1', 'backlog-task'],
        ['task1', 'other-task'],
        ['task1', 'today-task'],
      );
      const action = createDeleteAction();

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: ['other-task'],
            backlogTaskIds: ['backlog-task'],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: ['other-task'] },
            TODAY: { taskIds: ['today-task'] },
          }),
        },
        action,
        testState,
      );
    });

    it('should handle task with subtasks removal from tags', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        ['task1', 'subtask1', 'other-task'],
        ['task1', 'subtask1', 'today-task'],
      );
      const action = createDeleteAction({
        projectId: '',
        subTaskIds: ['subtask1'],
        subTasks: [{ id: 'subtask1', tagIds: ['tag1'] } as Task],
      });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
          TODAY: { taskIds: ['today-task'] },
        }),
        action,
        testState,
      );
    });
  });

  describe('deleteTasks action', () => {
    it('should remove multiple task IDs from all tags', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        ['task1', 'task2', 'other-task'],
        ['task1', 'task3', 'today-task'],
      );
      const action = TaskSharedActions.deleteTasks({
        taskIds: ['task1', 'task2', 'task3'],
      });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
          TODAY: { taskIds: ['today-task'] },
        }),
        action,
        testState,
      );
    });

    it('should handle empty taskIds array', () => {
      const action = TaskSharedActions.deleteTasks({ taskIds: [] });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: [] },
          TODAY: { taskIds: [] },
        }),
        action,
      );
    });
  });

  describe('moveToArchive_ action', () => {
    const createArchiveAction = (tasks: Partial<TaskWithSubTasks>[] = []) =>
      TaskSharedActions.moveToArchive({
        tasks: tasks.map(
          (t) =>
            ({
              ...createMockTask(),
              subTasks: [],
              ...t,
            }) as TaskWithSubTasks,
        ),
      });

    it('should remove tasks from project taskIds and backlogTaskIds', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2', 'keep-task'],
        ['task1', 'backlog-task'],
        ['task1', 'subtask1', 'keep-task'],
        ['task1', 'subtask1', 'today-task'],
      );
      const action = createArchiveAction([
        {
          id: 'task1',
          subTaskIds: ['subtask1'],
          subTasks: [{ id: 'subtask1', tagIds: ['tag1'] } as Task],
        },
        { id: 'task2', projectId: 'project1' },
      ]);

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: ['keep-task'],
            backlogTaskIds: ['backlog-task'],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: ['keep-task'] },
            TODAY: { taskIds: ['today-task'] },
          }),
        },
        action,
        testState,
      );
    });

    it('should handle empty tasks array', () => {
      const action = createArchiveAction([]);

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: [],
            backlogTaskIds: [],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: [] },
            TODAY: { taskIds: [] },
          }),
        },
        action,
      );
    });
  });

  describe('restoreTask action', () => {
    const createRestoreAction = (
      taskOverrides: Partial<Task> = {},
      subTasks: Task[] = [],
    ) =>
      TaskSharedActions.restoreTask({
        task: createMockTask(taskOverrides),
        subTasks,
      });

    it('should add task to project taskIds', () => {
      const action = createRestoreAction();

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
        },
        action,
      );
    });

    it('should handle task with subtasks', () => {
      const subTasks = [createMockTask({ id: 'subtask1' })];
      const action = createRestoreAction({ subTaskIds: ['subtask1'] }, subTasks);

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1', 'subtask1'] }),
        },
        action,
      );
    });

    it('should add tasks to existing taskIds', () => {
      const testState = createStateWithExistingTasks(
        ['existing-task'],
        [],
        ['existing-task'],
      );
      const action = createRestoreAction();

      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['existing-task', 'task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['existing-task', 'task1'] }),
        },
        action,
        testState,
      );
    });
  });

  describe('scheduleTaskWithTime action', () => {
    const createScheduleAction = (
      taskOverrides: Partial<Task> = {},
      dueWithTime: number,
    ) =>
      TaskSharedActions.scheduleTaskWithTime({
        task: createMockTask(taskOverrides),
        dueWithTime,
        isMoveToBacklog: false,
      });

    it('should add task to Today tag when scheduled for today', () => {
      const action = createScheduleAction({}, Date.now());

      expectStateUpdate(expectTagUpdate('TODAY', { taskIds: ['task1'] }), action);
    });

    it('should remove task from Today tag when scheduled for different day', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1']);
      // eslint-disable-next-line no-mixed-operators
      const tomorrowTimestamp = Date.now() + 24 * 60 * 60 * 1000;
      const action = createScheduleAction({}, tomorrowTimestamp);

      expectStateUpdate(expectTagUpdate('TODAY', { taskIds: [] }), action, testState);
    });

    it('should not change state when task is already correctly scheduled', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1']);
      const action = createScheduleAction({}, Date.now());

      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalledWith(testState, action);
    });
  });

  describe('unScheduleTask action', () => {
    it('should remove task from Today tag when task is in Today', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'other-task']);
      const action = TaskSharedActions.unscheduleTask({ id: 'task1' });

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['other-task'] }),
        action,
        testState,
      );
    });

    it('should not change state when task is not in Today tag', () => {
      const action = TaskSharedActions.unscheduleTask({ id: 'task1' });

      metaReducer(baseState, action);
      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });

  describe('updateTask action', () => {
    const createUpdateTaskAction = (taskId: string, changes: Partial<Task>) =>
      TaskSharedActions.updateTask({
        task: { id: taskId, changes },
      });

    it('should update task properties without affecting tags', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        title: 'Updated Title',
        isDone: true,
      });

      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                title: 'Updated Title',
                isDone: true,
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });

    it('should add task to new tags and remove from old tags when tagIds are updated', () => {
      const testState = createStateWithExistingTasks(
        ['task1'],
        [],
        ['task1', 'other-task'],
      );

      // Add tag2 to the test state
      testState[TAG_FEATURE_NAME].entities.tag2 = createMockTag({
        id: 'tag2',
        title: 'Tag 2',
      });
      (testState[TAG_FEATURE_NAME].ids as string[]) = [
        ...(testState[TAG_FEATURE_NAME].ids as string[]),
        'tag2',
      ];

      const action = createUpdateTaskAction('task1', { tagIds: ['tag2'] });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
          tag2: { taskIds: ['task1'] },
        }),
        action,
        testState,
      );
    });

    it('should handle adding multiple new tags', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);

      // Add additional tags
      testState[TAG_FEATURE_NAME].entities.tag2 = createMockTag({
        id: 'tag2',
        title: 'Tag 2',
      });
      testState[TAG_FEATURE_NAME].entities.tag3 = createMockTag({
        id: 'tag3',
        title: 'Tag 3',
      });
      (testState[TAG_FEATURE_NAME].ids as string[]) = [
        ...(testState[TAG_FEATURE_NAME].ids as string[]),
        'tag2',
        'tag3',
      ];

      const action = createUpdateTaskAction('task1', {
        tagIds: ['tag1', 'tag2', 'tag3'],
      });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['task1'] },
          tag2: { taskIds: ['task1'] },
          tag3: { taskIds: ['task1'] },
        }),
        action,
        testState,
      );
    });

    it('should handle removing all tags', () => {
      const testState = createStateWithExistingTasks(
        ['task1'],
        [],
        ['task1', 'other-task'],
      );
      const action = createUpdateTaskAction('task1', { tagIds: [] });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
        }),
        action,
        testState,
      );
    });

    it('should handle no tag changes when tagIds are the same', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        title: 'Updated Title',
        tagIds: ['tag1'],
      });

      expectStateUpdate(
        {
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                title: 'Updated Title',
                tagIds: ['tag1'],
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });

    it('should handle updating non-existent task gracefully', () => {
      const testState = createStateWithExistingTasks([], [], []);
      const action = createUpdateTaskAction('non-existent', { title: 'Updated' });

      expectStateUpdate(testState, action, testState);
    });

    it('should update both task properties and tags in one action', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);

      // Add tag2
      testState[TAG_FEATURE_NAME].entities.tag2 = createMockTag({
        id: 'tag2',
        title: 'Tag 2',
      });
      (testState[TAG_FEATURE_NAME].ids as string[]) = [
        ...(testState[TAG_FEATURE_NAME].ids as string[]),
        'tag2',
      ];

      const action = createUpdateTaskAction('task1', {
        title: 'Updated Title',
        isDone: true,
        tagIds: ['tag2'],
      });

      expectStateUpdate(
        {
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: [],
              }),
              tag2: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                title: 'Updated Title',
                isDone: true,
                tagIds: ['tag2'],
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });
  });

  describe('moveToOtherProject action', () => {
    const createMoveToOtherProjectAction = (
      task: TaskWithSubTasks,
      targetProjectId: string,
    ) =>
      TaskSharedActions.moveToOtherProject({
        task,
        targetProjectId,
      });

    it('should move task from one project to another', () => {
      const testState = createStateWithExistingTasks(['task1'], [], []);

      // Add target project
      testState[PROJECT_FEATURE_NAME].entities.project2 = createMockProject({
        id: 'project2',
        title: 'Target Project',
      });
      (testState[PROJECT_FEATURE_NAME].ids as string[]) = [
        ...(testState[PROJECT_FEATURE_NAME].ids as string[]),
        'project2',
      ];

      const task: TaskWithSubTasks = {
        ...createMockTask({ id: 'task1', projectId: 'project1' }),
        subTasks: [],
        subTaskIds: [],
      };

      const action = createMoveToOtherProjectAction(task, 'project2');

      expectStateUpdate(
        {
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: [],
              }),
              project2: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                projectId: 'project2',
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });

    it('should move task with subtasks to another project', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'subtask1', 'subtask2'],
        [],
        [],
      );

      // Add target project
      testState[PROJECT_FEATURE_NAME].entities.project2 = createMockProject({
        id: 'project2',
        title: 'Target Project',
      });
      (testState[PROJECT_FEATURE_NAME].ids as string[]) = [
        ...(testState[PROJECT_FEATURE_NAME].ids as string[]),
        'project2',
      ];

      const task: TaskWithSubTasks = {
        ...createMockTask({ id: 'task1', projectId: 'project1' }),
        subTasks: [
          createMockTask({ id: 'subtask1', projectId: 'project1' }),
          createMockTask({ id: 'subtask2', projectId: 'project1' }),
        ],
        subTaskIds: ['subtask1', 'subtask2'],
      };

      const action = createMoveToOtherProjectAction(task, 'project2');

      expectStateUpdate(
        {
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: [],
              }),
              project2: jasmine.objectContaining({
                taskIds: ['task1', 'subtask1', 'subtask2'],
              }),
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                projectId: 'project2',
              }),
              subtask1: jasmine.objectContaining({
                projectId: 'project2',
              }),
              subtask2: jasmine.objectContaining({
                projectId: 'project2',
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });

    it('should handle moving task from backlog', () => {
      const testState = createStateWithExistingTasks([], ['task1'], []);

      // Add target project
      testState[PROJECT_FEATURE_NAME].entities.project2 = createMockProject({
        id: 'project2',
        title: 'Target Project',
      });
      (testState[PROJECT_FEATURE_NAME].ids as string[]) = [
        ...(testState[PROJECT_FEATURE_NAME].ids as string[]),
        'project2',
      ];

      const task: TaskWithSubTasks = {
        ...createMockTask({ id: 'task1', projectId: 'project1' }),
        subTasks: [],
        subTaskIds: [],
      };

      const action = createMoveToOtherProjectAction(task, 'project2');

      expectStateUpdate(
        {
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                backlogTaskIds: [],
              }),
              project2: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });

    it('should handle moving task when source project does not exist', () => {
      const testState = createStateWithExistingTasks([], [], []);

      // Add target project
      testState[PROJECT_FEATURE_NAME].entities.project2 = createMockProject({
        id: 'project2',
        title: 'Target Project',
      });
      (testState[PROJECT_FEATURE_NAME].ids as string[]) = [
        ...(testState[PROJECT_FEATURE_NAME].ids as string[]),
        'project2',
      ];

      // Create task without project
      testState[TASK_FEATURE_NAME].entities.task1 = createMockTask({
        id: 'task1',
        projectId: undefined,
      });
      (testState[TASK_FEATURE_NAME].ids as string[]) = ['task1'];

      const task: TaskWithSubTasks = {
        ...createMockTask({ id: 'task1', projectId: undefined }),
        subTasks: [],
        subTaskIds: [],
      };

      const action = createMoveToOtherProjectAction(task, 'project2');

      expectStateUpdate(
        {
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project2: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                projectId: 'project2',
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });

    it('should handle moving task when target project does not exist', () => {
      const testState = createStateWithExistingTasks(['task1'], [], []);

      const task: TaskWithSubTasks = {
        ...createMockTask({ id: 'task1', projectId: 'project1' }),
        subTasks: [],
        subTaskIds: [],
      };

      const action = createMoveToOtherProjectAction(task, 'non-existent-project');

      expectStateUpdate(
        {
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: [],
              }),
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                projectId: 'non-existent-project',
              }),
            }),
          }),
        },
        action,
        testState,
      );
    });
  });

  describe('deleteProject action', () => {
    it('should remove all project tasks from all tags', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        ['task1', 'task2', 'keep-task'],
        ['task1', 'task3', 'keep-task'],
      );
      const action = TaskSharedActions.deleteProject({
        project: createMockProject(),
        allTaskIds: ['task1', 'task2', 'task3'],
      });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['keep-task'] },
          TODAY: { taskIds: ['keep-task'] },
        }),
        action,
        testState,
      );
    });

    it('should handle empty project task lists', () => {
      const action = TaskSharedActions.deleteProject({
        project: createMockProject(),
        allTaskIds: [],
      });

      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: [] },
          TODAY: { taskIds: [] },
        }),
        action,
      );
    });
  });

  describe('planTasksForToday action', () => {
    it('should add new tasks to the top of Today tag', () => {
      const testState = createStateWithExistingTasks([], [], [], ['existing-task']);
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'task2', 'existing-task'] }),
        action,
        testState,
      );
    });

    it('should not add tasks that are already in Today tag', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['task1', 'existing-task'],
      );
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task2', 'task1', 'existing-task'] }),
        action,
        testState,
      );
    });

    it('should handle parentTaskMap filtering', () => {
      const testState = createStateWithExistingTasks([], [], [], ['parent-task']);
      const action = TaskSharedActions.planTasksForToday({
        taskIds: ['subtask1', 'task2'],
        parentTaskMap: { subtask1: 'parent-task' },
      });

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task2', 'parent-task'] }),
        action,
        testState,
      );
    });
  });

  describe('removeTasksFromTodayTag action', () => {
    it('should remove specified tasks from Today tag', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        [],
        ['task1', 'task2', 'keep-task'],
      );
      const action = TaskSharedActions.removeTasksFromTodayTag({
        taskIds: ['task1', 'task2'],
      });

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['keep-task'] }),
        action,
        testState,
      );
    });

    it('should handle empty taskIds array', () => {
      const testState = createStateWithExistingTasks([], [], [], ['task1', 'task2']);
      const action = TaskSharedActions.removeTasksFromTodayTag({ taskIds: [] });

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'task2'] }),
        action,
        testState,
      );
    });
  });

  describe('other actions', () => {
    it('should pass through other actions to the reducer', () => {
      const action = { type: 'SOME_OTHER_ACTION' };
      metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });
});
