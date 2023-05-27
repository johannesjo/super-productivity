import { selectTaskRepeatCfgsDueOnDay } from './task-repeat-cfg.reducer';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';

const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
  ...DEFAULT_TASK_REPEAT_CFG,
  id: 'REPEATABLE_DEFAULT',
  title: 'REPEATABLE_DEFAULT',
  quickSetting: 'DAILY',
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
  subTaskIds: ['SUB_TASK__DEFAULT'],
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const FAKE_MONDAY_THE_10TH = new Date('2022-01-10').getTime();

const dummyRepeatable = (id: string, fields: Partial<TaskRepeatCfg>): TaskRepeatCfg => ({
  ...DUMMY_REPEATABLE_TASK,
  id,
  ...fields,
});

describe('selectTaskRepeatCfgsDueOnDay', () => {
  describe('for DAILY', () => {
    it('should return cfg for a far future task', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'DAILY',
            startDate: '2022-01-10',
          }),
        ],
        {
          dayDate: new Date('2025-11-11'),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for a far future task WITH sub tasks', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'DAILY',
            startDate: '2022-01-10',
            subTaskIds: ['ST-1', 'ST-2'],
          }),
        ],
        {
          dayDate: new Date('2025-11-11'),
        },
      );
      const resultSubTaskIds = result.map((item) => item.subTaskIds);
      expect(resultSubTaskIds).toEqual([['ST-1', 'ST-2']]);
    });

    [
      FAKE_MONDAY_THE_10TH,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 3,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 6,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 300,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 150,
    ].forEach((dayDateStr) => {
      it('should return cfg for a for repeatEvery correctly', () => {
        const result = selectTaskRepeatCfgsDueOnDay.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 3,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual(['R1']);
      });
    });

    [
      FAKE_MONDAY_THE_10TH + 11,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 3 + HOUR * 22,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 6 + HOUR * 3,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 702 + HOUR * 2,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 150 + HOUR * 6,
    ].forEach((dayDateStr) => {
      it('should return cfg for a for repeatEvery correctly for non exact day dates', () => {
        const result = selectTaskRepeatCfgsDueOnDay.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 3,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual(['R1']);
      });
    });

    [
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 11,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 21,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 34,
    ].forEach((dayDateStr) => {
      it('should NOT return cfg for a for repeatEvery if not correct', () => {
        const result = selectTaskRepeatCfgsDueOnDay.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 4,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual([]);
      });
    });
  });

  describe('for WEEKLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'WEEKLY',
            startDate: '2022-01-10',
            monday: true,
          }),
        ],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            startDate: '2022-01-10',
            monday: true,
          }),
        ],
        {
          dayDate: new Date('2022-02-07').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return available for day', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            monday: true,
            startDate: '2022-01-10',
            repeatCycle: 'WEEKLY',
          }),
        ],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should work correctly for a week', () => {
      const repeatableTasks = [
        dummyRepeatable('R1', {
          monday: true,
          startDate: '2022-01-10',
          repeatCycle: 'WEEKLY',
        }),
        dummyRepeatable('R2', {
          wednesday: true,
          startDate: '2022-01-10',
          repeatCycle: 'WEEKLY',
        }),
      ];
      // eslint-disable-next-line no-mixed-operators
      const FULL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((v) => FAKE_MONDAY_THE_10TH + v * DAY);
      const results = FULL_WEEK.map((dayTimestamp) =>
        selectTaskRepeatCfgsDueOnDay
          .projector(repeatableTasks, { dayDate: dayTimestamp })
          .map((item) => item.id),
      );
      expect(results).toEqual([['R1'], [], ['R2'], [], [], [], []]);
    });

    // it('should NOT return cfg for future startDate', () => {
    //   const result = selectTaskRepeatCfgsDueOnDay.projector(
    //     [dummyRepeatable('R1', { repeatCycle: 'WEEKLY', startDate: '2022-02-10' })],
    //     {
    //       dayDate: FAKE_MONDAY_THE_10TH,
    //     },
    //   );
    //   const resultIds = result.map((item) => item.id);
    //   expect(resultIds).toEqual([]);
    // });
    // it('should return cfg if repeatCycle matches', () => {
    //   const result = selectTaskRepeatCfgsDueOnDay.projector(
    //     [
    //       dummyRepeatable('R1', {
    //         repeatCycle: 'WEEKLY',
    //         startDate: '2022-01-10',
    //         repeatEvery: 2,
    //       }),
    //     ],
    //     {
    //       dayDate: new Date('2022-03-10').getTime(),
    //     },
    //   );
    //   const resultIds = result.map((item) => item.id);
    //   expect(resultIds).toEqual(['R1']);
    // });
    // it('should NOT return cfg if repeatCycle does NOT match', () => {
    //   const result = selectTaskRepeatCfgsDueOnDay.projector(
    //     [
    //       dummyRepeatable('R1', {
    //         repeatCycle: 'WEEKLY',
    //         startDate: '2022-01-10',
    //         repeatEvery: 3,
    //       }),
    //     ],
    //     {
    //       dayDate: new Date('2022-03-10').getTime(),
    //     },
    //   );
    //   const resultIds = result.map((item) => item.id);
    //   expect(resultIds).toEqual([]);
    // });
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

  describe('for YEARLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2022-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2021-01-10' })],
        {
          dayDate: new Date('2022-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg for future startDate', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2023-01-10' })],
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
            repeatCycle: 'YEARLY',
            startDate: '2024-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: new Date('2024-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'YEARLY',
            startDate: '2022-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: new Date('2023-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });
  });
});
