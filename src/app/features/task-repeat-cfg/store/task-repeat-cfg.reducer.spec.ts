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
  startDate: undefined,
  repeatEvery: 1,
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

const FAKE_MONDAY_THE_10TH = new Date('2022-01-10').getTime();
// eslint-disable-next-line no-mixed-operators
const FULL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((v) => FAKE_MONDAY_THE_10TH + v * DAY);

const dummyRepeatable = (id: string, fields: Partial<TaskRepeatCfg>): TaskRepeatCfg => ({
  ...DUMMY_REPEATABLE_TASK,
  id,
  ...fields,
});

describe('selectTaskRepeatCfgsDueOnDay', () => {
  describe('for week days', () => {
    it('should return available for day', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { monday: true })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
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

  describe('for DAILY', () => {
    it('should work for a week', () => {
      const repeatableTasks = [
        dummyRepeatable('R1', { repeatCycle: 'DAILY' }),
        dummyRepeatable('R2', { repeatCycle: 'DAILY' }),
      ];
      const results = FULL_WEEK.map((dayTimestamp) =>
        selectTaskRepeatCfgsDueOnDay
          .projector(repeatableTasks, { dayDate: dayTimestamp })
          .map((item) => item.id),
      );
      expect(results).toEqual([
        ['R1', 'R2'],
        ['R1', 'R2'],
        ['R1', 'R2'],
        ['R1', 'R2'],
        ['R1', 'R2'],
        ['R1', 'R2'],
        ['R1', 'R2'],
      ]);
    });
  });

  describe('for MONTHLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });
    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-01-10' })],
        {
          dayDate: new Date('2022-02-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });
    it('should NOT return cfg for future startDate', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-02-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });
    it('should return cfg if repeatCycle matches', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'MONTHLY',
            startDate: '2022-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: new Date('2022-03-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });
    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'MONTHLY',
            startDate: '2022-01-10',
            repeatEvery: 3,
          }),
        ],
        {
          dayDate: new Date('2022-03-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });
  });
});
