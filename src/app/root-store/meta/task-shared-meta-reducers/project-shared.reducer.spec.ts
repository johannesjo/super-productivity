/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { projectSharedMetaReducer } from './project-shared.reducer';
import { TaskSharedActions } from '../task-shared.actions';
import { RootState } from '../../root-state';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { Task, TaskWithSubTasks } from '../../../features/tasks/task.model';
import { Action, ActionReducer } from '@ngrx/store';
import {
  createBaseState,
  createMockProject,
  createMockTask,
  createStateWithExistingTasks,
  expectStateUpdate,
  expectTagUpdates,
} from './test-utils';

describe('projectSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = projectSharedMetaReducer(mockReducer);
    baseState = createBaseState();
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

      metaReducer(testState, action);
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
        mockReducer,
        testState,
      );
    });

    it('should remove task from actual source project even if payload is stale', () => {
      const testState = createStateWithExistingTasks(['task1'], [], []);

      testState[PROJECT_FEATURE_NAME].entities.project2 = createMockProject({
        id: 'project2',
        title: 'Target Project',
      });
      (testState[PROJECT_FEATURE_NAME].ids as string[]) = [
        ...(testState[PROJECT_FEATURE_NAME].ids as string[]),
        'project2',
      ];

      const stalePayload: TaskWithSubTasks = {
        ...createMockTask({ id: 'task1', projectId: 'project2' }),
        subTasks: [],
        subTaskIds: [],
      };

      const action = createMoveToOtherProjectAction(stalePayload, 'project2');

      metaReducer(testState, action);
      const updatedState = mockReducer.calls.mostRecent().args[0];

      expect(updatedState[PROJECT_FEATURE_NAME].entities.project1.taskIds).toEqual([]);
      expect(updatedState[PROJECT_FEATURE_NAME].entities.project2.taskIds).toEqual([
        'task1',
      ]);
      expect(updatedState[TASK_FEATURE_NAME].entities.task1.projectId).toBe('project2');
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

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: [],
              }),
              project2: jasmine.objectContaining({
                // Only parent task should be in taskIds, not subtasks
                taskIds: ['task1'],
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
        mockReducer,
        testState,
      );
    });

    it('should not duplicate subtasks in target project taskIds', () => {
      // This test specifically verifies the fix for issue #4882
      const testState = createStateWithExistingTasks(
        ['parent-task', 'subtask1', 'subtask2', 'subtask3'],
        [],
        [],
      );

      // Setup parent-child relationships
      testState[TASK_FEATURE_NAME].entities['parent-task'] = {
        ...testState[TASK_FEATURE_NAME].entities['parent-task'],
        subTaskIds: ['subtask1', 'subtask2', 'subtask3'],
      } as Task;
      testState[TASK_FEATURE_NAME].entities['subtask1'] = {
        ...testState[TASK_FEATURE_NAME].entities['subtask1'],
        parentId: 'parent-task',
      } as Task;
      testState[TASK_FEATURE_NAME].entities['subtask2'] = {
        ...testState[TASK_FEATURE_NAME].entities['subtask2'],
        parentId: 'parent-task',
      } as Task;
      testState[TASK_FEATURE_NAME].entities['subtask3'] = {
        ...testState[TASK_FEATURE_NAME].entities['subtask3'],
        parentId: 'parent-task',
      } as Task;

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
        ...createMockTask({ id: 'parent-task', projectId: 'project1' }),
        subTasks: [
          createMockTask({
            id: 'subtask1',
            projectId: 'project1',
            parentId: 'parent-task',
          }),
          createMockTask({
            id: 'subtask2',
            projectId: 'project1',
            parentId: 'parent-task',
          }),
          createMockTask({
            id: 'subtask3',
            projectId: 'project1',
            parentId: 'parent-task',
          }),
        ],
        subTaskIds: ['subtask1', 'subtask2', 'subtask3'],
      };

      const action = createMoveToOtherProjectAction(task, 'project2');

      metaReducer(testState, action);

      // Get the updated state
      const updatedState = mockReducer.calls.mostRecent().args[0];
      const targetProjectTaskIds =
        updatedState[PROJECT_FEATURE_NAME].entities.project2.taskIds;

      // Verify only parent task is in taskIds
      expect(targetProjectTaskIds).toEqual(['parent-task']);
      expect(targetProjectTaskIds.length).toBe(1);

      // Verify subtasks are NOT in taskIds
      expect(targetProjectTaskIds).not.toContain('subtask1');
      expect(targetProjectTaskIds).not.toContain('subtask2');
      expect(targetProjectTaskIds).not.toContain('subtask3');

      // But all tasks should have updated projectId
      expect(updatedState[TASK_FEATURE_NAME].entities['parent-task'].projectId).toBe(
        'project2',
      );
      expect(updatedState[TASK_FEATURE_NAME].entities['subtask1'].projectId).toBe(
        'project2',
      );
      expect(updatedState[TASK_FEATURE_NAME].entities['subtask2'].projectId).toBe(
        'project2',
      );
      expect(updatedState[TASK_FEATURE_NAME].entities['subtask3'].projectId).toBe(
        'project2',
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

      metaReducer(testState, action);
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
        mockReducer,
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

      metaReducer(testState, action);
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
        mockReducer,
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

      metaReducer(testState, action);
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
        mockReducer,
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

      metaReducer(testState, action);
      expectStateUpdate(
        expectTagUpdates({
          tag1: { taskIds: ['keep-task'] },
          TODAY: { taskIds: ['keep-task'] },
        }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should remove the project entity from state', () => {
      const projectToDelete = createMockProject({ id: 'project-to-delete' });
      const testState = {
        ...createStateWithExistingTasks(['task1'], [], []),
        [PROJECT_FEATURE_NAME]: {
          ...createStateWithExistingTasks(['task1'], [], [])[PROJECT_FEATURE_NAME],
          ids: ['default-project', 'project-to-delete'],
          entities: {
            'default-project': createMockProject({ id: 'default-project' }),
            'project-to-delete': projectToDelete,
          },
        },
      };

      const action = TaskSharedActions.deleteProject({
        project: projectToDelete,
        allTaskIds: ['task1'],
      });

      metaReducer(testState, action);
      const updatedState = mockReducer.calls.mostRecent().args[0];

      expect(updatedState[PROJECT_FEATURE_NAME].ids).toEqual(['default-project']);
      expect(
        updatedState[PROJECT_FEATURE_NAME].entities['project-to-delete'],
      ).toBeUndefined();
      expect(
        updatedState[PROJECT_FEATURE_NAME].entities['default-project'],
      ).toBeDefined();
    });

    it('should handle empty project task lists', () => {
      const action = TaskSharedActions.deleteProject({
        project: createMockProject(),
        allTaskIds: [],
      });

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
  });

  describe('other actions', () => {
    it('should pass through other actions to the reducer', () => {
      const action = { type: 'SOME_OTHER_ACTION' };
      metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });
});
