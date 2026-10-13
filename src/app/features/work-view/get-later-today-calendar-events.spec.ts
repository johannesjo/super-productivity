import { getLaterTodayCalendarEvents } from './get-later-today-calendar-events';
import {
  ScheduleCalendarMapEntry,
  ScheduleFromCalendarEvent,
} from '../schedule/schedule.model';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { oneDayInMilliseconds } from '../../util/month-time-conversion';

const TODAY_STR = '2026-06-23';
const hours = (n: number): number => n * 60 * 60 * 1000;

// Mirror the util's own end-of-today computation so assertions stay
// timezone-independent (setHours is local time).
const endOfToday = (): number => {
  const d = dateStrToUtcDate(TODAY_STR);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

const ev = (
  id: string,
  start: number,
  overrides: Partial<ScheduleFromCalendarEvent> = {},
): ScheduleFromCalendarEvent => ({
  id,
  calProviderId: 'cal-1',
  title: id,
  start,
  duration: hours(1),
  issueProviderKey: 'ICAL',
  ...overrides,
});

const entries = (items: ScheduleFromCalendarEvent[]): ScheduleCalendarMapEntry[] => [
  { items },
];

describe('getLaterTodayCalendarEvents', () => {
  it('returns [] when todayStr is empty', () => {
    const now = endOfToday() - hours(6);
    expect(
      getLaterTodayCalendarEvents(entries([ev('a', now + hours(1))]), '', 0, now),
    ).toEqual([]);
  });

  it('includes only timed events starting between now and end of today', () => {
    const now = endOfToday() - hours(6);
    const result = getLaterTodayCalendarEvents(
      entries([
        ev('soon', now + hours(1)),
        ev('past', now - hours(1)),
        ev('tomorrow', endOfToday() + hours(1)),
      ]),
      TODAY_STR,
      0,
      now,
    );
    expect(result.map((e) => e.id)).toEqual(['soon']);
  });

  it('includes an event starting exactly at now', () => {
    const now = endOfToday() - hours(6);
    const result = getLaterTodayCalendarEvents(
      entries([ev('atNow', now)]),
      TODAY_STR,
      0,
      now,
    );
    expect(result.map((e) => e.id)).toEqual(['atNow']);
  });

  it('excludes all-day events', () => {
    const now = endOfToday() - hours(6);
    const result = getLaterTodayCalendarEvents(
      entries([
        ev('allDayFlag', now + hours(1), { isAllDay: true }),
        ev('fullDayDuration', now + hours(1), { duration: oneDayInMilliseconds }),
        ev('timed', now + hours(2)),
      ]),
      TODAY_STR,
      0,
      now,
    );
    expect(result.map((e) => e.id)).toEqual(['timed']);
  });

  it('sorts events by start time and flattens multiple entries', () => {
    const now = endOfToday() - hours(6);
    const result = getLaterTodayCalendarEvents(
      [
        { items: [ev('later', now + hours(3))] },
        { items: [ev('earlier', now + hours(1))] },
      ],
      TODAY_STR,
      0,
      now,
    );
    expect(result.map((e) => e.id)).toEqual(['earlier', 'later']);
  });

  it('extends the window by the start-of-next-day offset', () => {
    const now = endOfToday() - hours(6);
    const justAfterMidnight = ev('afterMidnight', endOfToday() + hours(1));
    expect(
      getLaterTodayCalendarEvents(entries([justAfterMidnight]), TODAY_STR, 0, now).length,
    ).toBe(0);
    expect(
      getLaterTodayCalendarEvents(
        entries([justAfterMidnight]),
        TODAY_STR,
        hours(3),
        now,
      ).map((e) => e.id),
    ).toEqual(['afterMidnight']);
  });
});
