/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { undoTaskDeleteMetaReducer } from './undo-task-delete.meta-reducer';
import { TaskSharedActions } from './task-shared.actions';
import { undoDeleteTask } from '../../features/tasks/store/task.actions';
import { RootState } from '../root-state';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { DEFAULT_TASK, Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Action, ActionReducer } from '@ngrx/store';
import { DEFAULT_PROJECT } from '../../features/project/project.const';
import { DEFAULT_TAG, TODAY_TAG } from '../../features/tag/tag.const';

describe('undoTaskDeleteMetaReducer', () => {
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

  const createMockTaskWithSubTasks = (
    overrides: Partial<TaskWithSubTasks> = {},
  ): TaskWithSubTasks => ({
    ...createMockTask(overrides),
    subTasks: overrides.subTasks || [],
  });

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    ...DEFAULT_PROJECT,
    id: 'project1',
    title: 'Test Project',
    isEnableBacklog: true,
    taskIds: ['task1'],
    backlogTaskIds: [],
    ...overrides,
  });

  const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
    ...DEFAULT_TAG,
    id: 'tag1',
    title: 'Test Tag',
    taskIds: ['task1'],
    ...overrides,
  });

  const createMockState = (overrides: any = {}): RootState =>
    ({
      [TASK_FEATURE_NAME]: {
        entities: {
          task1: createMockTask(),
          parentTask: createMockTask({ id: 'parentTask', subTaskIds: ['task1'] }),
          ...overrides.taskEntities,
        },
        ids: ['task1', 'parentTask'],
        ...overrides.taskState,
      },
      [PROJECT_FEATURE_NAME]: {
        entities: {
          project1: createMockProject(),
          INBOX_PROJECT: createMockProject({
            id: 'INBOX_PROJECT',
            title: 'Inbox',
            taskIds: [],
            backlogTaskIds: [],
          }),
          ...overrides.projectEntities,
        },
        ids: ['project1', 'INBOX_PROJECT'],
        ...overrides.projectState,
      },
      [TAG_FEATURE_NAME]: {
        entities: {
          tag1: createMockTag(),
          [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: ['task1'] },
          ...overrides.tagEntities,
        },
        ids: ['tag1', TODAY_TAG.id],
        ...overrides.tagState,
      },
      ...overrides.otherState,
    }) as any;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = undoTaskDeleteMetaReducer(mockReducer);
    baseState = createMockState();
  });

  // =============================================================================
  // DELETE TASK TESTS
  // =============================================================================

  describe('deleteTask action', () => {
    it('should capture state and pass through to reducer', () => {
      const task = createMockTaskWithSubTasks();
      const action = TaskSharedActions.deleteTask({ task });

      const result = metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
      expect(result).toBe(baseState);
    });

    it('should handle deletion of last task in project', () => {
      const state = createMockState({
        projectEntities: {
          project1: createMockProject({ taskIds: ['task1'], backlogTaskIds: [] }),
        },
      });
      const task = createMockTaskWithSubTasks();
      const action = TaskSharedActions.deleteTask({ task });

      expect(() => metaReducer(state, action)).not.toThrow();
    });

    it('should handle task with undefined subTasks', () => {
      const taskWithUndefinedSubTasks = {
        ...createMockTask(),
        subTasks: undefined,
      } as any as TaskWithSubTasks;
      const action = TaskSharedActions.deleteTask({ task: taskWithUndefinedSubTasks });

      expect(() => metaReducer(baseState, action)).not.toThrow();
      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });

    it('should handle task with undefined subTasks in complex scenario', () => {
      const state = createMockState({
        tagEntities: {
          tag1: createMockTag({ taskIds: ['task1', 'task2'] }),
          tag2: createMockTag({ id: 'tag2', taskIds: ['task1'] }),
          [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: ['task1', 'task2'] },
        },
        projectEntities: {
          project1: createMockProject({
            taskIds: ['task1', 'task2'],
            backlogTaskIds: ['task3'],
          }),
        },
      });

      const taskWithUndefinedSubTasks = {
        ...createMockTask({
          id: 'task1',
          tagIds: ['tag1', 'tag2'],
          projectId: 'project1',
        }),
        subTasks: undefined,
      } as any as TaskWithSubTasks;

      const action = TaskSharedActions.deleteTask({ task: taskWithUndefinedSubTasks });

      expect(() => metaReducer(state, action)).not.toThrow();
      expect(mockReducer).toHaveBeenCalledWith(state, action);
    });

    it('should handle deletion of task from INBOX_PROJECT with empty arrays', () => {
      const state = createMockState({
        taskEntities: {
          inboxTask: createMockTask({ id: 'inboxTask', projectId: 'INBOX_PROJECT' }),
        },
      });
      const task = createMockTaskWithSubTasks({
        id: 'inboxTask',
        projectId: 'INBOX_PROJECT',
      });
      const action = TaskSharedActions.deleteTask({ task });

      expect(() => metaReducer(state, action)).not.toThrow();
    });

    it('should capture subtask information', () => {
      const subTask1 = createMockTask({
        id: 'sub1',
        parentId: 'task1',
        tagIds: ['tag2'],
      });
      const subTask2 = createMockTask({
        id: 'sub2',
        parentId: 'task1',
        tagIds: ['tag3'],
      });
      const task = createMockTaskWithSubTasks({
        subTaskIds: ['sub1', 'sub2'],
        subTasks: [subTask1, subTask2],
      });
      const state = createMockState({
        taskEntities: {
          task1: task,
          sub1: subTask1,
          sub2: subTask2,
        },
        tagEntities: {
          tag1: createMockTag({ taskIds: ['task1'] }),
          tag2: createMockTag({ id: 'tag2', taskIds: ['sub1'] }),
          tag3: createMockTag({ id: 'tag3', taskIds: ['sub2'] }),
          [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: ['task1', 'sub1', 'sub2'] },
        },
      });

      const action = TaskSharedActions.deleteTask({ task });
      metaReducer(state, action);

      // State should be captured with all subtask tag associations
      expect(mockReducer).toHaveBeenCalled();
    });

    it('should handle subtask deletion', () => {
      const subTask = createMockTaskWithSubTasks({
        id: 'sub1',
        parentId: 'parentTask',
        projectId: 'project1',
      });
      const action = TaskSharedActions.deleteTask({ task: subTask });

      const result = metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
      expect(result).toBe(baseState);
    });

    it('should throw error if project data is invalid', () => {
      const state = createMockState({
        projectEntities: {
          project1: { ...createMockProject(), taskIds: null, backlogTaskIds: null },
        },
      });
      const task = createMockTaskWithSubTasks();
      const action = TaskSharedActions.deleteTask({ task });

      expect(() => metaReducer(state, action)).toThrowError('Invalid project data');
    });
  });

  // =============================================================================
  // UNDO DELETE TASK TESTS
  // =============================================================================

  describe('undoDeleteTask action', () => {
    it('should restore deleted task', () => {
      const task = createMockTaskWithSubTasks();
      const deleteAction = TaskSharedActions.deleteTask({ task });
      const stateAfterDelete = {
        ...baseState,
        [TASK_FEATURE_NAME]: {
          ...baseState[TASK_FEATURE_NAME],
          entities: {},
          ids: [],
        },
      };

      // First delete the task to capture state
      metaReducer(baseState, deleteAction);
      mockReducer.calls.reset();

      // Then restore it
      const undoAction = undoDeleteTask();
      metaReducer(stateAfterDelete, undoAction);

      expect(mockReducer).toHaveBeenCalled();
      const updatedState = mockReducer.calls.mostRecent().args[0];
      expect(updatedState[TASK_FEATURE_NAME].entities.task1).toBeDefined();
    });

    it('should restore task to project arrays', () => {
      const task = createMockTaskWithSubTasks();
      const deleteAction = TaskSharedActions.deleteTask({ task });
      const stateAfterDelete = {
        ...baseState,
        [TASK_FEATURE_NAME]: {
          ...baseState[TASK_FEATURE_NAME],
          entities: {},
          ids: [],
        },
        [PROJECT_FEATURE_NAME]: {
          ...baseState[PROJECT_FEATURE_NAME],
          entities: {
            project1: { ...createMockProject(), taskIds: [], backlogTaskIds: [] },
          },
        },
      };

      // First delete the task
      metaReducer(baseState, deleteAction);
      mockReducer.calls.reset();

      // Then restore it
      const undoAction = undoDeleteTask();
      metaReducer(stateAfterDelete, undoAction);

      const updatedState = mockReducer.calls.mostRecent().args[0];
      expect(updatedState[PROJECT_FEATURE_NAME].entities.project1.taskIds).toContain(
        'task1',
      );
    });

    it('should restore task to tag arrays', () => {
      const task = createMockTaskWithSubTasks();
      const deleteAction = TaskSharedActions.deleteTask({ task });
      const stateAfterDelete = {
        ...baseState,
        [TASK_FEATURE_NAME]: {
          ...baseState[TASK_FEATURE_NAME],
          entities: {},
          ids: [],
        },
        [TAG_FEATURE_NAME]: {
          ...baseState[TAG_FEATURE_NAME],
          entities: {
            tag1: { ...createMockTag(), taskIds: [] },
            [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: [] },
          },
        },
      };

      // First delete the task
      metaReducer(baseState, deleteAction);
      mockReducer.calls.reset();

      // Then restore it
      const undoAction = undoDeleteTask();
      metaReducer(stateAfterDelete, undoAction);

      const updatedState = mockReducer.calls.mostRecent().args[0];
      expect(updatedState[TAG_FEATURE_NAME].entities.tag1.taskIds).toContain('task1');
      expect(updatedState[TAG_FEATURE_NAME].entities[TODAY_TAG.id].taskIds).toContain(
        'task1',
      );
    });

    it('should restore subtasks with their tags', () => {
      const subTask1 = createMockTask({
        id: 'sub1',
        parentId: 'task1',
        tagIds: ['tag2'],
      });
      const subTask2 = createMockTask({
        id: 'sub2',
        parentId: 'task1',
        tagIds: ['tag3'],
      });
      const task = createMockTaskWithSubTasks({
        subTaskIds: ['sub1', 'sub2'],
        subTasks: [subTask1, subTask2],
      });
      const state = createMockState({
        taskEntities: {
          task1: task,
          sub1: subTask1,
          sub2: subTask2,
        },
        tagEntities: {
          tag1: createMockTag({ taskIds: ['task1'] }),
          tag2: createMockTag({ id: 'tag2', taskIds: ['sub1'] }),
          tag3: createMockTag({ id: 'tag3', taskIds: ['sub2'] }),
          [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: ['task1', 'sub1', 'sub2'] },
        },
      });

      const stateAfterDelete = {
        ...state,
        [TASK_FEATURE_NAME]: {
          ...state[TASK_FEATURE_NAME],
          entities: {},
          ids: [],
        },
        [TAG_FEATURE_NAME]: {
          ...state[TAG_FEATURE_NAME],
          entities: {
            tag1: { ...createMockTag({ taskIds: [] }) },
            tag2: { ...createMockTag({ id: 'tag2', taskIds: [] }) },
            tag3: { ...createMockTag({ id: 'tag3', taskIds: [] }) },
            [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: [] },
          },
        },
      };

      // Delete and then restore
      metaReducer(state, TaskSharedActions.deleteTask({ task }));
      mockReducer.calls.reset();
      metaReducer(stateAfterDelete, undoDeleteTask());

      const updatedState = mockReducer.calls.mostRecent().args[0];
      // Check main task
      expect(updatedState[TASK_FEATURE_NAME].entities.task1).toBeDefined();
      // Check subtasks
      expect(updatedState[TASK_FEATURE_NAME].entities.sub1).toBeDefined();
      expect(updatedState[TASK_FEATURE_NAME].entities.sub2).toBeDefined();
      // Check tag associations
      expect(updatedState[TAG_FEATURE_NAME].entities.tag2.taskIds).toContain('sub1');
      expect(updatedState[TAG_FEATURE_NAME].entities.tag3.taskIds).toContain('sub2');
      expect(updatedState[TAG_FEATURE_NAME].entities[TODAY_TAG.id].taskIds).toContain(
        'task1',
      );
      expect(updatedState[TAG_FEATURE_NAME].entities[TODAY_TAG.id].taskIds).toContain(
        'sub1',
      );
      expect(updatedState[TAG_FEATURE_NAME].entities[TODAY_TAG.id].taskIds).toContain(
        'sub2',
      );
    });

    it('should restore subtask to parent subTaskIds', () => {
      const subTask = createMockTaskWithSubTasks({
        id: 'sub1',
        parentId: 'parentTask',
        projectId: 'project1',
      });
      const state = createMockState({
        taskEntities: {
          parentTask: createMockTask({ id: 'parentTask', subTaskIds: ['sub1'] }),
          sub1: subTask,
        },
      });
      const stateAfterDelete = {
        ...state,
        [TASK_FEATURE_NAME]: {
          ...state[TASK_FEATURE_NAME],
          entities: {
            parentTask: createMockTask({ id: 'parentTask', subTaskIds: [] }),
          },
          ids: ['parentTask'],
        },
      };

      // Delete and then restore
      metaReducer(state, TaskSharedActions.deleteTask({ task: subTask }));
      mockReducer.calls.reset();
      metaReducer(stateAfterDelete, undoDeleteTask());

      const updatedState = mockReducer.calls.mostRecent().args[0];
      expect(updatedState[TASK_FEATURE_NAME].entities.parentTask.subTaskIds).toContain(
        'sub1',
      );
    });

    it('should handle missing task data gracefully', () => {
      // Simulate a case where task data is corrupted
      const task = createMockTaskWithSubTasks({
        subTasks: [{ id: 'sub1' } as any], // Invalid subtask
      });
      const deleteAction = TaskSharedActions.deleteTask({ task });
      const stateAfterDelete = baseState;

      // Delete with invalid data
      metaReducer(baseState, deleteAction);
      mockReducer.calls.reset();

      // Restore should not throw
      expect(() => metaReducer(stateAfterDelete, undoDeleteTask())).not.toThrow();
    });

    it('should not fail when undoing without prior delete', () => {
      const undoAction = undoDeleteTask();
      expect(() => metaReducer(baseState, undoAction)).not.toThrow();
    });

    it('should restore task with undefined subTasks correctly', () => {
      const taskWithUndefinedSubTasks = {
        ...createMockTask({ id: 'taskNoSubs', projectId: 'project1', tagIds: ['tag1'] }),
        subTasks: undefined,
      } as any as TaskWithSubTasks;

      const state = createMockState({
        taskEntities: {
          task1: createMockTask(),
          taskNoSubs: taskWithUndefinedSubTasks,
        },
        projectEntities: {
          project1: createMockProject({ taskIds: ['task1', 'taskNoSubs'] }),
        },
        tagEntities: {
          tag1: createMockTag({ taskIds: ['task1', 'taskNoSubs'] }),
          [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: ['task1', 'taskNoSubs'] },
        },
      });

      const deleteAction = TaskSharedActions.deleteTask({
        task: taskWithUndefinedSubTasks,
      });
      const stateAfterDelete = {
        ...state,
        [TASK_FEATURE_NAME]: {
          ...state[TASK_FEATURE_NAME],
          entities: {
            task1: createMockTask(),
          },
          ids: ['task1'],
        },
        [PROJECT_FEATURE_NAME]: {
          ...state[PROJECT_FEATURE_NAME],
          entities: {
            ...state[PROJECT_FEATURE_NAME].entities,
            project1: { ...createMockProject(), taskIds: ['task1'], backlogTaskIds: [] },
          },
        },
        [TAG_FEATURE_NAME]: {
          ...state[TAG_FEATURE_NAME],
          entities: {
            ...state[TAG_FEATURE_NAME].entities,
            tag1: { ...createMockTag(), taskIds: ['task1'] },
            [TODAY_TAG.id]: { ...TODAY_TAG, taskIds: ['task1'] },
          },
        },
      };

      // First delete the task
      metaReducer(state, deleteAction);
      mockReducer.calls.reset();

      // Then restore it
      const undoAction = undoDeleteTask();
      metaReducer(stateAfterDelete, undoAction);

      const updatedState = mockReducer.calls.mostRecent().args[0];
      // Check task is restored
      expect(updatedState[TASK_FEATURE_NAME].entities.taskNoSubs).toBeDefined();
      // Check project association is restored
      expect(updatedState[PROJECT_FEATURE_NAME].entities.project1.taskIds).toContain(
        'taskNoSubs',
      );
      // Check tag associations are restored
      expect(updatedState[TAG_FEATURE_NAME].entities.tag1.taskIds).toContain(
        'taskNoSubs',
      );
      expect(updatedState[TAG_FEATURE_NAME].entities[TODAY_TAG.id].taskIds).toContain(
        'taskNoSubs',
      );
    });
  });

  // =============================================================================
  // OTHER ACTIONS
  // =============================================================================

  describe('other actions', () => {
    it('should pass through unrelated actions', () => {
      const action = { type: 'UNRELATED_ACTION' };
      const result = metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
      expect(result).toBe(baseState);
    });
  });
});
