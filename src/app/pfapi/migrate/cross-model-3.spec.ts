import { crossModelMigration3 } from './cross-model-3';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { getDbDateStr } from '../../util/get-db-date-str';
import { AppDataCompleteNew } from '../pfapi-config';

describe('crossModelMigration3() - TODAY_TAG dueDay handling', () => {
  const createMinimalData = (overrides: any = {}): any => ({
    planner: { days: {} },
    task: { ids: [], entities: {} },
    tag: {
      ids: [TODAY_TAG.id],
      entities: {
        [TODAY_TAG.id]: {
          id: TODAY_TAG.id,
          taskIds: [],
          ...overrides.todayTag,
        },
      },
    },
    project: {
      ids: [INBOX_PROJECT.id],
      entities: {
        [INBOX_PROJECT.id]: { ...INBOX_PROJECT },
      },
    },
    note: { ids: [], entities: {} },
    globalConfig: {},
    taskRepeatCfg: { ids: [], entities: {} },
    issueProvider: null,
    archiveYoung: { task: { ids: [], entities: {} } },
    archiveOld: { task: { ids: [], entities: {} } },
    ...overrides,
  });

  describe('tasks in TODAY_TAG.taskIds without dueDay', () => {
    it('should set dueDay when task has dueWithTime for today', () => {
      const now = Date.now();
      const todayStr = getDbDateStr();

      const data = createMinimalData({
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              tagIds: [],
              dueWithTime: now, // Today's timestamp
              // dueDay is missing
            },
          },
        },
        todayTag: {
          taskIds: ['TASK1'],
        },
      });

      const result = crossModelMigration3(data) as AppDataCompleteNew;

      expect(result.task.entities['TASK1']?.dueDay).toBe(todayStr);
      expect(result.tag.entities[TODAY_TAG.id]?.taskIds).toContain('TASK1');
    });

    it('should set dueDay when task has past dueWithTime same day (overdue time)', () => {
      // This is the bug scenario from issue #5841
      // Task is scheduled for 8 AM today but it's now 10 AM
      const todayAt8AM = new Date();
      todayAt8AM.setHours(8, 0, 0, 0);
      const todayStr = getDbDateStr();

      const data = createMinimalData({
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              tagIds: [],
              dueWithTime: todayAt8AM.getTime(), // Past time today
              // dueDay is missing
            },
          },
        },
        todayTag: {
          taskIds: ['TASK1'],
        },
      });

      const result = crossModelMigration3(data) as AppDataCompleteNew;

      expect(result.task.entities['TASK1']?.dueDay).toBe(todayStr);
      expect(result.tag.entities[TODAY_TAG.id]?.taskIds).toContain('TASK1');
    });

    it('should remove task from TODAY_TAG when dueWithTime is NOT today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data = createMinimalData({
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              tagIds: [],
              dueWithTime: yesterday.getTime(), // Yesterday
              // dueDay is missing
            },
          },
        },
        todayTag: {
          taskIds: ['TASK1'],
        },
      });

      const result = crossModelMigration3(data) as AppDataCompleteNew;

      expect(result.task.entities['TASK1']?.dueDay).toBeUndefined();
      expect(result.tag.entities[TODAY_TAG.id]?.taskIds).not.toContain('TASK1');
    });

    it('should set dueDay when task has no dueWithTime', () => {
      const todayStr = getDbDateStr();

      const data = createMinimalData({
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              tagIds: [],
              // No dueWithTime
              // No dueDay
            },
          },
        },
        todayTag: {
          taskIds: ['TASK1'],
        },
      });

      const result = crossModelMigration3(data) as AppDataCompleteNew;

      expect(result.task.entities['TASK1']?.dueDay).toBe(todayStr);
    });

    it('should not modify task when dueDay is already set', () => {
      const existingDueDay = '2024-01-15';

      const data = createMinimalData({
        task: {
          ids: ['TASK1'],
          entities: {
            TASK1: {
              id: 'TASK1',
              tagIds: [],
              dueDay: existingDueDay,
              dueWithTime: Date.now(),
            },
          },
        },
        todayTag: {
          taskIds: ['TASK1'],
        },
      });

      const result = crossModelMigration3(data) as AppDataCompleteNew;

      expect(result.task.entities['TASK1']?.dueDay).toBe(existingDueDay);
    });

    it('should handle multiple tasks with mixed scenarios', () => {
      const now = Date.now();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const todayStr = getDbDateStr();

      const data = createMinimalData({
        task: {
          ids: ['TODAY_TASK', 'YESTERDAY_TASK', 'NO_TIME_TASK'],
          entities: {
            TODAY_TASK: {
              id: 'TODAY_TASK',
              tagIds: [],
              dueWithTime: now,
            },
            YESTERDAY_TASK: {
              id: 'YESTERDAY_TASK',
              tagIds: [],
              dueWithTime: yesterday.getTime(),
            },
            NO_TIME_TASK: {
              id: 'NO_TIME_TASK',
              tagIds: [],
            },
          },
        },
        todayTag: {
          taskIds: ['TODAY_TASK', 'YESTERDAY_TASK', 'NO_TIME_TASK'],
        },
      });

      const result = crossModelMigration3(data) as AppDataCompleteNew;

      // TODAY_TASK should have dueDay set and remain in TODAY_TAG
      expect(result.task.entities['TODAY_TASK']?.dueDay).toBe(todayStr);
      expect(result.tag.entities[TODAY_TAG.id]?.taskIds).toContain('TODAY_TASK');

      // YESTERDAY_TASK should be removed from TODAY_TAG
      expect(result.task.entities['YESTERDAY_TASK']?.dueDay).toBeUndefined();
      expect(result.tag.entities[TODAY_TAG.id]?.taskIds).not.toContain('YESTERDAY_TASK');

      // NO_TIME_TASK should have dueDay set
      expect(result.task.entities['NO_TIME_TASK']?.dueDay).toBe(todayStr);
      expect(result.tag.entities[TODAY_TAG.id]?.taskIds).toContain('NO_TIME_TASK');
    });
  });
});
