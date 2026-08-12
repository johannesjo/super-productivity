import type { DomainState, ISODate, Task } from '@noura/domain';

// Framework-free Eisenhower matrix derivation. The matrix is a pure projection
// over open tasks using two criteria:
//   - Important: priority >= 2 (medium or high)
//   - Urgent:    due within `urgentHorizonDays` (default 2) or overdue

export interface EisenhowerBuckets {
  importantUrgent: Task[];
  importantNotUrgent: Task[];
  notImportantUrgent: Task[];
  notImportantNotUrgent: Task[];
}

export const isUrgent = (task: Task, today: ISODate, urgentHorizonDays = 2): boolean => {
  if (!task.dueDay) return false;
  if (task.dueDay < today) return true;
  const urgent =
    new Date(`${task.dueDay}T00:00:00Z`).getTime() -
    new Date(`${today}T00:00:00Z`).getTime();
  return urgent <= urgentHorizonDays * 86_400_000;
};

export const isImportant = (task: Task): boolean => task.priority >= 2;

export const eisenhowerBuckets = (
  state: DomainState,
  today: ISODate,
  urgentHorizonDays = 2,
): EisenhowerBuckets => {
  const buckets: EisenhowerBuckets = {
    importantUrgent: [],
    importantNotUrgent: [],
    notImportantUrgent: [],
    notImportantNotUrgent: [],
  };
  for (const task of Object.values(state.tasks)) {
    if (task.status !== 'open') continue;
    const urgent = isUrgent(task, today, urgentHorizonDays);
    const important = isImportant(task);
    if (important && urgent) buckets.importantUrgent.push(task);
    else if (important && !urgent) buckets.importantNotUrgent.push(task);
    else if (!important && urgent) buckets.notImportantUrgent.push(task);
    else buckets.notImportantNotUrgent.push(task);
  }
  for (const key of Object.keys(buckets) as Array<keyof EisenhowerBuckets>) {
    buckets[key].sort(
      (a, b) =>
        b.priority - a.priority || (a.dueDay ?? '9999').localeCompare(b.dueDay ?? '9999'),
    );
  }
  return buckets;
};

export const eisenhowerQuadrant = (
  task: Task,
  today: ISODate,
):
  | 'importantUrgent'
  | 'importantNotUrgent'
  | 'notImportantUrgent'
  | 'notImportantNotUrgent' => {
  const urgent = isUrgent(task, today);
  const important = isImportant(task);
  if (important && urgent) return 'importantUrgent';
  if (important) return 'importantNotUrgent';
  if (urgent) return 'notImportantUrgent';
  return 'notImportantNotUrgent';
};
