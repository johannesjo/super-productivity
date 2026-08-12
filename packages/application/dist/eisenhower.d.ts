import type { DomainState, ISODate, Task } from '@noura/domain';
export interface EisenhowerBuckets {
    importantUrgent: Task[];
    importantNotUrgent: Task[];
    notImportantUrgent: Task[];
    notImportantNotUrgent: Task[];
}
export declare const isUrgent: (task: Task, today: ISODate, urgentHorizonDays?: number) => boolean;
export declare const isImportant: (task: Task) => boolean;
export declare const eisenhowerBuckets: (state: DomainState, today: ISODate, urgentHorizonDays?: number) => EisenhowerBuckets;
export declare const eisenhowerQuadrant: (task: Task, today: ISODate) => "importantUrgent" | "importantNotUrgent" | "notImportantUrgent" | "notImportantNotUrgent";
