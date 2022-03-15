import { selectTaskRepeatCfgsDueOnDay } from './task-repeat-cfg.reducer';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';

const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
  ...DEFAULT_TASK_REPEAT_CFG,
  id: 'REPEATABLE_DEFAULT',
  title: 'REPEATABLE_DEFAULT',
  quickSetting: 'DAILY',
  lastTaskCreation: 60 * 60 * 1000, // debug: Why this number? // todo: This number might cause issues with the tests later on…
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

const FAKE_MONDAY_THE_10TH = new Date('2022-01-10').getTime();

const dummyRepeatable = (id: string, fields: Partial<TaskRepeatCfg>): TaskRepeatCfg => ({
  ...DUMMY_REPEATABLE_TASK,
  id,
  ...fields,
});

const datePrintingOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

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

    it('should return cfg for startDate in the past (2)', () => {
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
          dayDate: new Date('2022-01-17').getTime(),
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
        dummyRepeatable('R3', {
          wednesday: true,
          friday: true,
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
      console.log(results);
      expect(results).toEqual([['R1'], [], ['R2', 'R3'], [], ['R3'], [], []]);
    });

    it('should NOT return cfg if startDate is in the future (1)[different week]', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'WEEKLY',
            startDate: '2022-02-10', // Donnerstag / Thursday
            tuesday: true,
          }),
        ],
        {
          dayDate: new Date('2022-01-11').getTime(), // Dienstag / Tuesday
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });
    it('should NOT return cfg if startDate is in the future (2)[same week]', () => {
      const startDate = '2022-01-12'; // Wednesday
      // prettier-ignore
      // @ts-ignore
      const printStart = new Date(startDate).toLocaleTimeString('en-us', datePrintingOptions);

      const dayDate = new Date('2022-01-11'); // Tuesday
      // @ts-ignore
      const printDayDate = dayDate.toLocaleTimeString('en-us', datePrintingOptions);

      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            repeatCycle: 'WEEKLY',
            startDate: '2022-01-12',
            tuesday: true,
          }),
        ],
        {
          dayDate: dayDate.getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);

      console.log(
        '\nIDs: ',
        resultIds,
        '\nStart: ',
        printStart,
        '\nToday:',
        printDayDate,
      );
      expect(resultIds).toEqual([]);
    });
    it('should return cfg if repeatCycle matches', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            monday: true,
            repeatCycle: 'WEEKLY',
            startDate: '2022-01-10',
            repeatEvery: 2,
          }),
        ],
        {
          //dayDate: new Date('2022-03-10').getTime(),
          dayDate: new Date('2022-01-24').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      console.log(resultIds);
      expect(resultIds).toEqual(['R1']);
    });
    it('should NOT return cfg if repeatCycle does NOT match', () => {
      const result = selectTaskRepeatCfgsDueOnDay.projector(
        [
          dummyRepeatable('R1', {
            monday: true,
            repeatCycle: 'WEEKLY',
            startDate: '2022-01-10',
            repeatEvery: 3,
          }),
        ],
        {
          dayDate: new Date('2022-01-17').getTime(),
        },
      );
      const resultIds = result.map((item) => item.id);
      expect(resultIds).toEqual([]);
    });

    // Multiple Weeks Test
    // Please keep in mind, this test triggers every day of the week. Hence, it does not test the behaviour, if a day is skipped.
    // For convenience of the test, lastTaskCreation is always the day before the day we test.
    const expectedMultipleTest = {
      // R1 is every 2 weeks
      // R3 repeats every week, (starts in the first week, at the first day)
      0: [['R1'], [], ['R3'], [], ['R3', 'R4'], [], []], // R2 hasn't started // R4 starts this Friday and is scheduled Fridays
      1: [[], [], ['R3'], [], ['R3'], [], []], // R2 starts this Sunday
      2: [['R1'], [], ['R2', 'R3'], [], ['R3'], [], []],
      3: [[], [], ['R2', 'R3'], [], ['R3', 'R4'], [], []], // R4 repeats in the third week
      4: [['R1'], [], ['R2', 'R3'], [], ['R3'], [], []],
    };
    for (let w = 0; w < 5; w++) {
      it('should work correctly for multiple weeks (week ' + w + ')', () => {
        const week = w;
        // prettier-ignore
        // eslint-disable-next-line no-mixed-operators
        const FULL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((v) => FAKE_MONDAY_THE_10TH + (week * 7 * DAY) + v * DAY);
        const results = [] as any;
        for (const dayTimestamp of FULL_WEEK) {
          results.push(
            selectTaskRepeatCfgsDueOnDay
              .projector(
                [
                  dummyRepeatable('R1', {
                    monday: true,
                    repeatCycle: 'WEEKLY',
                    startDate: '2022-01-10', // Monday
                    repeatEvery: 2,
                    lastTaskCreation: dayTimestamp - DAY,
                  }),
                  dummyRepeatable('R2', {
                    wednesday: true,
                    startDate: '2022-01-23', // Sunday
                    repeatCycle: 'WEEKLY',
                    lastTaskCreation: dayTimestamp - DAY,
                  }),
                  dummyRepeatable('R3', {
                    wednesday: true,
                    friday: true,
                    startDate: '2022-01-10', // Monday
                    repeatCycle: 'WEEKLY',
                    repeatEvery: 1,
                    lastTaskCreation: dayTimestamp - DAY,
                  }),
                  dummyRepeatable('R4', {
                    friday: true,
                    startDate: '2022-01-14', // Friday
                    repeatCycle: 'WEEKLY',
                    repeatEvery: 3,
                    lastTaskCreation: dayTimestamp - DAY,
                  }),
                ],
                { dayDate: dayTimestamp },
              )
              .map((item) => item.id),
          );
        }
        // prettier-ignore
        // @ts-ignore
        const printWeekStart = new Date(FULL_WEEK[0]).toLocaleTimeString('en-us', datePrintingOptions);
        console.log('Week ' + week + ': ', results, '\tWeek-Start: ' + printWeekStart);
        console.log('Should: ', expectedMultipleTest[week]);
        expect(results).toEqual(expectedMultipleTest[week]);
      });
    }
    // End of multiple test

    // Start incorrect weekday scheduling test
    // This test covers most use-cases, which aren't tested already.
    // Though the main goal is to test correct handling of 'skipped' weekdays,
    // it partly tests the correct handling of the startDate as well (hence the first 'empty' week).
    // prettier-ignore
    const lastTaskCreation = {
      'R1': [// Monday: created, Saturday not opened; Next Monday: Update, Next Monday: Update
        // '2022-01-10', '2022-01-10', '2022-01-17', '2022-01-24', // original, based on [week] instead of [c]; seems to be too inaccurate
        // Monday   , Tuesday     , Wednesday   , Friday
        '2022-01-10', '2022-01-10', '2022-01-10', '2022-01-10', // week 0 // Monday: created, Saturday not opened
        '2022-01-10', '2022-01-17',  '2022-01-17', '2022-01-17', // week 1 // Monday repeated;
        '2022-01-17', '2022-01-24',  '2022-01-24', '2022-01-24', // week 2 // Monday repeated;
      ],
      'R2': [
        // Monday   , Tuesday     , Wednesday   , Friday
        '2022-01-14', '2022-01-14', '2022-01-14', '2022-01-14', // week 0 // "created repeatedTask"
        '2022-01-14', '2022-01-17',  '2022-01-17', '2022-01-17', // week 1 // Monday repeated; Friday (catch up) repeated
        '2022-01-21', '2022-01-24',  '2022-01-24', '2022-01-24', // week 2 // Monday repeated; Friday (catch up) repeated
      ],
    };
    // prettier-ignore
    const expectedIncorrectWeekdayTest = {
       // Monday, Tuesday, Wednesday, Friday
      0: [[], [], [], []], // R2 starts this Friday
      1: [['R1', 'R2'], [], [], ['R2']], // R1 starts this Monday
      2: [['R1', 'R2'], [], [], ['R2']],
    };
    for (let w = 0; w < 3; w++) {
      it('should return cfg after missed day(s) (week ' + w + ')', () => {
        const week = w;
        // Monday, Tuesday, Wednesday, Friday
        // prettier-ignore
        // eslint-disable-next-line no-mixed-operators
        const SOME_WEEK_DAYS = [0, 1, 2, 4].map((v) => FAKE_MONDAY_THE_10TH + (week * 7 * DAY) + v * DAY);
        // We can dump every weekday into the function, as selectTaskRepeatCfgsDueOnDay is only filtering.
        let c = w * 4;
        const results = [] as any;
        for (const dayTimestamp of SOME_WEEK_DAYS) {
          results.push(
            selectTaskRepeatCfgsDueOnDay
              .projector(
                [
                  dummyRepeatable('R1', {
                    saturday: true,
                    repeatCycle: 'WEEKLY',
                    startDate: '2022-01-10', // Monday
                    repeatEvery: 1,
                    lastTaskCreation: new Date(lastTaskCreation['R1'][c]).getTime(),
                  }),
                  dummyRepeatable('R2', {
                    monday: true,
                    thursday: true,
                    startDate: '2022-01-14', // Friday
                    repeatCycle: 'WEEKLY',
                    repeatEvery: 1,
                    lastTaskCreation: new Date(lastTaskCreation['R2'][c]).getTime(),
                  }),
                ],
                { dayDate: dayTimestamp },
              )
              .map((item) => item.id),
          );
          c++;
        }

        // prettier-ignore
        // @ts-ignore
        const printWeekStart = new Date(SOME_WEEK_DAYS[0]).toLocaleTimeString('en-us', datePrintingOptions);
        // prettier-ignore
        // @ts-ignore
        const printLastCreatedR1 = new Date(lastTaskCreation['R1'][week]).toLocaleTimeString('en-us', datePrintingOptions);
        // prettier-ignore
        // @ts-ignore
        const printLastCreatedR2Monday = new Date(lastTaskCreation['R2'][week * 4]).toLocaleTimeString('en-us', datePrintingOptions);
        console.log('Week ' + week + ': ', results, '\tWeek-Start: ' + printWeekStart);
        console.log('Should: ', expectedIncorrectWeekdayTest[week]);
        // prettier-ignore
        console.log('LastCreated(R1): ' + printLastCreatedR1 + '\tLastCreated(R2)[Monday]: ' + printLastCreatedR2Monday)
        expect(results).toEqual(expectedIncorrectWeekdayTest[week]);
      });
    }
    // End incorrect weekday scheduling test

    // End of "for WEEKLY"
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
