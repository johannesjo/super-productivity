import { initialTagState, tagReducer } from './tag.reducer';
import { Tag } from '../tag.model';
import { addTag } from './tag.actions';
import { TODAY_TAG } from '../tag.const';
import { PlannerActions } from '../../planner/store/planner.actions';
import { DEFAULT_TASK } from '../../tasks/task.model';
import * as getDbDateStrUtil from '../../../util/get-db-date-str';

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
});
