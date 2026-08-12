import type { ISODate } from '@noura/domain';

// Framework-free calendar agenda projection (Phase 7): aligned to planner day
// buckets so weekly views can overlay calendar events (from iCal/CalDAV/GCal).
// Events are normalized to { date, summary } for rendering; all-day and timed
// events both map onto their start day.

export interface AgendaEvent {
  id: string;
  date: ISODate;
  summary: string;
  start?: string;
  allDay: boolean;
}

export interface AgendaEntry {
  date: ISODate;
  events: AgendaEvent[];
}

export const weekDates = (weekStart: ISODate, days = 7): ISODate[] => {
  const start = new Date(`${weekStart}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start + index * 86_400_000);
    return day.toISOString().slice(0, 10) as ISODate;
  });
};

const dayOf = (iso?: string): ISODate | undefined =>
  iso ? (iso.slice(0, 10) as ISODate) : undefined;

export interface CalendarEventInput {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
}

/** Projects calendar events onto the day buckets of a week. */
export const calendarAgenda = (
  events: readonly CalendarEventInput[],
  weekStart: ISODate,
): AgendaEntry[] => {
  const dates = weekDates(weekStart);
  const buckets = new Map<string, AgendaEvent[]>();
  for (const date of dates) buckets.set(date, []);

  for (const event of events) {
    const start = event.start ?? event.end ?? '';
    const date = dayOf(start);
    if (!date || !buckets.has(date)) continue;
    const entry: AgendaEvent = {
      id: event.uid,
      date,
      summary: event.summary || '(untitled)',
      start,
      allDay: Boolean(event.allDay),
    };
    buckets.get(date)?.push(entry);
  }

  return dates.map((date) => ({ date, events: buckets.get(date) ?? [] }));
};

/** True when a week has at least one event (used for agenda badge counts). */
export const agendaCount = (agenda: readonly AgendaEntry[]): number =>
  agenda.reduce((total, day) => total + day.events.length, 0);
