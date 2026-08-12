import type { DomainState, ISODate } from '@noura/domain';

// Framework-free metrics for Insights (Phase 4): daily/weekly focus series
// from tracked entries, project distribution, and top tasks by tracked time.

export interface DayFocusPoint {
  date: ISODate;
  minutes: number;
  sessions: number;
}

const DAY_MS = 86_400_000;

const dayIndex = (iso: string): number =>
  Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

const toIso = (index: number): ISODate =>
  new Date(index * DAY_MS).toISOString().slice(0, 10) as ISODate;

const startOfWeek = (ms: number): number => {
  const date = new Date(ms);
  const mondayOffset = (date.getUTCDay() + 6) % 7; // days since Monday
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - mondayOffset,
  );
};

export const focusSeries = (state: DomainState, days = 14): DayFocusPoint[] => {
  const todayStart = new Date().toISOString().slice(0, 10);
  const today = dayIndex(todayStart);
  const buckets = new Map<string, { minutes: number; sessions: number }>();

  for (const entry of Object.values(state.trackedEntries)) {
    const day = toIso(dayIndex(new Date(entry.startedAt).toISOString().slice(0, 10)));
    const bucket = buckets.get(day) ?? { minutes: 0, sessions: 0 };
    bucket.minutes += Math.round(entry.durationMs / 60_000);
    bucket.sessions += 1;
    buckets.set(day, bucket);
  }

  const result: DayFocusPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = toIso(today - offset);
    const bucket = buckets.get(date);
    result.push({
      date,
      minutes: bucket?.minutes ?? 0,
      sessions: bucket?.sessions ?? 0,
    });
  }
  return result;
};

export const weekFocus = (state: DomainState, now = Date.now()) => {
  const weekly = { thisWeekMs: 0, prevWeekMs: 0 };
  const thisWeekStart = startOfWeek(now);
  const prevWeekStart = thisWeekStart - 7 * DAY_MS;
  for (const entry of Object.values(state.trackedEntries)) {
    if (entry.startedAt >= thisWeekStart) weekly.thisWeekMs += entry.durationMs;
    else if (entry.startedAt >= prevWeekStart) weekly.prevWeekMs += entry.durationMs;
  }
  const tasksDoneThisWeek = Object.values(state.tasks).filter(
    (task) =>
      task.status === 'done' && task.doneOn !== undefined && task.doneOn >= thisWeekStart,
  ).length;
  return { ...weekly, tasksDoneThisWeek };
};

export const focusByProject = (state: DomainState) => {
  const totals = new Map<string, number>();
  for (const task of Object.values(state.tasks)) {
    if (task.trackedMs <= 0) continue;
    const key = state.projects[task.projectId]?.title ?? 'Other';
    totals.set(key, (totals.get(key) ?? 0) + task.trackedMs);
  }
  return [...totals.entries()]
    .map(([title, ms]) => ({ title, ms }))
    .sort((a, b) => b.ms - a.ms);
};

export const topTasksByTime = (state: DomainState, top = 5) =>
  Object.values(state.tasks)
    .filter((task) => task.trackedMs > 0)
    .sort((a, b) => b.trackedMs - a.trackedMs)
    .slice(0, top)
    .map((task) => ({ id: task.id, title: task.title, ms: task.trackedMs }));
