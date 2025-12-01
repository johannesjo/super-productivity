/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { taskSharedCrudMetaReducer } from './task-shared-crud.reducer';
import { TaskSharedActions } from '../task-shared.actions';
import { RootState } from '../../root-state';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { Task, TaskWithSubTasks } from '../../../features/tasks/task.model';
import { Tag } from '../../../features/tag/tag.model';
import { Project } from '../../../features/project/project.model';
import { WorkContextType } from '../../../features/work-context/work-context.model';
import { Action, ActionReducer } from '@ngrx/store';
import { getDbDateStr } from '../../../util/get-db-date-str';
import {
  createBaseState,
  createMockTag,
  createMockTask,
  createStateWithExistingTasks,
  expectProjectUpdate,
  expectStateUpdate,
  expectTagUpdate,
  expectTagUpdates,
  expectTaskEntityExists,
  expectTaskEntityNotExists,
  expectTaskUpdate,
} from './test-utils';

describe('taskSharedCrudMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = taskSharedCrudMetaReducer(mockReducer);
    baseState = createBaseState();
  });

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

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('task1'),
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should create task entity with correct properties', () => {
      const taskData = {
        id: 'task1',
        title: 'Test Task with Time',
        timeSpentOnDay: { '2023-12-06': 3600000 }, // 1 hour
        projectId: 'project1',
        tagIds: ['tag1'],
      };
      const action = createAddTaskAction(taskData);

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskUpdate('task1', {
            id: 'task1',
            title: 'Test Task with Time',
            timeSpent: 3600000, // Should be calculated from timeSpentOnDay
            projectId: 'project1',
            tagIds: ['tag1'],
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should create task entity with default values when minimal data provided', () => {
      const action = createAddTaskAction({ id: 'task1', title: 'Minimal Task' });

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskUpdate('task1', {
            id: 'task1',
            title: 'Minimal Task',
            timeSpent: 0, // Should default to 0
            isDone: false, // Should use DEFAULT_TASK values
            subTaskIds: [],
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should add task to project backlogTaskIds when adding to backlog', () => {
      const action = createAddTaskAction({}, { isAddToBacklog: true });

      metaReducer(baseState, action);
      expectStateUpdate(
        expectProjectUpdate('project1', { backlogTaskIds: ['task1'] }),
        action,
        mockReducer,
        baseState,
      );
    });

    it('should add task to Today tag when due today', () => {
      const action = createAddTaskAction({ dueDay: getDbDateStr() });

      metaReducer(baseState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['task1'] },
          TODAY: { taskIds: ['task1'] },
        }),
        action,
        mockReducer,
        baseState,
      );
    });

    it('should add task to planner days when due in future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getDbDateStr(tomorrow);

      const action = createAddTaskAction({ dueDay: tomorrowStr });

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('task1'),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
          planner: jasmine.objectContaining({
            days: jasmine.objectContaining({
              [tomorrowStr]: ['task1'],
            }),
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should not add task to planner days when due today (should go to TODAY tag instead)', () => {
      const today = getDbDateStr();
      const action = createAddTaskAction({ dueDay: today });

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('task1'),
          ...expectTagUpdates({
            tag1: { taskIds: ['task1'] },
            TODAY: { taskIds: ['task1'] },
          }),
          planner: jasmine.objectContaining({
            days: {}, // Should remain empty
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should not add task to planner days when no dueDay is specified', () => {
      const action = createAddTaskAction({ dueDay: undefined });

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('task1'),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
          planner: jasmine.objectContaining({
            days: {}, // Should remain empty
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should add task to bottom when isAddToBottom is true', () => {
      const testState = createStateWithExistingTasks(
        ['existing-task'],
        [],
        ['existing-task'],
      );
      const action = createAddTaskAction({}, { isAddToBottom: true });

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

    it('should skip project update when task has no projectId', () => {
      const action = createAddTaskAction({ projectId: '' });

      metaReducer(baseState, action);
      expectStateUpdate(
        expectTagUpdate('tag1', { taskIds: ['task1'] }),
        action,
        mockReducer,
        baseState,
      );
    });

    it('should handle task with missing properties gracefully', () => {
      const action = createAddTaskAction(
        {
          id: 'minimal-task',
          title: 'Minimal',
          projectId: '',
          tagIds: [],
          // No timeSpentOnDay, etc.
        },
        { workContextId: '', workContextType: WorkContextType.PROJECT },
      );

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('minimal-task'),
          ...expectTaskUpdate('minimal-task', {
            timeSpent: 0, // Should default to 0
            projectId: '', // Should default to empty string
            title: 'Minimal',
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should add task to correct project list based on isEnableBacklog', () => {
      // Test with project that has backlog disabled
      const testState = createStateWithExistingTasks();
      const project1 = testState[PROJECT_FEATURE_NAME].entities.project1 as Project;
      testState[PROJECT_FEATURE_NAME].entities.project1 = {
        ...project1,
        isEnableBacklog: false,
      };

      const action = createAddTaskAction({}, { isAddToBacklog: true });

      metaReducer(testState, action);
      expectStateUpdate(
        // Should add to taskIds instead of backlogTaskIds when backlog is disabled
        expectProjectUpdate('project1', { taskIds: ['task1'] }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle non-existent project gracefully', () => {
      const action = createAddTaskAction({ projectId: 'non-existent-project' });

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('task1'),
          // Project should not be updated since it doesn't exist
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining(baseState[PROJECT_FEATURE_NAME].entities),
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });

    it('should handle non-existent tags gracefully', () => {
      const action = createAddTaskAction({ tagIds: ['non-existent-tag'] });

      metaReducer(baseState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityExists('task1'),
          // No tag updates should happen since the tag doesn't exist
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: [], // Should remain empty since task only has non-existent tag
              }),
            }),
          }),
        },
        action,
        mockReducer,
        baseState,
      );
    });
  });

  describe('convertToMainTask action', () => {
    const createConvertAction = (
      taskOverrides: Partial<Task> = {},
      actionOverrides = {},
    ) => {
      // Create state with parent task that has tagIds for the sub-task to inherit
      const parentTask = createMockTask({
        id: 'parent-task',
        tagIds: ['tag1'],
        projectId: 'project1',
      });

      // Set up state with parent task
      const stateWithParent = {
        ...baseState,
        [TASK_FEATURE_NAME]: {
          ...baseState[TASK_FEATURE_NAME],
          entities: {
            ...baseState[TASK_FEATURE_NAME].entities,
            'parent-task': parentTask,
          },
          ids: [...baseState[TASK_FEATURE_NAME].ids, 'parent-task'],
        },
      };

      const action = TaskSharedActions.convertToMainTask({
        task: createMockTask({ parentId: 'parent-task', ...taskOverrides }),
        parentTagIds: ['tag1'],
        isPlanForToday: false,
        ...actionOverrides,
      });

      return { action, testState: stateWithParent };
    };

    it('should add task to project taskIds', () => {
      const { action, testState } = createConvertAction();

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1'] }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should add task to Today tag when isPlanForToday is true', () => {
      const { action, testState } = createConvertAction({}, { isPlanForToday: true });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['task1'] },
          TODAY: { taskIds: ['task1'] },
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should add task at the beginning of existing taskIds', () => {
      const { action, testState: baseTestState } = createConvertAction();

      // Combine with existing tasks state
      const testState = {
        ...baseTestState,
        [TASK_FEATURE_NAME]: {
          ...baseTestState[TASK_FEATURE_NAME],
          entities: {
            ...baseTestState[TASK_FEATURE_NAME].entities,
            'existing-task': createMockTask({ id: 'existing-task' }),
          },
          ids: [...baseTestState[TASK_FEATURE_NAME].ids, 'existing-task'],
        },
        [PROJECT_FEATURE_NAME]: {
          ...baseTestState[PROJECT_FEATURE_NAME],
          entities: {
            ...baseTestState[PROJECT_FEATURE_NAME].entities,
            project1: {
              ...baseTestState[PROJECT_FEATURE_NAME].entities.project1,
              taskIds: ['existing-task'],
            } as Project,
          },
        },
        [TAG_FEATURE_NAME]: {
          ...baseTestState[TAG_FEATURE_NAME],
          entities: {
            ...baseTestState[TAG_FEATURE_NAME].entities,
            tag1: {
              ...baseTestState[TAG_FEATURE_NAME].entities.tag1,
              taskIds: ['existing-task'],
            } as Tag,
          },
        },
      };

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectProjectUpdate('project1', { taskIds: ['task1', 'existing-task'] }),
          ...expectTagUpdate('tag1', { taskIds: ['task1', 'existing-task'] }),
        },
        action,
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityNotExists('task1', baseState),
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
        mockReducer,
        testState,
      );
    });

    it('should delete task entity and handle subtasks', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'subtask1', 'other-task'],
        [],
        ['task1', 'subtask1', 'other-task'],
        [],
      );
      const action = createDeleteAction({
        id: 'task1',
        subTaskIds: ['subtask1'],
        subTasks: [{ id: 'subtask1', tagIds: ['tag1'] } as Task],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityNotExists('task1', baseState),
          ...expectTagUpdate('tag1', { taskIds: ['other-task'] }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should delete task entity even when not in any project or tag', () => {
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const action = createDeleteAction({ projectId: '', tagIds: [] });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityNotExists('task1', baseState),
        },
        action,
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
          TODAY: { taskIds: ['today-task'] },
        }),
        action,
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
          TODAY: { taskIds: ['today-task'] },
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should remove task entities and handle currentTaskId', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2', 'other-task'],
        [],
        ['task1', 'task2', 'other-task'],
        [],
      );
      testState[TASK_FEATURE_NAME].currentTaskId = 'task1';

      const action = TaskSharedActions.deleteTasks({
        taskIds: ['task1', 'task2'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTaskEntityNotExists('task1', baseState),
          ...expectTaskEntityNotExists('task2', baseState),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            currentTaskId: null, // Should be reset when current task is deleted
            entities: jasmine.objectContaining({
              'other-task': jasmine.anything(),
            }),
            ids: ['other-task'],
          }),
          ...expectTagUpdate('tag1', { taskIds: ['other-task'] }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should preserve currentTaskId when not in deleted tasks', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2', 'current-task'],
        [],
        ['task1', 'task2', 'current-task'],
        [],
      );
      testState[TASK_FEATURE_NAME].currentTaskId = 'current-task';

      const action = TaskSharedActions.deleteTasks({
        taskIds: ['task1', 'task2'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            currentTaskId: 'current-task', // Should be preserved
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle tasks with subtasks', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'subtask1', 'other-task'],
        [],
        ['task1', 'other-task'], // subtask1 should not be in tags directly
        [],
      );

      // Setup parent-child relationship
      const task1 = testState[TASK_FEATURE_NAME].entities.task1 as Task;
      const subtask1 = testState[TASK_FEATURE_NAME].entities.subtask1 as Task;
      testState[TASK_FEATURE_NAME].entities.task1 = {
        ...task1,
        subTaskIds: ['subtask1'],
      };
      testState[TASK_FEATURE_NAME].entities.subtask1 = {
        ...subtask1,
        parentId: 'task1',
        tagIds: [], // Subtasks typically don't have tags
      };

      const action = TaskSharedActions.deleteTasks({
        taskIds: ['task1'], // Only deleting parent, but should include subtasks
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          ...expectTagUpdate('tag1', { taskIds: ['other-task'] }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            ids: ['other-task'], // Only other-task should remain
            entities: jasmine.objectContaining({
              'other-task': jasmine.anything(),
            }),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle empty taskIds array', () => {
      const action = TaskSharedActions.deleteTasks({ taskIds: [] });

      metaReducer(baseState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: [] },
          TODAY: { taskIds: [] },
        }),
        action,
        mockReducer,
        baseState,
      );
    });

    it('should only update tags that contain the deleted tasks', () => {
      const testState = createStateWithExistingTasks(
        [],
        [],
        ['task1', 'other-task'],
        ['different-task'], // TODAY tag doesn't contain task1
      );

      const action = TaskSharedActions.deleteTasks({
        taskIds: ['task1'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdate('tag1', { taskIds: ['other-task'] }),
        action,
        mockReducer,
        testState,
      );
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

      metaReducer(testState, action);
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
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
          tag2: { taskIds: ['task1'] },
        }),
        action,
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['task1'] },
          tag2: { taskIds: ['task1'] },
          tag3: { taskIds: ['task1'] },
        }),
        action,
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['other-task'] },
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle no tag changes when tagIds are the same', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        title: 'Updated Title',
        tagIds: ['tag1'],
      });

      metaReducer(testState, action);
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
        mockReducer,
        testState,
      );
    });

    it('should handle updating non-existent task gracefully', () => {
      const testState = createStateWithExistingTasks([], [], []);
      const action = createUpdateTaskAction('non-existent', { title: 'Updated' });

      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalledWith(testState, action);
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

      metaReducer(testState, action);
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
        mockReducer,
        testState,
      );
    });

    it('should handle timeSpentOnDay updates and recalculate timeSpent', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        timeSpentOnDay: {
          '2023-12-06': 3600000, // 1 hour
          '2023-12-07': 1800000, // 30 minutes
        },
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTaskUpdate('task1', {
          timeSpentOnDay: {
            '2023-12-06': 3600000,
            '2023-12-07': 1800000,
          },
          timeSpent: 5400000, // Should be sum: 1.5 hours
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle timeEstimate updates', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        timeEstimate: 7200000, // 2 hours
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTaskUpdate('task1', {
          timeEstimate: 7200000,
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle isDone updates and set doneOn timestamp', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        isDone: true,
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                isDone: true,
                doneOn: jasmine.any(Number), // Should set timestamp
              }),
            }),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should skip tag updates when tagIds are not provided', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        title: 'Updated Title',
        // No tagIds provided
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                title: 'Updated Title',
              }),
            }),
          }),
          // Tags should remain unchanged
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['task1'], // Should remain unchanged
              }),
            }),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle updating task with invalid tag IDs gracefully', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1']);
      const action = createUpdateTaskAction('task1', {
        tagIds: ['tag1', 'non-existent-tag'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['task1'], // Should still be updated
              }),
              // non-existent-tag should be ignored
            }),
          }),
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                tagIds: ['tag1', 'non-existent-tag'], // Task should still have both tags in its data
              }),
            }),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle unknown actions gracefully', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' };

      metaReducer(baseState, unknownAction);

      // Should pass through to reducer without modification
      expect(mockReducer).toHaveBeenCalledWith(baseState, unknownAction);
    });

    it('should handle null or undefined state gracefully', () => {
      const action = { type: 'SOME_ACTION' };

      metaReducer(null, action);
      expect(mockReducer).toHaveBeenCalledWith(null, action);

      metaReducer(undefined, action);
      expect(mockReducer).toHaveBeenCalledWith(undefined, action);
    });

    it('should preserve task entity order when adding tasks', () => {
      const testState = createStateWithExistingTasks(['existing1', 'existing2']);
      const action = TaskSharedActions.addTask({
        task: createMockTask({ id: 'new-task' }),
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: false,
        isAddToBacklog: false,
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            ids: jasmine.arrayContaining(['existing1', 'existing2', 'new-task']),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle concurrent task operations', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2'],
        [],
        ['task1', 'task2'],
      );

      // Simulate multiple operations that might happen concurrently
      const updateAction = TaskSharedActions.updateTask({
        task: { id: 'task1', changes: { title: 'Updated' } },
      });

      const intermediateState = metaReducer(testState, updateAction);

      const deleteAction = TaskSharedActions.deleteTask({
        task: {
          id: 'task2',
          tagIds: ['tag1'],
          subTasks: [],
        } as any,
      });

      metaReducer(intermediateState, deleteAction);

      // Both operations should be reflected
      expect(mockReducer).toHaveBeenCalledTimes(2);
    });

    it('should handle large numbers of tasks efficiently', () => {
      const manyTaskIds = Array.from({ length: 100 }, (_, i) => `task${i}`);
      const testState = createStateWithExistingTasks([], [], manyTaskIds);

      const action = TaskSharedActions.deleteTasks({
        taskIds: manyTaskIds.slice(0, 50), // Delete half
      });

      // Should complete without performance issues
      const startTime = Date.now();
      metaReducer(testState, action);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(mockReducer).toHaveBeenCalled();
    });
  });

  describe('parent/sub-task tag conflict resolution', () => {
    describe('addTask action', () => {
      it('should remove parent from tag when adding sub-task to same tag', () => {
        // Setup: parent task already in tag
        const testState = createStateWithExistingTasks(
          ['parent-task'],
          [],
          ['parent-task'],
        );

        // Create sub-task that will be added to the same tag
        const subTask = createMockTask({
          id: 'sub-task',
          parentId: 'parent-task',
          tagIds: ['tag1'],
        });

        const action = TaskSharedActions.addTask({
          task: subTask,
          workContextId: 'project1',
          workContextType: WorkContextType.PROJECT,
          isAddToBottom: false,
          isAddToBacklog: false,
        });

        metaReducer(testState, action);

        // Parent should be removed from tag, and tag removed from parent
        expectStateUpdate(
          {
            ...expectTaskUpdate('parent-task', {
              tagIds: [], // Tag should be removed from parent
            }),
            ...expectTagUpdate('tag1', {
              taskIds: ['sub-task'], // Only sub-task should remain
            }),
          },
          action,
          mockReducer,
          testState,
        );
      });

      it('should remove sub-tasks from tag when adding parent to same tag', () => {
        // Setup: sub-tasks already in tag
        const testState = createStateWithExistingTasks(
          ['sub1', 'sub2', 'other-task'],
          [],
          ['sub1', 'sub2', 'other-task'],
        );

        // Update sub-tasks to have parentId
        testState[TASK_FEATURE_NAME].entities.sub1 = createMockTask({
          id: 'sub1',
          parentId: 'parent-task',
          tagIds: ['tag1'],
        });
        testState[TASK_FEATURE_NAME].entities.sub2 = createMockTask({
          id: 'sub2',
          parentId: 'parent-task',
          tagIds: ['tag1'],
        });

        // Create parent task with sub-tasks
        const parentTask = createMockTask({
          id: 'parent-task',
          subTaskIds: ['sub1', 'sub2'],
          tagIds: ['tag1'],
        });

        const action = TaskSharedActions.addTask({
          task: parentTask,
          workContextId: 'project1',
          workContextType: WorkContextType.PROJECT,
          isAddToBottom: false,
          isAddToBacklog: false,
        });

        metaReducer(testState, action);

        // Sub-tasks should be removed from tag, and tag removed from sub-tasks
        expectStateUpdate(
          {
            ...expectTaskUpdate('sub1', {
              tagIds: [], // Tag should be removed
            }),
            ...expectTaskUpdate('sub2', {
              tagIds: [], // Tag should be removed
            }),
            ...expectTagUpdate('tag1', {
              taskIds: ['parent-task', 'other-task'], // Only parent and other-task
            }),
          },
          action,
          mockReducer,
          testState,
        );
      });
    });

    describe('updateTask action', () => {
      it('should remove parent from tag when adding tag to sub-task', () => {
        // Setup: parent task in tag, sub-task without tag
        const testState = createStateWithExistingTasks(
          ['parent-task', 'sub-task'],
          [],
          ['parent-task'],
        );

        testState[TASK_FEATURE_NAME].entities['sub-task'] = createMockTask({
          id: 'sub-task',
          parentId: 'parent-task',
          tagIds: [],
        });

        const action = TaskSharedActions.updateTask({
          task: {
            id: 'sub-task',
            changes: { tagIds: ['tag1'] },
          },
        });

        metaReducer(testState, action);

        expectStateUpdate(
          {
            ...expectTaskUpdate('parent-task', {
              tagIds: [], // Tag removed from parent
            }),
            ...expectTaskUpdate('sub-task', {
              tagIds: ['tag1'], // Tag added to sub-task
            }),
            ...expectTagUpdate('tag1', {
              taskIds: ['sub-task'], // Only sub-task in tag
            }),
          },
          action,
          mockReducer,
          testState,
        );
      });

      it('should remove sub-tasks from tag when adding tag to parent', () => {
        // Setup: sub-tasks in tag, parent without tag
        const testState = createStateWithExistingTasks(
          ['parent-task', 'sub1', 'sub2'],
          [],
          ['sub1', 'sub2'],
        );

        testState[TASK_FEATURE_NAME].entities['parent-task'] = createMockTask({
          id: 'parent-task',
          subTaskIds: ['sub1', 'sub2'],
          tagIds: [],
        });
        testState[TASK_FEATURE_NAME].entities.sub1 = createMockTask({
          id: 'sub1',
          parentId: 'parent-task',
          tagIds: ['tag1'],
        });
        testState[TASK_FEATURE_NAME].entities.sub2 = createMockTask({
          id: 'sub2',
          parentId: 'parent-task',
          tagIds: ['tag1'],
        });

        const action = TaskSharedActions.updateTask({
          task: {
            id: 'parent-task',
            changes: { tagIds: ['tag1'] },
          },
        });

        metaReducer(testState, action);

        expectStateUpdate(
          {
            ...expectTaskUpdate('parent-task', {
              tagIds: ['tag1'], // Tag added to parent
            }),
            ...expectTaskUpdate('sub1', {
              tagIds: [], // Tag removed from sub-task
            }),
            ...expectTaskUpdate('sub2', {
              tagIds: [], // Tag removed from sub-task
            }),
            ...expectTagUpdate('tag1', {
              taskIds: ['parent-task'], // Only parent in tag
            }),
          },
          action,
          mockReducer,
          testState,
        );
      });
    });

    describe('convertToMainTask action', () => {
      it('should remove parent from tag when converting sub-task to main task with same tag', () => {
        // Setup: parent and sub-task exist, parent is in tag
        const testState = createStateWithExistingTasks(
          ['parent-task', 'sub-task'],
          [],
          ['parent-task'],
        );

        testState[TASK_FEATURE_NAME].entities['parent-task'] = createMockTask({
          id: 'parent-task',
          subTaskIds: ['sub-task'],
          tagIds: ['tag1'],
        });
        testState[TASK_FEATURE_NAME].entities['sub-task'] = createMockTask({
          id: 'sub-task',
          parentId: 'parent-task',
          tagIds: [],
        });

        const action = TaskSharedActions.convertToMainTask({
          task: testState[TASK_FEATURE_NAME].entities['sub-task'] as Task,
          parentTagIds: ['tag1'],
          isPlanForToday: false,
        });

        metaReducer(testState, action);

        expectStateUpdate(
          {
            ...expectTaskUpdate('parent-task', {
              tagIds: [], // Tag removed from parent
            }),
            ...expectTaskUpdate('sub-task', {
              parentId: undefined, // No longer a sub-task
              tagIds: ['tag1'], // Inherited parent's tag
            }),
            ...expectTagUpdate('tag1', {
              taskIds: ['sub-task'], // Only converted task in tag
            }),
          },
          action,
          mockReducer,
          testState,
        );
      });
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
