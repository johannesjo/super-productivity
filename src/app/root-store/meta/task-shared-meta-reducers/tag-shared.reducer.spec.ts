/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/naming-convention */
import { tagSharedMetaReducer } from './tag-shared.reducer';
import { TaskSharedActions } from '../task-shared.actions';
import { RootState } from '../../root-state';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../../features/tag/store/tag.reducer';
import { Action, ActionReducer } from '@ngrx/store';
import {
  createBaseState,
  createMockTag,
  createMockTask,
  createStateWithExistingTasks,
  expectStateUpdate,
} from './test-utils';
import { updateTag } from '../../../features/tag/store/tag.actions';
import { TODAY_TAG } from '../../../features/tag/tag.const';

describe('tagSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<any, Action>;
  let baseState: RootState;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = tagSharedMetaReducer(mockReducer);
    baseState = createBaseState();
  });

  describe('removeTagsForAllTasks action', () => {
    it('should remove specified tags from all tasks', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2'],
        [],
        ['task1', 'task2', 'task3'],
        [],
      );

      // Add another tag to task1 and task3
      testState[TAG_FEATURE_NAME].entities.tag2 = createMockTag({
        id: 'tag2',
        title: 'Tag 2',
        taskIds: ['task1', 'task3'],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]) = [
        ...(testState[TAG_FEATURE_NAME].ids as string[]),
        'tag2',
      ];

      // Update tasks to have multiple tags
      testState[TASK_FEATURE_NAME].entities.task1 = createMockTask({
        id: 'task1',
        tagIds: ['tag1', 'tag2'],
        projectId: 'project1',
      });
      testState[TASK_FEATURE_NAME].entities.task3 = createMockTask({
        id: 'task3',
        tagIds: ['tag1', 'tag2'],
        projectId: undefined,
      });

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: ['tag2'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                tagIds: ['tag1'],
              }),
              task2: jasmine.objectContaining({
                tagIds: ['tag1'],
              }),
              task3: jasmine.objectContaining({
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

    it('should remove multiple tags from all tasks', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1'], []);

      // Add more tags
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

      // Update task to have multiple tags
      testState[TASK_FEATURE_NAME].entities.task1 = createMockTask({
        id: 'task1',
        tagIds: ['tag1', 'tag2', 'tag3'],
        projectId: 'project1',
      });

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: ['tag2', 'tag3'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
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

    it('should handle removing tags from tasks with no tags', () => {
      const testState = createStateWithExistingTasks(['task1', 'task2'], [], [], []);

      // task1 has no tags
      testState[TASK_FEATURE_NAME].entities.task1 = createMockTask({
        id: 'task1',
        tagIds: [],
        projectId: 'project1',
      });
      // task2 has tag1
      testState[TASK_FEATURE_NAME].entities.task2 = createMockTask({
        id: 'task2',
        tagIds: ['tag1'],
        projectId: 'project1',
      });

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: ['tag1'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                tagIds: [],
              }),
              task2: jasmine.objectContaining({
                tagIds: [],
              }),
            }),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle empty tagIdsToRemove array', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1'], []);

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: [],
      });

      // State should remain unchanged
      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
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

    it('should only update tasks that have the tags being removed', () => {
      const testState = createStateWithExistingTasks(
        ['task1', 'task2', 'task3'],
        [],
        ['task1', 'task3'],
        [],
      );

      // task2 doesn't have any tags
      testState[TASK_FEATURE_NAME].entities.task2 = createMockTask({
        id: 'task2',
        tagIds: [],
        projectId: 'project1',
      });

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: ['tag1'],
      });

      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
                tagIds: [],
              }),
              task2: jasmine.objectContaining({
                tagIds: [], // Should remain empty
              }),
              task3: jasmine.objectContaining({
                tagIds: [],
              }),
            }),
          }),
        },
        action,
        mockReducer,
        testState,
      );
    });

    it('should handle removing non-existent tags', () => {
      const testState = createStateWithExistingTasks(['task1'], [], ['task1'], []);

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: ['non-existent-tag'],
      });

      // Task should keep its existing tags
      metaReducer(testState, action);
      expectStateUpdate(
        {
          [TASK_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              task1: jasmine.objectContaining({
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

    it('should handle tasks with null or undefined tagIds', () => {
      const testState = createStateWithExistingTasks(['task1', 'task2'], [], [], []);

      // task1 has null tagIds
      testState[TASK_FEATURE_NAME].entities.task1 = createMockTask({
        id: 'task1',
        tagIds: null as any,
        projectId: 'project1',
      });
      // task2 has undefined tagIds
      testState[TASK_FEATURE_NAME].entities.task2 = createMockTask({
        id: 'task2',
        tagIds: undefined as any,
        projectId: 'project1',
      });

      const action = TaskSharedActions.removeTagsForAllTasks({
        tagIdsToRemove: ['tag1'],
      });

      // Should not crash and tasks should remain unchanged
      metaReducer(testState, action);
      expect(mockReducer).toHaveBeenCalled();
    });
  });

  describe('other actions', () => {
    it('should pass through other actions to the reducer', () => {
      const action = { type: 'SOME_OTHER_ACTION' };
      metaReducer(baseState, action);

      expect(mockReducer).toHaveBeenCalledWith(baseState, action);
    });
  });

  describe('updateTag action handling', () => {
    // Note: The reducer no longer filters taskIds - it just logs a warning.
    // This is intentional: DependencyResolverService ensures proper ordering,
    // and the UI handles missing task references gracefully.
    // Filtering was causing data loss during sync when tasks arrived after tags.

    it('should pass through updateTag with non-existent taskIds unchanged', () => {
      const testState = createStateWithExistingTasks(
        ['existing-task-1', 'existing-task-2'],
        [],
        [],
        [],
      );

      // Add Today tag to state
      testState[TAG_FEATURE_NAME].entities[TODAY_TAG.id] = createMockTag({
        id: TODAY_TAG.id,
        title: 'Today',
        taskIds: [],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]).push(TODAY_TAG.id);

      // Update Tag with taskIds that include non-existent ones
      const action = updateTag({
        tag: {
          id: TODAY_TAG.id,
          changes: {
            taskIds: ['existing-task-1', 'non-existent-task', 'existing-task-2'],
          },
        },
      });

      metaReducer(testState, action);

      // The action should be passed through unchanged (no filtering)
      expect(mockReducer).toHaveBeenCalled();
      const passedAction = mockReducer.calls.mostRecent().args[1];
      expect(passedAction.tag.changes.taskIds).toEqual([
        'existing-task-1',
        'non-existent-task',
        'existing-task-2',
      ]);
    });

    it('should pass through updateTag when all taskIds exist', () => {
      const testState = createStateWithExistingTasks(
        ['task-1', 'task-2', 'task-3'],
        [],
        [],
        [],
      );

      testState[TAG_FEATURE_NAME].entities[TODAY_TAG.id] = createMockTag({
        id: TODAY_TAG.id,
        title: 'Today',
        taskIds: [],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]).push(TODAY_TAG.id);

      const action = updateTag({
        tag: {
          id: TODAY_TAG.id,
          changes: {
            taskIds: ['task-1', 'task-2', 'task-3'],
          },
        },
      });

      metaReducer(testState, action);

      const passedAction = mockReducer.calls.mostRecent().args[1];
      expect(passedAction.tag.changes.taskIds).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('should pass through updateTag when no taskIds in changes', () => {
      const testState = createBaseState();

      testState[TAG_FEATURE_NAME].entities['tag-1'] = createMockTag({
        id: 'tag-1',
        title: 'My Tag',
        taskIds: ['task-1'],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]).push('tag-1');

      // Update tag without taskIds
      const action = updateTag({
        tag: {
          id: 'tag-1',
          changes: {
            title: 'Updated Title',
          },
        },
      });

      metaReducer(testState, action);

      const passedAction = mockReducer.calls.mostRecent().args[1];
      expect(passedAction.tag.changes.title).toBe('Updated Title');
      expect(passedAction.tag.changes.taskIds).toBeUndefined();
    });

    it('should pass through updateTag with all non-existent taskIds unchanged', () => {
      const testState = createBaseState();

      testState[TAG_FEATURE_NAME].entities[TODAY_TAG.id] = createMockTag({
        id: TODAY_TAG.id,
        title: 'Today',
        taskIds: [],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]).push(TODAY_TAG.id);

      const action = updateTag({
        tag: {
          id: TODAY_TAG.id,
          changes: {
            taskIds: ['non-existent-1', 'non-existent-2', 'non-existent-3'],
          },
        },
      });

      metaReducer(testState, action);

      // Action should be passed through unchanged
      const passedAction = mockReducer.calls.mostRecent().args[1];
      expect(passedAction.tag.changes.taskIds).toEqual([
        'non-existent-1',
        'non-existent-2',
        'non-existent-3',
      ]);
    });

    it('should preserve all changes when passing through action', () => {
      const testState = createStateWithExistingTasks(['existing-task'], [], [], []);

      testState[TAG_FEATURE_NAME].entities['my-tag'] = createMockTag({
        id: 'my-tag',
        title: 'Old Title',
        taskIds: [],
        color: '#000000',
      });
      (testState[TAG_FEATURE_NAME].ids as string[]).push('my-tag');

      const action = updateTag({
        tag: {
          id: 'my-tag',
          changes: {
            title: 'New Title',
            color: '#ff0000',
            taskIds: ['existing-task', 'non-existent-task'],
          },
        },
      });

      metaReducer(testState, action);

      const passedAction = mockReducer.calls.mostRecent().args[1];
      expect(passedAction.tag.changes.title).toBe('New Title');
      expect(passedAction.tag.changes.color).toBe('#ff0000');
      // All taskIds are preserved (no filtering)
      expect(passedAction.tag.changes.taskIds).toEqual([
        'existing-task',
        'non-existent-task',
      ]);
    });

    it('should preserve meta property on action', () => {
      const testState = createStateWithExistingTasks(['existing-task'], [], [], []);

      testState[TAG_FEATURE_NAME].entities[TODAY_TAG.id] = createMockTag({
        id: TODAY_TAG.id,
        title: 'Today',
        taskIds: [],
      });
      (testState[TAG_FEATURE_NAME].ids as string[]).push(TODAY_TAG.id);

      const action = updateTag({
        tag: {
          id: TODAY_TAG.id,
          changes: {
            taskIds: ['existing-task', 'non-existent-task'],
          },
        },
      });

      metaReducer(testState, action);

      const passedAction = mockReducer.calls.mostRecent().args[1];
      expect(passedAction.meta).toBeDefined();
      expect(passedAction.meta.isPersistent).toBe(true);
      expect(passedAction.meta.entityType).toBe('TAG');
      expect(passedAction.meta.entityId).toBe(TODAY_TAG.id);
    });
  });
});
