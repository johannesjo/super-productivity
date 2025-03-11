import { getSimpleCounterStreakDuration } from './get-simple-counter-streak-duration';
import { SimpleCounterCopy } from './simple-counter.model';
import { getWorklogStr } from '../../util/get-work-log-str';

/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-mixed-operators */
describe('getSimpleCounterStreakDuration()', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const Y_STR = getWorklogStr(yesterday);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const TWO_DAYS_AGO_STR = getWorklogStr(twoDaysAgo);

  const T1: Partial<SimpleCounterCopy>[] = [
    {
      id: '1',
      countOnDay: {},
      streakWeekDays: {},
    },
    {
      id: '1',
      countOnDay: { [getWorklogStr()]: 1 },
      isTrackStreaks: true,
      streakMinValue: 2,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      streakWeekDays: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
    },
    {
      id: '1',
      countOnDay: { [getWorklogStr()]: 1 },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
      },
    },
  ];
  T1.forEach((sc: SimpleCounterCopy) => {
    it('should return 0 if no streak', () => {
      expect(getSimpleCounterStreakDuration(sc)).toBe(0);
    });
  });

  const T2: Partial<SimpleCounterCopy>[] = [
    {
      id: '1',
      countOnDay: { [getWorklogStr()]: 1 },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
      },
    },
    {
      id: '1',
      countOnDay: { [getWorklogStr()]: 3, [Y_STR]: 3, [TWO_DAYS_AGO_STR]: 0 },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
        ...{ [yesterday.getDay()]: false },
      },
    },
  ];

  T2.forEach((sc: SimpleCounterCopy) => {
    it('should return 1 if streak', () => {
      expect(getSimpleCounterStreakDuration(sc)).toBe(1);
    });
  });

  //
  const T3: Partial<SimpleCounterCopy>[] = [
    {
      id: '1',
      countOnDay: { [getWorklogStr()]: 1, [Y_STR]: 1 },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
      },
    },
    {
      id: '1',
      countOnDay: { [getWorklogStr()]: 3, [Y_STR]: 3, [TWO_DAYS_AGO_STR]: 3 },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
        ...{ [yesterday.getDay()]: false },
      },
    },
  ];

  T3.forEach((sc: SimpleCounterCopy) => {
    it('should return 2 if streak', () => {
      expect(getSimpleCounterStreakDuration(sc)).toBe(2);
    });
  });

  //
  const T4: Partial<SimpleCounterCopy>[] = [
    {
      id: '1',
      countOnDay: {
        [getWorklogStr()]: 1,
        [getWorklogStr(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 9 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 11 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000))]: 1,
      },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
      },
    },
    {
      id: '1',
      countOnDay: {
        [getWorklogStr()]: 1,
        [getWorklogStr(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))]: 0,
        [getWorklogStr(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 9 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 11 * 24 * 60 * 60 * 1000))]: 0,
        [getWorklogStr(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000))]: 1,
      },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
        ...{ [new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getDay()]: false },
      },
    },
  ];

  T4.forEach((sc: SimpleCounterCopy) => {
    it('should return 14 if streak', () => {
      expect(getSimpleCounterStreakDuration(sc)).toBe(14);
    });
  });

  //
  const T5: Partial<SimpleCounterCopy>[] = [
    {
      id: '1',
      countOnDay: {
        [getWorklogStr(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 9 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 11 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000))]: 1,
        [getWorklogStr(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000))]: 1,
      },
      isTrackStreaks: true,
      streakMinValue: 1,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
      },
    },
    {
      id: '1',
      countOnDay: {
        [getWorklogStr()]: 1,
        [getWorklogStr(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))]: 0,
        [getWorklogStr(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 9 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 11 * 24 * 60 * 60 * 1000))]: 0,
        [getWorklogStr(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))]: 2,
        [getWorklogStr(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000))]: 2,
      },
      isTrackStreaks: true,
      streakMinValue: 2,
      streakWeekDays: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
        ...{ [new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getDay()]: false },
      },
    },
  ];

  T5.forEach((sc: SimpleCounterCopy) => {
    it('should start counting at yesterday not today', () => {
      expect(getSimpleCounterStreakDuration(sc)).toBe(13);
    });
  });
});
