/* eslint-disable @typescript-eslint/naming-convention, no-mixed-operators */
import { StateChangeCaptureService } from '../processing/state-change-capture.service';
import { PersistentAction, PersistentActionMeta } from '../persistent-action.interface';
import { EntityType, OpType } from '../operation.types';
import { RootState } from '../../../../root-store/root-state';
import { TASK_FEATURE_NAME } from '../../../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../../../features/project/store/project.reducer';
import { plannerFeatureKey } from '../../../../features/planner/store/planner.reducer';
import { Task, DEFAULT_TASK } from '../../../../features/tasks/task.model';
import { Tag } from '../../../../features/tag/tag.model';
import { DEFAULT_TAG } from '../../../../features/tag/tag.const';
import { Project } from '../../../../features/project/project.model';
import { DEFAULT_PROJECT } from '../../../../features/project/project.const';

/**
 * Multi-Entity Atomicity Tests
 *
 * These tests verify that complex actions correctly capture state changes
 * across multiple entity types. This is critical for sync consistency.
 *
 * Key scenarios tested:
 * 1. applyShortSyntax - task update + project move + scheduling + tag update
 * 2. deleteTask - task deletion + tag taskIds update + project taskIds update
 * 3. transferTask - today tag updates + planner updates + task dueDay update
 */
