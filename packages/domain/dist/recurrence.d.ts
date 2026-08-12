import type { ISODate, TaskRepeatCfg } from './entities';
export declare const parseDate: (dateStr: string) => Date;
export declare const toDateStr: (date: Date) => ISODate;
export declare const addDays: (date: Date, days: number) => Date;
/**
 * Returns the next schedule occurrence strictly after `startFromDateStr`,
 * honoring repeatEvery, week-of-month/day/month config, and repeatOffset.
 * Respects cfg.startDate (no occurrences before it) and cfg.endDate (stop).
 * Returns undefined when the schedule is exhausted.
 */
export declare const getRepeatConfigNextDate: (cfg: TaskRepeatCfg, startFromDateStr: string) => ISODate | undefined;
/**
 * Enumerates every occurrence date within [rangeStart, rangeEnd], honoring
 * startDate/endDate. Returns dates in ascending order.
 */
export declare const expandRepeatConfig: (cfg: TaskRepeatCfg, rangeStart: ISODate, rangeEnd: ISODate) => {
    dates: ISODate[];
};
