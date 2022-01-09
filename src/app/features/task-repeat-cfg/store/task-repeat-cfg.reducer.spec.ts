import { selectTaskRepeatCfgsDueOnDay } from './task-repeat-cfg.reducer';
import { TaskRepeatCfg } from '../task-repeat-cfg.model';

const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
  id: 'REPEATABLE_DEFAULT',
  title: 'REPEATABLE_DEFAULT',
  lastTaskCreation: 60 * 60 * 1000,
  defaultEstimate: undefined,
  projectId: null,
  startTime: undefined,
  remindAt: undefined,
  isPaused: false,
  repeatCycle: 'WEEKLY',
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  tagIds: [],
  order: 0,
};

const DAY = 24 * 60 * 60 * 1000;
// Monday 9.1.2022
const FAKE_MONDAY = 1641797082974;
const FULL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((v) => FAKE_MONDAY + v * DAY);
const dummyRepeatable = (id: string, fields: Partial<TaskRepeatCfg>): TaskRepeatCfg => ({
  ...DUMMY_REPEATABLE_TASK,
  id,
  ...fields,
});

describe('taskRepeatCfg selectors', () => {
  describe('selectTaskRepeatCfgsDueOnDay', () => {
    it('should return available for day', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { monday: true })],
        {
          dayDate: 1641797082974,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should work correctly for a week', () => {
      const repeatableTasks = [
        dummyRepeatable('R1', { monday: true }),
        dummyRepeatable('R2', { wednesday: true }),
      ];
      const results = FULL_WEEK.map((dayTimestamp) =>
        selectTaskRepeatCfgsDueOnDay
          .projector(repeatableTasks, { dayDate: dayTimestamp })
          .map((item) => item.id),
      );
      expect(results).toEqual([['R1'], [], ['R2'], [], [], [], []]);
    });
  });
});
