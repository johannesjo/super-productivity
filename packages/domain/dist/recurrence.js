// Framework-free port of Super Productivity's task-repeat-cfg recurrence
// engine (repeat-cfg.util.ts). Operates in UTC so a schedule is independent of
// the local timezone and deterministic for tests.
export const parseDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};
export const toDateStr = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
export const addDays = (date, days) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const startOfWeek = (date) => addDays(date, -date.getUTCDay());
/** Whole ISO weeks between two UTC dates (used for weekly parity). */
const wholeWeeksBetween = (from, to) => Math.round((to.getTime() - from.getTime()) / (7 * 86_400_000));
const nthWeekdayOfMonth = (year, month, weekday, weekNumber) => {
    const first = new Date(Date.UTC(year, month, 1));
    const firstDelta = (weekday - first.getUTCDay() + 7) % 7;
    const firstMatch = addDays(first, firstDelta);
    const weekStart = new Date(Date.UTC(year, month, 1 + 7 * (weekNumber - 1)));
    const weekStartDelta = (weekday - weekStart.getUTCDay() + 7) % 7;
    return addDays(weekStart, weekStartDelta);
};
const lastWeekdayOfMonth = (year, month, weekday) => {
    const last = new Date(Date.UTC(year, month + 1, 0));
    const delta = (last.getUTCDay() - weekday + 7) % 7;
    return addDays(last, -delta);
};
const monthWeekday = (year, month, cfg) => {
    const weekday = cfg.daysOfWeek[0] ?? 0;
    const weekNumber = cfg.weekOfMonth ?? 1;
    if (weekNumber >= 4)
        return lastWeekdayOfMonth(year, month, weekday);
    return nthWeekdayOfMonth(year, month, weekday, weekNumber);
};
const occurrenceInPeriod = (cfg, year, month) => {
    if (cfg.repeatEveryUnit === 'MONTHLY') {
        if (cfg.daysOfWeek.length > 0)
            return monthWeekday(year, month, cfg);
        const day = Math.min(cfg.dayOfMonth ?? 1, daysInMonth(year, month));
        return new Date(Date.UTC(year, month, day));
    }
    // YEARLY
    const targetMonth = (cfg.yearMonth ?? 1) - 1;
    if (cfg.daysOfWeek.length > 0)
        return monthWeekday(year, targetMonth, cfg);
    const day = Math.min(cfg.dayOfMonth ?? 1, daysInMonth(year, targetMonth));
    return new Date(Date.UTC(year, targetMonth, day));
};
/**
 * Returns the next schedule occurrence strictly after `startFromDateStr`,
 * honoring repeatEvery, week-of-month/day/month config, and repeatOffset.
 * Respects cfg.startDate (no occurrences before it) and cfg.endDate (stop).
 * Returns undefined when the schedule is exhausted.
 */
export const getRepeatConfigNextDate = (cfg, startFromDateStr) => {
    let from = parseDate(startFromDateStr);
    if (cfg.startDate && from < parseDate(cfg.startDate)) {
        from =
            toDateStr(from) === cfg.startDate ? from : addDays(parseDate(cfg.startDate), -1);
    }
    let next;
    if (cfg.repeatEveryUnit === 'DAILY') {
        next = addDays(from, cfg.repeatEvery);
    }
    else if (cfg.repeatEveryUnit === 'WEEKLY') {
        const weekdays = [...cfg.daysOfWeek].sort((a, b) => a - b);
        const anchor = cfg.startDate
            ? startOfWeek(parseDate(cfg.startDate))
            : startOfWeek(from);
        for (let week = 0; week < cfg.repeatEvery + 1; week += 1) {
            const weekStart = addDays(startOfWeek(from), week * 7);
            if (wholeWeeksBetween(anchor, weekStart) % cfg.repeatEvery !== 0)
                continue;
            for (const weekday of weekdays) {
                const candidate = addDays(weekStart, weekday);
                if (candidate.getTime() > from.getTime()) {
                    next = candidate;
                    break;
                }
            }
            if (next)
                break;
        }
    }
    else {
        let year = from.getUTCFullYear();
        let month = from.getUTCMonth();
        const periodSteps = cfg.repeatEveryUnit === 'MONTHLY' ? 26 : 4;
        for (let step = 0; step < periodSteps; step += 1) {
            const candidate = occurrenceInPeriod(cfg, year, month);
            if (candidate.getTime() > from.getTime()) {
                next = candidate;
                break;
            }
            if (cfg.repeatEveryUnit === 'MONTHLY') {
                month += cfg.repeatEvery;
                year += Math.floor(month / 12);
                month %= 12;
            }
            else {
                year += cfg.repeatEvery;
            }
        }
    }
    if (!next)
        return undefined;
    if (cfg.repeatOffset)
        next = addDays(next, cfg.repeatOffset);
    const nextStr = toDateStr(next);
    if (cfg.endDate && nextStr > cfg.endDate)
        return undefined;
    return nextStr;
};
/**
 * Enumerates every occurrence date within [rangeStart, rangeEnd], honoring
 * startDate/endDate. Returns dates in ascending order.
 */
export const expandRepeatConfig = (cfg, rangeStart, rangeEnd) => {
    const dates = [];
    let cursor = toDateStr(addDays(parseDate(rangeStart), -1));
    if (cfg.startDate && cfg.startDate > cursor) {
        cursor = toDateStr(addDays(parseDate(cfg.startDate), -1));
    }
    let guard = 0;
    while (guard < 10_000) {
        const next = getRepeatConfigNextDate(cfg, cursor);
        if (!next)
            break;
        if (next > rangeEnd)
            break;
        if (next >= rangeStart)
            dates.push(next);
        cursor = next;
        guard += 1;
    }
    return { dates };
};
