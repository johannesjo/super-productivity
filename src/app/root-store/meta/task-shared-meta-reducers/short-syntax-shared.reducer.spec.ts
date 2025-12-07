/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { shortSyntaxSharedMetaReducer } from './short-syntax-shared.reducer';
import { RootState } from '../../root-state';
import { Task } from '../../../features/tasks/task.model';
import { Action, ActionReducer } from '@ngrx/store';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { TaskSharedActions } from '../task-shared.actions';
import {
  createBaseState,
  createMockProject,
  createMockTask,
  createStateWithExistingTasks,
  expectStateUpdate,
  expectTagUpdate,
  expectTaskUpdate,
  expectProjectUpdate,
} from './test-utils';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { plannerFeatureKey } from '../../../features/planner/store/planner.reducer';

describe('shortSyntaxSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = shortSyntaxSharedMetaReducer(mockReducer);
    baseState = createBaseState();
  });

  describe('applyShortSyntax action - task updates', () => {
    it('should apply basic task changes', () => {
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const task = createMockTask({ id: 'task1', projectId: 'project1' });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: { title: 'Updated Title', timeEstimate: 3600000 },
      });

      metaReducer(testState, action);
      expectStateUpdate(
        expectTaskUpdate('task1', { title: 'Updated Title', timeEstimate: 3600000 }),
        action,
        mockReducer,
        testState,
      );
    });

    it('should not change state if task does not exist', () => {
      const action = TaskSharedActions.applyShortSyntax({
        task: createMockTask({ id: 'non-existent' }),
        taskChanges: { title: 'Updated' },
      });

      metaReducer(baseState, action);
      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });

  describe('applyShortSyntax action - project move', () => {
    it('should move task to target project', () => {
      // Create state with task in project1 and a project2
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      // Add project2 to the state
      const project2 = createMockProject({
        id: 'project2',
        title: 'Project 2',
        taskIds: [],
        backlogTaskIds: [],
      });
      const stateWithProject2 = {
        ...testState,
        [PROJECT_FEATURE_NAME]: {
          ...testState[PROJECT_FEATURE_NAME],
          ids: [...(testState[PROJECT_FEATURE_NAME].ids as string[]), 'project2'],
          entities: {
            ...testState[PROJECT_FEATURE_NAME].entities,
            project2,
          },
        },
      } as RootState;

      const task = createMockTask({ id: 'task1', projectId: 'project1' });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        targetProjectId: 'project2',
      });

      metaReducer(stateWithProject2, action);

      // Verify task was removed from project1 and added to project2
      expectStateUpdate(
        expectProjectUpdate('project1', { taskIds: [] }),
        action,
        mockReducer,
        stateWithProject2,
      );
      expectStateUpdate(
        expectProjectUpdate('project2', { taskIds: ['task1'] }),
        action,
        mockReducer,
        stateWithProject2,
      );
      expectStateUpdate(
        expectTaskUpdate('task1', { projectId: 'project2' }),
        action,
        mockReducer,
        stateWithProject2,
      );
    });

    it('should not move if targetProjectId is same as current', () => {
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const task = createMockTask({ id: 'task1', projectId: 'project1' });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        targetProjectId: 'project1',
      });

      metaReducer(testState, action);

      // Project should remain unchanged
      expect(mockReducer).toHaveBeenCalled();
      const calledState = mockReducer.calls.mostRecent().args[0];
      expect(calledState[PROJECT_FEATURE_NAME].entities.project1.taskIds).toEqual([
        'task1',
      ]);
    });
  });

  describe('applyShortSyntax action - scheduling with day', () => {
    it('should add task to today tag when scheduling for today', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks(
        ['task1'],
        [],
        [],
        ['existing-task'],
      );
      const task = createMockTask({ id: 'task1', projectId: 'project1', tagIds: [] });

      // Update task entity to have empty tagIds
      const stateWithTask = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: todayStr, isAddToTop: false },
      });

      metaReducer(stateWithTask, action);

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['existing-task', 'task1'] }),
        action,
        mockReducer,
        stateWithTask,
      );
      expectStateUpdate(
        expectTaskUpdate('task1', { dueDay: todayStr, tagIds: ['TODAY'] }),
        action,
        mockReducer,
        stateWithTask,
      );
    });

    it('should add task to top of today when isAddToTop is true', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks(
        ['task1'],
        [],
        [],
        ['existing-task'],
      );
      const task = createMockTask({ id: 'task1', projectId: 'project1', tagIds: [] });

      const stateWithTask = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: todayStr, isAddToTop: true },
      });

      metaReducer(stateWithTask, action);

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: ['task1', 'existing-task'] }),
        action,
        mockReducer,
        stateWithTask,
      );
    });

    it('should remove task from today when scheduling for different day', () => {
      const futureDay = '2099-12-31';
      const testState = createStateWithExistingTasks(['task1'], [], [], ['task1']);
      const task = createMockTask({ id: 'task1', tagIds: ['TODAY'] });

      // Update task entity to include TODAY in tagIds
      const stateWithTodayTag = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: ['TODAY'],
            } as Task,
          },
        },
      } as RootState;

      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: futureDay },
      });

      metaReducer(stateWithTodayTag, action);

      expectStateUpdate(
        expectTagUpdate('TODAY', { taskIds: [] }),
        action,
        mockReducer,
        stateWithTodayTag,
      );
      expectStateUpdate(
        expectTaskUpdate('task1', { dueDay: futureDay, tagIds: [] }),
        action,
        mockReducer,
        stateWithTodayTag,
      );
    });

    it('should add task to planner days when scheduling for future day', () => {
      const futureDay = '2099-12-31';
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const task = createMockTask({ id: 'task1', tagIds: [] });

      const stateWithTask = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: futureDay },
      });

      metaReducer(stateWithTask, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;
      expect(calledState[plannerFeatureKey as keyof RootState]).toEqual(
        jasmine.objectContaining({
          days: jasmine.objectContaining({
            [futureDay]: ['task1'],
          }),
        }),
      );
    });
  });

  describe('applyShortSyntax action - scheduling with time', () => {
    it('should schedule task with dueWithTime and update today tag for today', () => {
      const now = Date.now();
      const todayTimestamp = now + 3600000; // 1 hour from now (same day)
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const task = createMockTask({ id: 'task1', tagIds: [] });

      const stateWithTask = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: {
          dueWithTime: todayTimestamp,
          remindAt: todayTimestamp - 900000, // 15 min before
        },
      });

      metaReducer(stateWithTask, action);

      expectStateUpdate(
        expectTaskUpdate('task1', {
          dueWithTime: todayTimestamp,
          remindAt: todayTimestamp - 900000,
        }),
        action,
        mockReducer,
        stateWithTask,
      );
    });
  });

  describe('applyShortSyntax action - combined operations', () => {
    it('should handle project move + scheduling atomically', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks(['task1'], [], [], []);

      // Add project2 to the state
      const project2 = createMockProject({
        id: 'project2',
        title: 'Project 2',
        taskIds: [],
        backlogTaskIds: [],
      });
      const stateWithProject2 = {
        ...testState,
        [PROJECT_FEATURE_NAME]: {
          ...testState[PROJECT_FEATURE_NAME],
          ids: [...(testState[PROJECT_FEATURE_NAME].ids as string[]), 'project2'],
          entities: {
            ...testState[PROJECT_FEATURE_NAME].entities,
            project2,
          },
        },
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const task = createMockTask({ id: 'task1', projectId: 'project1', tagIds: [] });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: { title: 'Updated Title' },
        targetProjectId: 'project2',
        schedulingInfo: { day: todayStr },
      });

      metaReducer(stateWithProject2, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;

      // Verify all changes happened atomically
      expect(calledState[TASK_FEATURE_NAME].entities.task1).toEqual(
        jasmine.objectContaining({
          title: 'Updated Title',
          projectId: 'project2',
          dueDay: todayStr,
          tagIds: ['TODAY'],
        }),
      );
      expect(calledState[PROJECT_FEATURE_NAME].entities.project1!.taskIds).toEqual([]);
      expect(calledState[PROJECT_FEATURE_NAME].entities.project2!.taskIds).toEqual([
        'task1',
      ]);
    });

    it('should handle task changes + tag updates atomically', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks(['task1'], [], [], []);

      const stateWithTask = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: ['tag1'],
            } as Task,
          },
        },
      } as RootState;

      const task = createMockTask({ id: 'task1', tagIds: ['tag1'] });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {
          title: 'New Title',
          timeEstimate: 7200000,
          tagIds: ['tag1', 'tag2'],
        },
        schedulingInfo: { day: todayStr },
      });

      metaReducer(stateWithTask, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;
      const updatedTask = calledState[TASK_FEATURE_NAME].entities.task1 as Task;

      expect(updatedTask.title).toBe('New Title');
      expect(updatedTask.timeEstimate).toBe(7200000);
      // Note: tagIds will be overwritten by scheduling logic to include TODAY
      expect(updatedTask.tagIds).toContain('TODAY');
    });
  });

  describe('applyShortSyntax action - board-style consistency', () => {
    it('should update both tag.taskIds and task.tagIds when adding to today', () => {
      const todayStr = getDbDateStr();
      const testState = createStateWithExistingTasks(['task1'], [], [], []);

      const stateWithTask = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const task = createMockTask({ id: 'task1', tagIds: [] });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: todayStr },
      });

      metaReducer(stateWithTask, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;

      // Both sides should be updated
      expect(calledState[TASK_FEATURE_NAME].entities.task1!.tagIds).toContain('TODAY');
      expect((calledState as any).tag.entities.TODAY.taskIds as string[]).toContain(
        'task1',
      );
    });

    it('should update both tag.taskIds and task.tagIds when removing from today', () => {
      const futureDay = '2099-12-31';
      const testState = createStateWithExistingTasks(['task1'], [], [], ['task1']);

      const stateWithTodayTag = {
        ...testState,
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: ['TODAY'],
            } as Task,
          },
        },
      } as RootState;

      const task = createMockTask({ id: 'task1', tagIds: ['TODAY'] });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: futureDay },
      });

      metaReducer(stateWithTodayTag, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;

      // Both sides should be updated
      expect(calledState[TASK_FEATURE_NAME].entities.task1!.tagIds).not.toContain(
        'TODAY',
      );
      expect((calledState as any).tag.entities.TODAY.taskIds as string[]).not.toContain(
        'task1',
      );
    });
  });

  describe('applyShortSyntax action - planner integration', () => {
    it('should remove task from planner days when scheduling for today', () => {
      const todayStr = getDbDateStr();
      const futureDay = '2099-12-31';

      // Create state with task in planner for future day
      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const stateWithPlanner = {
        ...testState,
        [plannerFeatureKey]: {
          days: {
            [futureDay]: ['task1', 'other-task'],
          },
          addPlannedTasksDialogLastShown: undefined,
        },
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [] as string[],
            } as Task,
          },
        },
      } as RootState;

      const task = createMockTask({ id: 'task1', tagIds: [] });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: todayStr },
      });

      metaReducer(stateWithPlanner, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;
      expect(
        (calledState[plannerFeatureKey as keyof RootState] as any).days[futureDay],
      ).toEqual(['other-task']);
    });

    it('should move task between planner days', () => {
      const day1 = '2099-12-30';
      const day2 = '2099-12-31';

      const testState = createStateWithExistingTasks(['task1'], [], [], []);
      const stateWithPlanner = {
        ...testState,
        [plannerFeatureKey]: {
          days: {
            [day1]: ['task1'],
          },
          addPlannedTasksDialogLastShown: undefined,
        },
        [TASK_FEATURE_NAME]: {
          ...testState[TASK_FEATURE_NAME],
          entities: {
            ...testState[TASK_FEATURE_NAME].entities,
            task1: {
              ...testState[TASK_FEATURE_NAME].entities.task1,
              tagIds: [],
            },
          },
        },
      };

      const task = createMockTask({ id: 'task1', tagIds: [] });
      const action = TaskSharedActions.applyShortSyntax({
        task,
        taskChanges: {},
        schedulingInfo: { day: day2 },
      });

      metaReducer(stateWithPlanner, action);

      const calledState = mockReducer.calls.mostRecent().args[0] as RootState;
      const plannerState = calledState[plannerFeatureKey as keyof RootState] as any;
      expect(plannerState.days[day1]).toEqual([]);
      expect(plannerState.days[day2]).toContain('task1');
    });
  });
});
