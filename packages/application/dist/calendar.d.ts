import type { ISODate } from '@noura/domain';
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
export declare const weekDates: (weekStart: ISODate, days?: number) => ISODate[];
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
export declare const calendarAgenda: (events: readonly CalendarEventInput[], weekStart: ISODate) => AgendaEntry[];
/** True when a week has at least one event (used for agenda badge counts). */
export declare const agendaCount: (agenda: readonly AgendaEntry[]) => number;