describe('Multi-Entity Atomicity Integration', () => {
  let service: StateChangeCaptureService;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    ...DEFAULT_TASK,
    id: 'task-1',
    title: 'Test Task',
    tagIds: [],
    projectId: '',
    ...overrides,
  });

  const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
    ...DEFAULT_TAG,
    id: 'tag-1',
    title: 'Test Tag',
    taskIds: [],
    ...overrides,
  });

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    ...DEFAULT_PROJECT,
    id: 'project-1',
    title: 'Test Project',
    taskIds: [],
    backlogTaskIds: [],
    ...overrides,
  });

  const createBaseState = (): RootState => {
    const task1 = createMockTask({ id: 'task-1', projectId: 'project-1', tagIds: [] });
    const task2 = createMockTask({
      id: 'task-2',
      projectId: 'project-1',
      tagIds: ['tag-1'],
    });
    const tag1 = createMockTag({ id: 'tag-1', taskIds: ['task-2'] });
    const todayTag = createMockTag({ id: 'TODAY', title: 'Today', taskIds: [] });
    const project1 = createMockProject({
      id: 'project-1',
      taskIds: ['task-1', 'task-2'],
    });
    const project2 = createMockProject({ id: 'project-2', taskIds: [] });

    return {
      [TASK_FEATURE_NAME]: {
        ids: ['task-1', 'task-2'],
        entities: {
          'task-1': task1,
          'task-2': task2,
        },
        currentTaskId: null,
        selectedTaskId: null,
        taskDetailTargetPanel: null,
        lastCurrentTaskId: null,
        isDataLoaded: true,
      },
      [TAG_FEATURE_NAME]: {
        ids: ['tag-1', 'TODAY'],
        entities: {
          'tag-1': tag1,
          TODAY: todayTag,
        },
      },
      [PROJECT_FEATURE_NAME]: {
        ids: ['project-1', 'project-2'],
        entities: {
          'project-1': project1,
          'project-2': project2,
        },
      },
      [plannerFeatureKey]: {
        days: {},
        addPlannedTasksDialogLastShown: undefined,
      },
    } as Partial<RootState> as RootState;
  };

  const createApplyShortSyntaxAction = (entityId: string): PersistentAction => ({
    type: '[Task Shared] Apply Short Syntax',
    task: createMockTask({ id: entityId }),
    taskChanges: {},
    meta: {
      isPersistent: true,
      entityType: 'TASK' as EntityType,
      entityId,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  });

  const createDeleteTaskAction = (entityId: string): PersistentAction => ({
    type: '[TaskShared] Delete Task',
    meta: {
      isPersistent: true,
      entityType: 'TASK' as EntityType,
      entityId,
      opType: OpType.Delete,
    } satisfies PersistentActionMeta,
  });

  const createTransferTaskAction = (entityId: string): PersistentAction => ({
    type: '[Planner] Transfer Task',
    meta: {
      isPersistent: true,
      entityType: 'TASK' as EntityType,
      entityId,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  });

  beforeEach(() => {
    service = new StateChangeCaptureService();
  });

  describe('applyShortSyntax multi-entity atomicity', () => {
    it('should capture TASK, TAG, PROJECT, and PLANNER changes when all are affected', () => {
      const beforeState = createBaseState();
      const todayStr = new Date().toISOString().split('T')[0];

      // Simulate state after applyShortSyntax:
      // - task moved from project-1 to project-2
      // - task scheduled for today (added to TODAY tag)
      // - task title changed
      const afterState: RootState = {
        ...beforeState,
        [TASK_FEATURE_NAME]: {
          ...beforeState[TASK_FEATURE_NAME],
          entities: {
            ...beforeState[TASK_FEATURE_NAME].entities,
            'task-1': {
              ...beforeState[TASK_FEATURE_NAME].entities['task-1'],
              title: 'Updated Title',
              projectId: 'project-2',
              tagIds: ['TODAY'],
              dueDay: todayStr,
            } as Task,
          },
        },
        [TAG_FEATURE_NAME]: {
          ...beforeState[TAG_FEATURE_NAME],
          entities: {
            ...beforeState[TAG_FEATURE_NAME].entities,
            TODAY: {
              ...beforeState[TAG_FEATURE_NAME].entities.TODAY,
              taskIds: ['task-1'],
            } as Tag,
          },
        },
        [PROJECT_FEATURE_NAME]: {
          ...beforeState[PROJECT_FEATURE_NAME],
          entities: {
            ...beforeState[PROJECT_FEATURE_NAME].entities,
            'project-1': {
              ...beforeState[PROJECT_FEATURE_NAME].entities['project-1'],
              taskIds: ['task-2'], // task-1 removed
            } as Project,
            'project-2': {
              ...beforeState[PROJECT_FEATURE_NAME].entities['project-2'],
              taskIds: ['task-1'], // task-1 added
            } as Project,
          },
        },
      } as RootState;

      const action = createApplyShortSyntaxAction('task-1');
      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      // Verify changes captured across all entity types
      const taskChange = changes.find(
        (c) => c.entityType === 'TASK' && c.entityId === 'task-1',
      );
      const tagChange = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'TODAY',
      );
      const project1Change = changes.find(
        (c) => c.entityType === 'PROJECT' && c.entityId === 'project-1',
      );
      const project2Change = changes.find(
        (c) => c.entityType === 'PROJECT' && c.entityId === 'project-2',
      );

      expect(taskChange).toBeDefined();
      expect(taskChange!.opType).toBe(OpType.Update);
      expect(taskChange!.changes).toEqual(
        jasmine.objectContaining({
          title: 'Updated Title',
          projectId: 'project-2',
          tagIds: ['TODAY'],
        }),
      );

      expect(tagChange).toBeDefined();
      expect(tagChange!.opType).toBe(OpType.Update);
      expect((tagChange!.changes as any).taskIds).toContain('task-1');

      expect(project1Change).toBeDefined();
      expect(project1Change!.opType).toBe(OpType.Update);
      expect((project1Change!.changes as any).taskIds).not.toContain('task-1');

      expect(project2Change).toBeDefined();
      expect(project2Change!.opType).toBe(OpType.Update);
      expect((project2Change!.changes as any).taskIds).toContain('task-1');
    });

    it('should capture only affected entities when partial changes', () => {
      const beforeState = createBaseState();

      // Only change task title (no project move, no scheduling)
      const afterState: RootState = {
        ...beforeState,
        [TASK_FEATURE_NAME]: {
          ...beforeState[TASK_FEATURE_NAME],
          entities: {
            ...beforeState[TASK_FEATURE_NAME].entities,
            'task-1': {
              ...beforeState[TASK_FEATURE_NAME].entities['task-1'],
              title: 'Just Title Changed',
            } as Task,
          },
        },
      } as RootState;

      const action = createApplyShortSyntaxAction('task-1');
      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      // Should only have task change, no tag/project changes
      expect(changes.length).toBe(1);
      expect(changes[0].entityType).toBe('TASK');
      expect(changes[0].entityId).toBe('task-1');
    });
  });

  describe('deleteTask multi-entity atomicity', () => {
    it('should capture task deletion and tag/project cleanup', () => {
      const beforeState = createBaseState();

      // Delete task-2 which is in tag-1 and project-1
      const afterState: RootState = {
        ...beforeState,
        [TASK_FEATURE_NAME]: {
          ...beforeState[TASK_FEATURE_NAME],
          ids: ['task-1'],
          entities: {
            'task-1': beforeState[TASK_FEATURE_NAME].entities['task-1'],
          },
        },
        [TAG_FEATURE_NAME]: {
          ...beforeState[TAG_FEATURE_NAME],
          entities: {
            ...beforeState[TAG_FEATURE_NAME].entities,
            'tag-1': {
              ...beforeState[TAG_FEATURE_NAME].entities['tag-1'],
              taskIds: [], // task-2 removed
            } as Tag,
          },
        },
        [PROJECT_FEATURE_NAME]: {
          ...beforeState[PROJECT_FEATURE_NAME],
          entities: {
            ...beforeState[PROJECT_FEATURE_NAME].entities,
            'project-1': {
              ...beforeState[PROJECT_FEATURE_NAME].entities['project-1'],
              taskIds: ['task-1'], // task-2 removed
            } as Project,
          },
        },
      } as RootState;

      const action = createDeleteTaskAction('task-2');
      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      // Should have task deletion + tag update + project update
      const taskDeletion = changes.find(
        (c) =>
          c.entityType === 'TASK' &&
          c.entityId === 'task-2' &&
          c.opType === OpType.Delete,
      );
      const tagUpdate = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'tag-1',
      );
      const projectUpdate = changes.find(
        (c) => c.entityType === 'PROJECT' && c.entityId === 'project-1',
      );

      expect(taskDeletion).toBeDefined();
      expect(tagUpdate).toBeDefined();
      expect(tagUpdate!.opType).toBe(OpType.Update);
      expect(projectUpdate).toBeDefined();
      expect(projectUpdate!.opType).toBe(OpType.Update);
    });
  });

  describe('transferTask multi-entity atomicity', () => {
    it('should capture task, tag, and planner changes when transferring to today', () => {
      const beforeState = createBaseState();
      const futureDay = '2099-12-31';

      // Set up task-1 in planner for future day
      const stateWithPlanner: RootState = {
        ...beforeState,
        [plannerFeatureKey]: {
          days: {
            [futureDay]: ['task-1'],
          },
          addPlannedTasksDialogLastShown: undefined,
        },
      } as RootState;

      const todayStr = new Date().toISOString().split('T')[0];

      // Transfer to today: remove from planner, add to TODAY tag
      const afterState: RootState = {
        ...stateWithPlanner,
        [TASK_FEATURE_NAME]: {
          ...stateWithPlanner[TASK_FEATURE_NAME],
          entities: {
            ...stateWithPlanner[TASK_FEATURE_NAME].entities,
            'task-1': {
              ...stateWithPlanner[TASK_FEATURE_NAME].entities['task-1'],
              tagIds: ['TODAY'],
              dueDay: todayStr,
            } as Task,
          },
        },
        [TAG_FEATURE_NAME]: {
          ...stateWithPlanner[TAG_FEATURE_NAME],
          entities: {
            ...stateWithPlanner[TAG_FEATURE_NAME].entities,
            TODAY: {
              ...stateWithPlanner[TAG_FEATURE_NAME].entities.TODAY,
              taskIds: ['task-1'],
            } as Tag,
          },
        },
        [plannerFeatureKey]: {
          days: {
            [futureDay]: [], // task-1 removed
          },
          addPlannedTasksDialogLastShown: undefined,
        },
      } as RootState;

      const action = createTransferTaskAction('task-1');
      service.captureBeforeState(action, stateWithPlanner);
      const changes = service.computeEntityChanges(action, afterState);

      // Should have task update + tag update + planner update
      const taskUpdate = changes.find(
        (c) => c.entityType === 'TASK' && c.entityId === 'task-1',
      );
      const tagUpdate = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'TODAY',
      );
      const plannerUpdate = changes.find((c) => c.entityType === 'PLANNER');

      expect(taskUpdate).toBeDefined();
      expect(taskUpdate!.changes).toEqual(
        jasmine.objectContaining({
          tagIds: ['TODAY'],
          dueDay: todayStr,
        }),
      );

      expect(tagUpdate).toBeDefined();
      expect((tagUpdate!.changes as any).taskIds).toContain('task-1');

      expect(plannerUpdate).toBeDefined();
    });

    it('should capture tag removal when transferring away from today', () => {
      // Set up task-1 in TODAY tag
      const todayTask = createMockTask({
        id: 'task-1',
        projectId: 'project-1',
        tagIds: ['TODAY'],
      });
      const todayTag = createMockTag({
        id: 'TODAY',
        title: 'Today',
        taskIds: ['task-1'],
      });

      const beforeState: RootState = {
        ...createBaseState(),
        [TASK_FEATURE_NAME]: {
          ...(createBaseState() as any)[TASK_FEATURE_NAME],
          entities: {
            ...(createBaseState() as any)[TASK_FEATURE_NAME].entities,
            'task-1': todayTask,
          },
        },
        [TAG_FEATURE_NAME]: {
          ...(createBaseState() as any)[TAG_FEATURE_NAME],
          entities: {
            ...(createBaseState() as any)[TAG_FEATURE_NAME].entities,
            TODAY: todayTag,
          },
        },
      } as RootState;

      const futureDay = '2099-12-31';

      // Transfer away from today to future day
      const afterState: RootState = {
        ...beforeState,
        [TASK_FEATURE_NAME]: {
          ...beforeState[TASK_FEATURE_NAME],
          entities: {
            ...beforeState[TASK_FEATURE_NAME].entities,
            'task-1': {
              ...beforeState[TASK_FEATURE_NAME].entities['task-1'],
              tagIds: [], // TODAY removed
              dueDay: futureDay,
            } as Task,
          },
        },
        [TAG_FEATURE_NAME]: {
          ...beforeState[TAG_FEATURE_NAME],
          entities: {
            ...beforeState[TAG_FEATURE_NAME].entities,
            TODAY: {
              ...beforeState[TAG_FEATURE_NAME].entities.TODAY,
              taskIds: [], // task-1 removed
            } as Tag,
          },
        },
        [plannerFeatureKey]: {
          days: {
            [futureDay]: ['task-1'],
          },
          addPlannedTasksDialogLastShown: undefined,
        },
      } as RootState;

      const action = createTransferTaskAction('task-1');
      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, afterState);

      // Should have task update + tag update + planner update
      const taskUpdate = changes.find(
        (c) => c.entityType === 'TASK' && c.entityId === 'task-1',
      );
      const tagUpdate = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'TODAY',
      );
      const plannerUpdate = changes.find((c) => c.entityType === 'PLANNER');

      expect(taskUpdate).toBeDefined();
      expect((taskUpdate!.changes as any).tagIds).toEqual([]);

      expect(tagUpdate).toBeDefined();
      expect((tagUpdate!.changes as any).taskIds).toEqual([]);

      expect(plannerUpdate).toBeDefined();
    });
  });

  describe('board-style bidirectional consistency', () => {
    it('should detect inconsistency when only tag.taskIds is updated', () => {
      const beforeState = createBaseState();

      // Intentionally create an inconsistent state:
      // tag.taskIds updated but task.tagIds NOT updated
      const inconsistentAfterState: RootState = {
        ...beforeState,
        [TAG_FEATURE_NAME]: {
          ...beforeState[TAG_FEATURE_NAME],
          entities: {
            ...beforeState[TAG_FEATURE_NAME].entities,
            TODAY: {
              ...beforeState[TAG_FEATURE_NAME].entities.TODAY,
              taskIds: ['task-1'], // Added task-1
            } as Tag,
          },
        },
        // task-1.tagIds is NOT updated to include TODAY
      } as RootState;

      const action = createApplyShortSyntaxAction('task-1');
      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, inconsistentAfterState);

      // Should capture the tag change but NOT a corresponding task change
      const tagChange = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'TODAY',
      );
      const taskChange = changes.find(
        (c) => c.entityType === 'TASK' && c.entityId === 'task-1',
      );

      expect(tagChange).toBeDefined();
      // This demonstrates what a non-atomic update would look like
      // In proper atomic updates, both would be present
      expect(taskChange).toBeUndefined();
    });

    it('should capture both sides when atomically updating tag-task relationship', () => {
      const beforeState = createBaseState();

      // Properly atomic state update: both sides updated
      const consistentAfterState: RootState = {
        ...beforeState,
        [TASK_FEATURE_NAME]: {
          ...beforeState[TASK_FEATURE_NAME],
          entities: {
            ...beforeState[TASK_FEATURE_NAME].entities,
            'task-1': {
              ...beforeState[TASK_FEATURE_NAME].entities['task-1'],
              tagIds: ['TODAY'], // task side updated
            } as Task,
          },
        },
        [TAG_FEATURE_NAME]: {
          ...beforeState[TAG_FEATURE_NAME],
          entities: {
            ...beforeState[TAG_FEATURE_NAME].entities,
            TODAY: {
              ...beforeState[TAG_FEATURE_NAME].entities.TODAY,
              taskIds: ['task-1'], // tag side updated
            } as Tag,
          },
        },
      } as RootState;

      const action = createApplyShortSyntaxAction('task-1');
      service.captureBeforeState(action, beforeState);
      const changes = service.computeEntityChanges(action, consistentAfterState);

      // Both sides should be captured
      const tagChange = changes.find(
        (c) => c.entityType === 'TAG' && c.entityId === 'TODAY',
      );
      const taskChange = changes.find(
        (c) => c.entityType === 'TASK' && c.entityId === 'task-1',
      );

      expect(tagChange).toBeDefined();
      expect(taskChange).toBeDefined();
      expect((tagChange!.changes as any).taskIds).toContain('task-1');
      expect((taskChange!.changes as any).tagIds).toContain('TODAY');
    });
  });
});
