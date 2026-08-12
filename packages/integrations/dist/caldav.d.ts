import { type AuthScheme } from './http';
import { type CalendarEvent } from './ical';
export interface CalDavConfig {
    baseUrl: string;
    auth: AuthScheme;
    principalPath?: string;
    fetch?: typeof globalThis.fetch;
}
export declare const calDavDefaultPath: (emailOrUser: string) => string;
export declare class CalDavClient {
    #private;
    constructor(config: CalDavConfig);
    /** Lists calendar collection paths under the principal. */
    listCalendars(path: string): Promise<string[]>;
    /** Fetches events in [start, end] for a calendar path. */
    events(path: string, start: string, end: string): Promise<CalendarEvent[]>;
}
export declare const toCalDavDate: (iso: string) => string;
