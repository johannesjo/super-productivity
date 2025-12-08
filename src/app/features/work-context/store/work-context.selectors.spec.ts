import { TODAY_TAG } from '../../tag/tag.const';
import { fakeEntityStateFromArray } from '../../../util/fake-entity-state-from-array';
import {
  selectActiveWorkContext,
  selectStartableTasksForActiveContext,
  selectTimelineTasks,
  selectTodayTaskIds,
  selectTrackableTasksForActiveContext,
  selectUndoneTodayTaskIds,
} from './work-context.selectors';
import { WorkContext, WorkContextType } from '../work-context.model';
import { TaskCopy } from '../../tasks/task.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

/**
 * Tests for work-context selectors.
 *
 * IMPORTANT: TODAY_TAG is a "virtual tag" - membership is determined by task.dueDay,
 * NOT by task.tagIds. TODAY_TAG.taskIds only stores ordering.
 * See: docs/ai/today-tag-architecture.md
 */
describe('workContext selectors', () => {
  // Get today's date string for tests
  const todayStr = getDbDateStr();

  describe('selectActiveWorkContext', () => {
    it('should select today tag', () => {
      const result = selectActiveWorkContext.projector(
        {
          activeId: TODAY_TAG.id,
          activeType: WorkContextType.TAG,
        } as any,
        // } as Partial<WorkContextCopy> as WorkContextCopy,
        fakeEntityStateFromArray([]),
        fakeEntityStateFromArray([TODAY_TAG]),
        fakeEntityStateFromArray([]) as any, // taskState - no tasks
        [],
      );
      expect(result).toEqual(
        jasmine.objectContaining({
          advancedCfg: {
            worklogExportSettings: {
              cols: ['DATE', 'START', 'END', 'TIME_CLOCK', 'TITLES_INCLUDING_SUB'],
              groupBy: 'DATE',
              roundEndTimeTo: null,
              roundStartTimeTo: null,
              roundWorkTimeTo: null,
              separateTasksBy: ' | ',
            },
          },
          // breakNr: {},
          // breakTime: {},
          color: null,
          // created: 1620997370531,
          icon: 'wb_sunny',
          id: 'TODAY',
          // modified: 1620997370531,
          routerLink: 'tag/TODAY',
          taskIds: [],
          theme: TODAY_TAG.theme,
          title: 'Today',
          type: 'TAG',
          // workEnd: {},
          // workStart: {},
        }),
      );
    });

    it('should use dueDay for TODAY_TAG membership (virtual tag pattern)', () => {
      // TODAY_TAG uses dueDay for membership, not tagIds
      const task1 = {
        id: 'task1',
        tagIds: [], // TODAY_TAG should NOT be in tagIds
        dueDay: todayStr, // This determines TODAY membership
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const task2 = {
        id: 'task2',
        tagIds: [], // TODAY_TAG should NOT be in tagIds
        dueDay: todayStr, // This determines TODAY membership
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const taskNotForToday = {
        id: 'task3',
        tagIds: [],
        dueDay: '2000-01-01', // Not today
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;

      // Tag has stale taskIds including task3 which doesn't have dueDay === today
      const todayTagWithStaleIds = {
        ...TODAY_TAG,
        taskIds: ['task3', 'task1'], // task3 is stale (wrong dueDay), task2 is missing
      };

      const result = selectActiveWorkContext.projector(
        {
          activeId: TODAY_TAG.id,
          activeType: WorkContextType.TAG,
        } as any,
        fakeEntityStateFromArray([]),
        fakeEntityStateFromArray([todayTagWithStaleIds]),
        fakeEntityStateFromArray([task1, task2, taskNotForToday]) as any,
        [],
      );

      // Should filter out task3 (stale) and auto-add task2 (missing from order)
      expect(result.taskIds).toEqual(['task1', 'task2']);
    });
  });
  describe('selectTrackableTasksForActiveContext', () => {
    it('should select tasks for project', () => {
      const M1 = {
        id: 'M1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const M2 = {
        id: 'M2',
        subTaskIds: [],
        tagIds: [],
        dueDay: todayStr,
        dueWithTime: 1234,
        reminderId: 'asd',
      } as Partial<TaskCopy> as TaskCopy;
      const ctx: Partial<WorkContext> = {
        id: TODAY_TAG.id,
        taskIds: [M1.id, M2.id],
      };
      const result = selectTrackableTasksForActiveContext.projector(
        ctx as WorkContext,
        fakeEntityStateFromArray([M2, M1]).entities,
      );
      expect(result).toEqual([
        { id: 'M1', subTaskIds: [], tagIds: [], dueDay: todayStr },
        {
          id: 'M2',
          dueWithTime: 1234,
          reminderId: 'asd',
          subTaskIds: [],
          tagIds: [],
          dueDay: todayStr,
        },
      ] as any[]);
    });
  });

  describe('selectStartableTasksForActiveContext', () => {
    it('should select tasks for project', () => {
      const M1 = {
        id: 'M1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: true,
      } as Partial<TaskCopy> as TaskCopy;
      const M2 = {
        id: 'M2',
        subTaskIds: [],
        tagIds: [],
        dueDay: todayStr,
        dueWithTime: 1234,
      } as Partial<TaskCopy> as TaskCopy;

      const result = selectStartableTasksForActiveContext.projector([M1, M2]);
      expect(result).toEqual([
        {
          id: 'M2',
          dueWithTime: 1234,
          subTaskIds: [],
          tagIds: [],
          dueDay: todayStr,
        },
      ] as Partial<TaskCopy>[] as TaskCopy[]);
    });
  });

  describe('selectTimelineTasks', () => {
    it('should not show done tasks', () => {
      const P = {
        id: 'P',
        subTaskIds: ['SUB1', 'SUB_S'],
        tagIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const SUB1 = {
        id: 'SUB1',
        subTaskIds: [],
        tagIds: [],
        parentId: P.id,
        isDone: true,
      } as Partial<TaskCopy> as TaskCopy;
      const SUB_S = {
        id: 'SUB_S',
        dueWithTime: 1234,
        reminderId: 'HA',
        parentId: P.id,
        subTaskIds: [],
        tagIds: [],
        isDone: true,
      } as Partial<TaskCopy> as TaskCopy;

      const taskState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector([SUB1.id, SUB_S.id], taskState);
      expect(result).toEqual({
        unPlanned: [],
        planned: [],
      } as any);
    });
  });

  describe('selectTodayTaskIds (virtual tag pattern - uses dueDay)', () => {
    it('should return empty array when no tasks have dueDay === today', () => {
      const tagState = fakeEntityStateFromArray([TODAY_TAG]);
      const taskState = fakeEntityStateFromArray([]) as any;

      const result = selectTodayTaskIds.projector(tagState, taskState);
      expect(result).toEqual([]);
    });

    it('should return tasks in stored order when all tasks have dueDay === today', () => {
      // TODAY_TAG membership is determined by dueDay, not tagIds
      const task1 = {
        id: 'task1',
        tagIds: [], // TODAY_TAG should NOT be in tagIds
        dueDay: todayStr,
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const task2 = {
        id: 'task2',
        tagIds: [], // TODAY_TAG should NOT be in tagIds
        dueDay: todayStr,
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;

      const todayTagWithTasks = {
        ...TODAY_TAG,
        taskIds: ['task1', 'task2'],
      };

      const tagState = fakeEntityStateFromArray([todayTagWithTasks]);
      const taskState = fakeEntityStateFromArray([task1, task2]) as any;

      const result = selectTodayTaskIds.projector(tagState, taskState);
      expect(result).toEqual(['task1', 'task2']);
    });

    it('should filter out stale taskIds (tasks that no longer have dueDay === today)', () => {
      const task1 = {
        id: 'task1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const task2 = {
        id: 'task2',
        tagIds: [],
        dueDay: '2000-01-01', // No longer today
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;

      const todayTagWithStaleIds = {
        ...TODAY_TAG,
        taskIds: ['task1', 'task2'], // task2 is stale
      };

      const tagState = fakeEntityStateFromArray([todayTagWithStaleIds]);
      const taskState = fakeEntityStateFromArray([task1, task2]) as any;

      const result = selectTodayTaskIds.projector(tagState, taskState);
      expect(result).toEqual(['task1']);
    });

    it('should auto-add tasks with dueDay === today but not in stored order', () => {
      const task1 = {
        id: 'task1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;
      const task2 = {
        id: 'task2',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
      } as Partial<TaskCopy> as TaskCopy;

      const todayTagMissingTask2 = {
        ...TODAY_TAG,
        taskIds: ['task1'], // task2 missing from order
      };

      const tagState = fakeEntityStateFromArray([todayTagMissingTask2]);
      const taskState = fakeEntityStateFromArray([task1, task2]) as any;

      const result = selectTodayTaskIds.projector(tagState, taskState);
      expect(result).toEqual(['task1', 'task2']);
    });

    it('should exclude subtasks', () => {
      const parentTask = {
        id: 'parent',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: ['subtask1'],
      } as Partial<TaskCopy> as TaskCopy;
      const subtask = {
        id: 'subtask1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        parentId: 'parent',
      } as Partial<TaskCopy> as TaskCopy;

      const todayTagWithTasks = {
        ...TODAY_TAG,
        taskIds: ['parent', 'subtask1'],
      };

      const tagState = fakeEntityStateFromArray([todayTagWithTasks]);
      const taskState = fakeEntityStateFromArray([parentTask, subtask]) as any;

      const result = selectTodayTaskIds.projector(tagState, taskState);
      expect(result).toEqual(['parent']); // subtask excluded
    });
  });

  describe('selectUndoneTodayTaskIds', () => {
    it('should filter out done tasks', () => {
      const task1 = {
        id: 'task1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: false,
      } as Partial<TaskCopy> as TaskCopy;
      const task2 = {
        id: 'task2',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: true,
      } as Partial<TaskCopy> as TaskCopy;
      const task3 = {
        id: 'task3',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: false,
      } as Partial<TaskCopy> as TaskCopy;

      const taskState = fakeEntityStateFromArray([task1, task2, task3]) as any;

      // selectUndoneTodayTaskIds takes todayTaskIds and taskState
      const result = selectUndoneTodayTaskIds.projector(
        ['task1', 'task2', 'task3'],
        taskState,
      );
      expect(result).toEqual(['task1', 'task3']);
    });

    it('should return empty array when all tasks are done', () => {
      const task1 = {
        id: 'task1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: true,
      } as Partial<TaskCopy> as TaskCopy;
      const task2 = {
        id: 'task2',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: true,
      } as Partial<TaskCopy> as TaskCopy;

      const taskState = fakeEntityStateFromArray([task1, task2]) as any;

      const result = selectUndoneTodayTaskIds.projector(['task1', 'task2'], taskState);
      expect(result).toEqual([]);
    });

    it('should handle tasks that do not exist in taskState', () => {
      const task1 = {
        id: 'task1',
        tagIds: [],
        dueDay: todayStr,
        subTaskIds: [],
        isDone: false,
      } as Partial<TaskCopy> as TaskCopy;

      const taskState = fakeEntityStateFromArray([task1]) as any;

      // task2 doesn't exist in taskState (may have been deleted)
      const result = selectUndoneTodayTaskIds.projector(['task1', 'task2'], taskState);
      // task2 is filtered out because taskState.entities[task2]?.isDone is undefined (falsy but not false)
      expect(result).toEqual(['task1']);
    });
  });
});
