import type { DomainState, ISODate } from '@noura/domain';
export interface DayFocusPoint {
    date: ISODate;
    minutes: number;
    sessions: number;
}
export declare const focusSeries: (state: DomainState, days?: number) => DayFocusPoint[];
export declare const weekFocus: (state: DomainState, now?: number) => {
    tasksDoneThisWeek: number;
    thisWeekMs: number;
    prevWeekMs: number;
};
export declare const focusByProject: (state: DomainState) => {
    title: string;
    ms: number;
}[];
export declare const topTasksByTime: (state: DomainState, top?: number) => {
    id: string;
    title: string;
    ms: number;
}[];
