import type { DomainState, ISODate } from '@noura/domain';
export interface WorklogRow {
    id: string;
    date: string | undefined;
    taskTitle: string;
    projectTitle: string;
    startedAt: string;
    endedAt: string;
    durationMs: number;
}
export declare const buildWorklogRows: (state: DomainState) => WorklogRow[];
/** Comma-separated timesheet export (LF line endings, header row). */
export declare const worklogToCsv: (rows: WorklogRow[]) => string;
export declare const worklogWeekTotal: (rows: WorklogRow[]) => number;
export declare const recentHistory: (state: DomainState, days?: number) => Array<{
    date: ISODate;
    tasksDone: number;
    totalTimeSpent: number;
}>;
