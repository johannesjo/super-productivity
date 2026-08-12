import {
  expandRepeatConfig,
  selectTasksByProject,
  type DomainState,
  type ISODate,
  type Task,
} from '@noura/domain';

// Framework-free planner projections (Phase 4): a week of days with their due
// tasks, and the recurrence-aware occurrences of repeating tasks within a
// range (driven by the recurrence engine in the domain package).

export interface DayBucket {
  date: ISODate;
  tasks: Task[];
}

export const weekDays = (weekStart: ISODate): ISODate[] => {
  const start = new Date(`${weekStart}T00:00:00Z`).getTime();
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start + index * 86_400_000);
    return day.toISOString().slice(0, 10) as ISODate;
  });
};

export const selectWeekBuckets = (state: DomainState, weekStart: ISODate): DayBucket[] =>
  weekDays(weekStart).map((date) => ({
    date,
    tasks: Object.values(state.tasks)
      .filter((task) => task.status === 'open' && task.dueDay === date)
      .sort((a, b) => b.priority - a.priority || (a.title < b.title ? -1 : 1)),
  }));

export interface Occurrence {
  task: Task;
  date: ISODate;
}

/** Recurrence-aware occurrences of repeating tasks inside [start, end]. */
export const scheduleOccurrences = (
  state: DomainState,
  start: ISODate,
  end: ISODate,
): Occurrence[] => {
  const occurrences: Occurrence[] = [];
  for (const task of Object.values(state.tasks)) {
    if (task.status !== 'open' || !task.repeatCfgId) continue;
    const cfg = state.taskRepeatCfgs[task.repeatCfgId];
    if (!cfg) continue;
    for (const date of expandRepeatConfig(cfg, start, end).dates) {
      occurrences.push({ task, date });
    }
  }
  return occurrences.sort(
    (a, b) => a.date.localeCompare(b.date) || a.task.title.localeCompare(b.task.title),
  );
};

export const projectTaskCount = (state: DomainState, projectId: string): number =>
  selectTasksByProject(state, projectId).length;
