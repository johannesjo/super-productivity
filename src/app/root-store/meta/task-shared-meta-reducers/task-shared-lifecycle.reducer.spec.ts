/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { taskSharedLifecycleMetaReducer } from './task-shared-lifecycle.reducer';
import { TaskSharedActions } from '../task-shared.actions';
import { RootState } from '../../root-state';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../../features/tag/store/tag.reducer';
import { Task, TaskWithSubTasks } from '../../../features/tasks/task.model';
import { Action, ActionReducer } from '@ngrx/store';
import {
  createBaseState,
  createMockProject,
  createMockTag,
  createMockTask,
  createStateWithExistingTasks,
  expectProjectUpdate,
  expectStateUpdate,
  expectTagUpdate,
  expectTagUpdates,
} from './test-utils';

describe('taskSharedLifecycleMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  // Helper to create TaskWithSubTasks from mock tasks
  const createTaskWithSubTasks = (
    taskOverrides: Partial<Task>,
    subTasks: Task[] = [],
  ): TaskWithSubTasks => ({
    ...createMockTask(taskOverrides),
    subTasks,
  });

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = taskSharedLifecycleMetaReducer(mockReducer);
    baseState = createBaseState();
  });

  describe('moveToArchive action', () => {
    // Helper to create archive action with tasks
    const createArchiveAction = (tasks: TaskWithSubTasks[]) =>
      TaskSharedActions.moveToArchive({ tasks });

    it('should remove tasks from project taskIds and backlogTaskIds', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2', 'keep-task'],
        ['task1', 'backlog-task'],
        ['task1', 'subtask1', 'keep-task'],
        ['task1', 'subtask1', 'today-task'],
      );

      const subtask1 = createMockTask({
        id: 'subtask1',
        projectId: 'project1',
        tagIds: ['tag1'],
        parentId: 'task1',
      });

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks(
          {
            id: 'task1',
            projectId: 'project1',
            tagIds: ['tag1'],
            subTaskIds: ['subtask1'],
          },
          [subtask1],
        ),
        createTaskWithSubTasks({
          id: 'task2',
          projectId: 'project1',
          tagIds: [],
        }),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
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
        mockReducer,
        testState,
      );
    });

    it('should handle empty tasks array', () => {
      const action = createArchiveAction([]);

      metaReducer(baseState, action);
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
        mockReducer,
        baseState,
      );
    });

    it('should remove tasks and subtasks from all associated tags', () => {
      const testState = createStateWithExistingTasks(
        ['parent-task', 'subtask1', 'subtask2', 'keep-task'],
        [],
        ['parent-task', 'subtask1', 'subtask2', 'keep-task'],
        ['parent-task', 'subtask1', 'keep-task'],
      );

      // Add another tag
      testState[TAG_FEATURE_NAME].entities.tag2 = createMockTag({
        id: 'tag2',
        title: 'Tag 2',
        taskIds: ['subtask2', 'keep-task'],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]) = [
        ...(testState[TAG_FEATURE_NAME].ids as string[]),
        'tag2',
      ];

      const subtask1 = createMockTask({
        id: 'subtask1',
        projectId: 'project1',
        tagIds: ['tag1'],
        parentId: 'parent-task',
      });
      const subtask2 = createMockTask({
        id: 'subtask2',
        projectId: 'project1',
        tagIds: ['tag1', 'tag2'],
        parentId: 'parent-task',
      });

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks(
          {
            id: 'parent-task',
            projectId: 'project1',
            tagIds: ['tag1'],
            subTaskIds: ['subtask1', 'subtask2'],
          },
          [subtask1, subtask2],
        ),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: ['keep-task'],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: ['keep-task'] },
            tag2: { taskIds: ['keep-task'] },
            TODAY: { taskIds: ['keep-task'] },
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle tasks without projectId', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        ['task1', 'task2'],
        ['task1'],
      );

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks({
          id: 'task1',
          projectId: undefined,
          tagIds: ['tag1'],
        }),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTagUpdates({
            tag1: { taskIds: ['task2'] },
            TODAY: { taskIds: [] },
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle mixed tasks with and without projects', () => {
      const testState = createStateWithExistingTasks(
        ['project-task'],
        [],
        ['project-task', 'orphan-task'],
        ['project-task', 'orphan-task'],
      );

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks({
          id: 'project-task',
          projectId: 'project1',
          tagIds: ['tag1'],
        }),
        createTaskWithSubTasks({
          id: 'orphan-task',
          projectId: undefined,
          tagIds: ['tag1'],
        }),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: [],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: [] },
            TODAY: { taskIds: [] },
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should always update TODAY tag even if no tasks are in it', () => {
      const testState = createStateWithExistingTasks(
        ['task1'],
        [],
        ['task1'],
        [], // No tasks in TODAY
      );

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks({
          id: 'task1',
          projectId: 'project1',
          tagIds: ['tag1'],
        }),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTagUpdates({
            tag1: { taskIds: [] },
            TODAY: { taskIds: [] }, // Should still be updated
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle archiving tasks from multiple projects', () => {
      const testState = createStateWithExistingTasks(
        ['task1'],
        [],
        ['task1', 'task2'],
        [],
      );

      // Add second project
      testState[PROJECT_FEATURE_NAME].entities.project2 = createMockProject({
        id: 'project2',
        title: 'Project 2',
        taskIds: ['task2'],
      });
      (testState[PROJECT_FEATURE_NAME].ids as string[]) = [
        ...(testState[PROJECT_FEATURE_NAME].ids as string[]),
        'project2',
      ];

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks({
          id: 'task1',
          projectId: 'project1',
          tagIds: ['tag1'],
        }),
        createTaskWithSubTasks({
          id: 'task2',
          projectId: 'project2',
          tagIds: ['tag1'],
        }),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: [],
          }),
          ...expectProjectUpdate('project2', {
            taskIds: [],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: [] },
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle tasks with deeply nested subtasks', () => {
      const testState = createStateWithExistingTasks(
        ['parent', 'sub1', 'sub2', 'sub3'],
        [],
        ['parent', 'sub1', 'sub2', 'sub3'],
        [],
      );

      const sub1 = createMockTask({
        id: 'sub1',
        projectId: 'project1',
        tagIds: ['tag1'],
        parentId: 'parent',
      });
      const sub2 = createMockTask({
        id: 'sub2',
        projectId: 'project1',
        tagIds: ['tag1'],
        parentId: 'parent',
      });
      const sub3 = createMockTask({
        id: 'sub3',
        projectId: 'project1',
        tagIds: ['tag1'],
        parentId: 'parent',
      });

      const tasksToArchive: TaskWithSubTasks[] = [
        createTaskWithSubTasks(
          {
            id: 'parent',
            projectId: 'project1',
            tagIds: ['tag1'],
            subTaskIds: ['sub1', 'sub2', 'sub3'],
          },
          [sub1, sub2, sub3],
        ),
      ];

      const action = createArchiveAction(tasksToArchive);

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', {
            taskIds: [],
          }),
          ...expectTagUpdates({
            tag1: { taskIds: [] },
          }),
        },
        action,
        mockReducer,
        testState,
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

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should handle task with subtasks', () => {
      const subTasks = [createMockTask({ id: 'subtask1' })];
      const action = createRestoreAction({ subTaskIds: ['subtask1'] }, subTasks);

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1', 'subtask1'] }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should add tasks to existing taskIds', () => {
      const testState = createStateWithExistingTasks(
        ['existing-task'],
        [],
        ['existing-task'],
      );
      const action = createRestoreAction();

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['existing-task', 'task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['existing-task', 'task1'] }),
        },
        action,
        mockReducer,
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
