import type { DomainState, ISODate, TrackedEntry, Worklog } from '@noura/domain';

// Framework-free worklog/timesheet projection and CSV export (Phase 4). The
// timesheet is built from durable Worklog rows (created from finished tracked
// entries); raw tracked entries fill the gap when a worklog row is missing.

export interface WorklogRow {
  id: string;
  date: string | undefined;
  taskTitle: string;
  projectTitle: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

const isoTime = (ms: number): string => new Date(ms).toISOString();

export const buildWorklogRows = (state: DomainState): WorklogRow[] => {
  const worklogEntries = Object.values(state.worklogs) as Worklog[];
  const rawEntries = Object.values(state.trackedEntries) as TrackedEntry[];
  const rows: WorklogRow[] = [];

  for (const entry of rawEntries) {
    const { taskId } = entry;
    const task = taskId ? state.tasks[taskId] : undefined;
    rows.push({
      id: entry.id,
      date: entry.date,
      taskTitle: task?.title ?? '(untracked)',
      projectTitle: task ? (state.projects[task.projectId]?.title ?? '') : '',
      startedAt: isoTime(entry.startedAt),
      endedAt: entry.endedAt ? isoTime(entry.endedAt) : '',
      durationMs: entry.durationMs,
    });
  }
  for (const entry of worklogEntries) {
    if (rawEntries.some((raw) => raw.id === entry.id)) continue;
    const task = entry.taskId ? state.tasks[entry.taskId] : undefined;
    rows.push({
      id: entry.id,
      date: entry.date,
      taskTitle: task?.title ?? '(untracked)',
      projectTitle: task ? (state.projects[task.projectId]?.title ?? '') : '',
      startedAt: isoTime(entry.started),
      endedAt: isoTime(entry.ended),
      durationMs: entry.duration,
    });
  }

  return rows.sort(
    (a, b) =>
      (b.date ?? '').localeCompare(a.date ?? '') ||
      Date.parse(b.startedAt) - Date.parse(a.startedAt),
  );
};

const csvCell = (value: string): string => {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

/** Comma-separated timesheet export (LF line endings, header row). */
export const worklogToCsv = (rows: WorklogRow[]): string => {
  const header = ['date', 'task', 'project', 'started_utc', 'ended_utc', 'duration_ms'];
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((row) =>
      [
        row.date ?? '',
        row.taskTitle,
        row.projectTitle,
        row.startedAt,
        row.endedAt,
        String(row.durationMs),
      ]
        .map(csvCell)
        .join(','),
    ),
  ];
  return lines.join('\n');
};

export const worklogWeekTotal = (rows: WorklogRow[]): number =>
  rows.reduce((total, row) => total + row.durationMs, 0);

export const recentHistory = (
  state: DomainState,
  days = 14,
): Array<{ date: ISODate; tasksDone: number; totalTimeSpent: number }> => {
  const byDate = new Map<
    string,
    { date: ISODate; tasksDone: number; totalTimeSpent: number }
  >();
  for (const entry of Object.values(state.history)) {
    byDate.set(entry.date, {
      date: entry.date,
      tasksDone: entry.tasksDone,
      totalTimeSpent: entry.totalTimeSpent,
    });
  }
  const result: Array<{ date: ISODate; tasksDone: number; totalTimeSpent: number }> = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset),
    );
    const iso = date.toISOString().slice(0, 10) as ISODate;
    result.push(byDate.get(iso) ?? { date: iso, tasksDone: 0, totalTimeSpent: 0 });
  }
  return result;
};
