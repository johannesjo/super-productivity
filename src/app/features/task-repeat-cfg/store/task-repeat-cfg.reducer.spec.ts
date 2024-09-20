import {
  selectTaskRepeatCfgsDueOnDayIncludingOverdue,
  selectTaskRepeatCfgsDueOnDayOnly,
} from './task-repeat-cfg.reducer';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { TaskReminderOptionId } from '../../tasks/task.model';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';

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
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const FAKE_MONDAY_THE_10TH = dateStrToUtcDate('2022-01-10').getTime();

const dummyRepeatable = (id: string, fields: Partial<TaskRepeatCfg>): TaskRepeatCfg => ({
  ...DUMMY_REPEATABLE_TASK,
  id,
  ...fields,
});

describe('selectTaskRepeatCfgsDueOnDay', () => {
  describe('for DAILY', () => {
    it('should return cfg for a far future task', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'DAILY',
            startDate: '2022-01-10',
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2025-11-11').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
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
        const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 3,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
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
        const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 3,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
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
        const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 4,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual([]);
      });
    });

    [
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 2,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 4,
    ].forEach((dayDateStr) => {
      it('should return cfg for a for repeatEvery if correct', () => {
        const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 2,
              startDate: '2022-01-10',
              startTime: '10:00',
              remindAt: TaskReminderOptionId.AtStart,
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual(['R1']);
      });
    });
  });

  describe('for WEEKLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
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
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            startDate: '2022-01-10',
            monday: true,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2022-02-07').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return available for day', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
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
        selectTaskRepeatCfgsDueOnDayOnly
          .projector(repeatableTasks, { dayDate: dayTimestamp })
          .map((item) => item.id),
      );
      expect(results).toEqual([['R1'], [], ['R2'], [], [], [], []]);
    });

    // it('should NOT return cfg for future startDate', () => {
    //   const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
    //     [dummyRepeatable('R1', { repeatCycle: 'WEEKLY', startDate: '2022-02-10' })],
    //     {
    //       dayDate: FAKE_MONDAY_THE_10TH,
    //     },
    //   );
    //   const resultIds = result.map((item) => item.id);
    //   expect(resultIds).toEqual([]);
    // });
    // it('should return cfg if repeatCycle matches', () => {
    //   const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
    //     [
    //       dummyRepeatable('R1', {
    //         repeatCycle: 'WEEKLY',
    //         startDate: '2022-01-10',
    //         repeatEvery: 2,
    //       }),
    //     ],
    //     {
    //       dayDate: dateStrToUtcDate('2022-03-10').getTime(),
    //     },
    //   );
    //   const resultIds = result.map((item) => item.id);
    //   expect(resultIds).toEqual(['R1']);
    // });
    // it('should NOT return cfg if repeatCycle does NOT match', () => {
    //   const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
    //     [
    //       dummyRepeatable('R1', {
    //         repeatCycle: 'WEEKLY',
    //         startDate: '2022-01-10',
    //         repeatEvery: 3,
    //       }),
    //     ],
    //     {
    //       dayDate: dateStrToUtcDate('2022-03-10').getTime(),
    //     },
    //   );
    //   const resultIds = result.map((item) => item.id);
    //   expect(resultIds).toEqual([]);
    // });
  });

  describe('for MONTHLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-01-10' })],
        {
          dayDate: dateStrToUtcDate('2022-02-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg for future startDate', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-02-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });

    it('should return cfg if repeatCycle matches', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'MONTHLY',
            startDate: '2022-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2022-03-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'MONTHLY',
            startDate: '2022-01-10',
            repeatEvery: 3,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2022-03-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });
  });

  describe('for YEARLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2022-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2021-01-10' })],
        {
          dayDate: dateStrToUtcDate('2022-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg for future startDate', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2023-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });

    it('should return cfg if repeatCycle matches', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'YEARLY',
            startDate: '2024-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2024-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDayOnly.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'YEARLY',
            startDate: '2022-01-10',
            lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2023-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      console.log(result);

      expect(resultIds).toEqual([]);
    });
  });
});

// -----------------------------------------------------------------------------------

describe('selectTaskRepeatCfgsDueOnDayIncludingOverdue', () => {
  it('should not return values for Marco`s edge case', () => {
    const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
      [
        dummyRepeatable('R1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
          startDate: '2024-01-26',
          lastTaskCreation: dateStrToUtcDate('2024-06-26').getTime(),
        }),
      ],
      {
        dayDate: dateStrToUtcDate('2024-07-16').getTime(),
      },
    );
    const resultIds = result.map((item) => item.id);
    console.log(resultIds);

    expect(resultIds).toEqual([]);
  });

  describe('for DAILY', () => {
    it('should return cfg for a far future task', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'DAILY',
            startDate: '2022-01-10',
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2025-11-11').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
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
        const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 3,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
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
        const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 3,
              startDate: '2022-01-10',
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual(['R1']);
      });
    });

    [
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 2,
      // eslint-disable-next-line no-mixed-operators
      FAKE_MONDAY_THE_10TH + DAY * 4,
    ].forEach((dayDateStr) => {
      it('should return cfg for a for repeatEvery if correct', () => {
        const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
          [
            dummyRepeatable('R1', {
              repeatCycle: 'DAILY',
              repeatEvery: 2,
              startDate: '2022-01-10',
              startTime: '10:00',
              remindAt: TaskReminderOptionId.AtStart,
            }),
          ],
          {
            dayDate: new Date(dayDateStr).getTime(),
          },
        );
        const resultIds = result.map((item) => item.id);
        expect(resultIds).toEqual(['R1']);
      });
    });
  });

  describe('for WEEKLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
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
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'WEEKLY',
            repeatEvery: 1,
            startDate: '2022-01-10',
            monday: true,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2022-02-07').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return available for day', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
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
  });

  describe('for MONTHLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-01-10' })],
        {
          dayDate: dateStrToUtcDate('2022-02-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg for future startDate', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [dummyRepeatable('R1', { repeatCycle: 'MONTHLY', startDate: '2022-02-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });

    it('should return cfg if repeatCycle matches', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'MONTHLY',
            startDate: '2022-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2022-03-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'MONTHLY',
            startDate: '2022-01-10',
            repeatEvery: 3,
            lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2022-03-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });
  });

  describe('for YEARLY', () => {
    it('should return cfg for startDate today', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2022-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should return cfg for startDate in the past', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2021-01-10' })],
        {
          dayDate: dateStrToUtcDate('2022-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg for future startDate', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [dummyRepeatable('R1', { repeatCycle: 'YEARLY', startDate: '2023-01-10' })],
        {
          dayDate: FAKE_MONDAY_THE_10TH,
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });

    it('should return cfg if repeatCycle matches', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'YEARLY',
            startDate: '2024-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2024-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual(['R1']);
    });

    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDayIncludingOverdue.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'YEARLY',
            startDate: '2022-01-10',
            lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
            repeatEvery: 2,
          }),
        ],
        {
          dayDate: dateStrToUtcDate('2023-01-10').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);

      expect(resultIds).toEqual([]);
    });
  });
});
