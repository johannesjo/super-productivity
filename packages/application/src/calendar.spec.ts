import { describe, expect, it } from 'vitest';
import { agendaCount, calendarAgenda, weekDates } from './calendar';

describe('calendar agenda', () => {
  it('lists seven dates starting on the week start', () => {
    expect(weekDates('2026-07-13')).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ]);
  });

  it('buckets timed and all-day events onto their start day', () => {
    const agenda = calendarAgenda(
      [
        { uid: 'a', summary: 'Standup', start: '2026-07-13T09:00:00Z', allDay: false },
        { uid: 'b', summary: 'Birthday', start: '2026-07-15', allDay: true },
        { uid: 'c', summary: 'Next week', start: '2026-07-20T10:00:00Z', allDay: false },
      ],
      '2026-07-13',
    );
    expect(agenda).toHaveLength(7);
    expect(agenda[0].events.map((event) => event.summary)).toEqual(['Standup']);
    expect(agenda[2].events[0]?.allDay).toBe(true);
    expect(agenda[6].events).toEqual([]);
    expect(agendaCount(agenda)).toBe(2);
  });
});
