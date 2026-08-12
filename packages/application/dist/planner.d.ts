import { type DomainState, type ISODate, type Task } from '@noura/domain';
export interface DayBucket {
    date: ISODate;
    tasks: Task[];
}
export declare const weekDays: (weekStart: ISODate) => ISODate[];
export declare const selectWeekBuckets: (state: DomainState, weekStart: ISODate) => DayBucket[];
export interface Occurrence {
    task: Task;
    date: ISODate;
}
/** Recurrence-aware occurrences of repeating tasks inside [start, end]. */
export declare const scheduleOccurrences: (state: DomainState, start: ISODate, end: ISODate) => Occurrence[];
export declare const projectTaskCount: (state: DomainState, projectId: string) => number;
