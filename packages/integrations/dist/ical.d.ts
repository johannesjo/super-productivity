export interface CalendarEvent {
    uid: string;
    summary: string;
    description: string;
    location: string;
    start: string;
    end: string;
    allDay: boolean;
    rrule?: string;
}
export declare const parseIcs: (text: string) => CalendarEvent[];
