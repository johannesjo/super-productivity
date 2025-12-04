import { initialTagState, tagReducer } from './tag.reducer';
import { Tag } from '../tag.model';
import { addTag } from './tag.actions';
import { DEFAULT_TAG, TODAY_TAG } from '../tag.const';
import { PlannerActions } from '../../planner/store/planner.actions';
import { DEFAULT_TASK } from '../../tasks/task.model';
import * as getDbDateStrUtil from '../../../util/get-db-date-str';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';

/* eslint-disable @typescript-eslint/naming-convention */

describe('TagReducer', () => {
  describe('standard', () => {
    let initialState;

    beforeEach(() => {
      initialState = {
        ...initialTagState,
        entities: {
          '1': {
            id: '1',
            title: 'Test Tag',
            taskIds: ['task1', 'task2'],
          } as Tag,
          [TODAY_TAG.id]: TODAY_TAG,
        },
      };
    });

    it('should handle addTag action', () => {
      const newTag: Tag = {
        id: '2',
        title: 'New Tag',
        taskIds: [],
      } as any as Tag;
      const action = addTag({ tag: newTag });
      const state = tagReducer(initialState, action);

      expect(state.entities['2']).toEqual(newTag);
    });
  });

  describe('planTaskForDay', () => {
    it('should add new task to today tag when planning for today', () => {
      const todayStr = getDbDateStrUtil.getDbDateStr();
      const initialState = {
        ...initialTagState,
        entities: {
          ...initialTagState.entities,
          [TODAY_TAG.id]: {
            ...TODAY_TAG,
            taskIds: ['task1', 'task2'],
          },
        },
      };

      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task3', projectId: 'test', subTaskIds: [] },
        day: todayStr,
        isAddToTop: false,
      });

      const result = tagReducer(initialState, action);
      expect((result.entities[TODAY_TAG.id] as Tag).taskIds).toEqual([
        'task1',
        'task2',
        'task3',
      ]);
    });

    it('should add task to top of today tag when isAddToTop is true', () => {
      const todayStr = getDbDateStrUtil.getDbDateStr();
      const initialState = {
        ...initialTagState,
        entities: {
          ...initialTagState.entities,
          [TODAY_TAG.id]: {
            ...TODAY_TAG,
            taskIds: ['task1', 'task2'],
          },
        },
      };

      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task3', projectId: 'test', subTaskIds: [] },
        day: todayStr,
        isAddToTop: true,
      });

      const result = tagReducer(initialState, action);
      expect((result.entities[TODAY_TAG.id] as Tag).taskIds).toEqual([
        'task3',
        'task1',
        'task2',
      ]);
    });

    it('should handle reordering existing task within today tag', () => {
      const todayStr = getDbDateStrUtil.getDbDateStr();
      const initialState = {
        ...initialTagState,
        entities: {
          ...initialTagState.entities,
          [TODAY_TAG.id]: {
            ...TODAY_TAG,
            taskIds: ['task1', 'task2', 'task3'],
          },
        },
      };

      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: todayStr,
        isAddToTop: false, // move to end
      });

      const result = tagReducer(initialState, action);
      expect((result.entities[TODAY_TAG.id] as Tag).taskIds).toEqual([
        'task2',
        'task3',
        'task1',
      ]);
    });

    it('should remove task from today tag when planning for future day', () => {
      const initialState = {
        ...initialTagState,
        entities: {
          ...initialTagState.entities,
          [TODAY_TAG.id]: {
            ...TODAY_TAG,
            taskIds: ['task1', 'task2', 'task3'],
          },
        },
      };

      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task2', projectId: 'test', subTaskIds: [] },
        day: '2024-01-16', // future day
        isAddToTop: false,
      });

      const result = tagReducer(initialState, action);
      expect((result.entities[TODAY_TAG.id] as Tag).taskIds).toEqual(['task1', 'task3']);
    });

    it('should not modify state when planning for future day with task not in today', () => {
      const initialState = {
        ...initialTagState,
        entities: {
          ...initialTagState.entities,
          [TODAY_TAG.id]: {
            ...TODAY_TAG,
            taskIds: ['task1', 'task2'],
          },
        },
      };

      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task3', projectId: 'test', subTaskIds: [] },
        day: '2024-01-16', // future day
        isAddToTop: false,
      });

      const result = tagReducer(initialState, action);
      expect(result).toBe(initialState);
    });

    it('should not duplicate task when already in today list', () => {
      const todayStr = getDbDateStrUtil.getDbDateStr();
      const initialState = {
        ...initialTagState,
        entities: {
          ...initialTagState.entities,
          [TODAY_TAG.id]: {
            ...TODAY_TAG,
            taskIds: ['task1', 'task2'],
          },
        },
      };

      const action = PlannerActions.planTaskForDay({
        task: { ...DEFAULT_TASK, id: 'task1', projectId: 'test', subTaskIds: [] },
        day: todayStr,
        isAddToTop: false,
      });

      const result = tagReducer(initialState, action);
      const taskIds = (result.entities[TODAY_TAG.id] as Tag).taskIds;
      expect(taskIds).toEqual(['task2', 'task1']);
      expect(taskIds.filter((id) => id === 'task1').length).toBe(1);
    });
  });

  describe('addTagToTask', () => {
    const createMockTag = (id: string, title: string = `Tag ${id}`): Tag => ({
      ...DEFAULT_TAG,
      id,
      title,
      taskIds: [],
    });

    it('should add a new tag when it does not exist', () => {
      const initialState = {
        ...initialTagState,
        entities: {
          [TODAY_TAG.id]: TODAY_TAG,
        },
        ids: [TODAY_TAG.id],
      };

      const newTag = createMockTag('new-tag', 'New Tag');
      const result = tagReducer(
        initialState,
        TaskSharedActions.addTagToTask({ tag: newTag, taskId: 'task-1' }),
      );

      expect(result.entities['new-tag']).toEqual(newTag);
      expect(result.ids).toContain('new-tag');
    });

    it('should not add duplicate tag when it already exists', () => {
      const existingTag = createMockTag('existing-tag', 'Existing Tag');
      const initialState = {
        ...initialTagState,
        entities: {
          [TODAY_TAG.id]: TODAY_TAG,
          'existing-tag': existingTag,
        },
        ids: [TODAY_TAG.id, 'existing-tag'],
      };

      const tagWithSameId = createMockTag('existing-tag', 'Different Title');
      const result = tagReducer(
        initialState,
        TaskSharedActions.addTagToTask({ tag: tagWithSameId, taskId: 'task-1' }),
      );

      expect(result).toBe(initialState);
      expect(result!.entities['existing-tag']!.title).toBe('Existing Tag');
    });

    it('should return same state reference when tag exists', () => {
      const existingTag = createMockTag('existing-tag');
      const initialState = {
        ...initialTagState,
        entities: {
          [TODAY_TAG.id]: TODAY_TAG,
          'existing-tag': existingTag,
        },
        ids: [TODAY_TAG.id, 'existing-tag'],
      };

      const result = tagReducer(
        initialState,
        TaskSharedActions.addTagToTask({ tag: existingTag, taskId: 'task-1' }),
      );

      expect(result).toBe(initialState);
    });

    it('should add tag to empty state (except TODAY_TAG)', () => {
      const newTag = createMockTag('first-tag', 'First Tag');
      const result = tagReducer(
        initialTagState,
        TaskSharedActions.addTagToTask({ tag: newTag, taskId: 'task-1' }),
      );

      expect(result.entities['first-tag']).toEqual(newTag);
      expect(result.ids).toContain('first-tag');
      expect(result.ids).toContain(TODAY_TAG.id);
    });
  });
});
