import type { DomainState, ISODate, SmartList, Task, TaskStatus } from './entities';

export const selectTask = (state: DomainState, id: string): Task | undefined =>
  state.tasks[id];

export const selectOrderedTasks = (state: DomainState): Task[] =>
  state.taskOrder
    .map((id) => state.tasks[id])
    .filter((task): task is Task => Boolean(task));

export const selectTasksByStatus = (state: DomainState, status: TaskStatus): Task[] =>
  selectOrderedTasks(state).filter((task) => task.status === status);

export const selectOpenTasks = (state: DomainState): Task[] =>
  selectTasksByStatus(state, 'open');

export const selectSubtasks = (state: DomainState, parentId: string): Task[] =>
  state.tasks[parentId]
    ? state.tasks[parentId].subtaskIds
        .map((id) => state.tasks[id])
        .filter((task): task is Task => Boolean(task))
    : [];

export const selectDescendants = (state: DomainState, id: string): Task[] => {
  const result: Task[] = [];
  const visit = (parentId: string): void => {
    for (const child of selectSubtasks(state, parentId)) {
      result.push(child);
      visit(child.id);
    }
  };
  visit(id);
  return result;
};

export const selectTasksByProject = (state: DomainState, projectId: string): Task[] =>
  selectOpenTasks(state).filter((task) => task.projectId === projectId);

export const selectTasksByTag = (state: DomainState, tagId: string): Task[] =>
  selectOpenTasks(state).filter((task) => task.tagIds.includes(tagId));

export const selectOverdueTasks = (state: DomainState, today: ISODate): Task[] =>
  selectOpenTasks(state).filter(
    (task) => task.dueDay !== undefined && task.dueDay < today,
  );

export const selectDueOn = (state: DomainState, day: ISODate): Task[] =>
  selectOpenTasks(state).filter((task) => task.dueDay === day);

export const selectTasksDueBetween = (
  state: DomainState,
  fromDay: ISODate,
  toDay: ISODate,
): Task[] =>
  selectOpenTasks(state).filter(
    (task) => task.dueDay !== undefined && task.dueDay >= fromDay && task.dueDay <= toDay,
  );

export const selectDoneOn = (state: DomainState, day: ISODate): Task[] =>
  selectTasksByStatus(state, 'done').filter(
    (task) =>
      task.doneOn !== undefined &&
      new Date(task.doneOn).toISOString().slice(0, 10) === day,
  );

export const selectPriorityTasks = (state: DomainState, minimum: number): Task[] =>
  selectOpenTasks(state).filter((task) => task.priority >= minimum);

export const selectTasksWithReminder = (state: DomainState): Task[] =>
  selectOpenTasks(state).filter((task) => task.reminderAt !== undefined);

export const selectWorklogForTask = (state: DomainState, taskId: string) =>
  Object.values(state.worklogs)
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.started - b.started);

export const selectTrackedEntriesForTask = (state: DomainState, taskId: string) =>
  Object.values(state.trackedEntries)
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.startedAt - b.startedAt);

export const selectTotalTrackedOn = (state: DomainState, day: ISODate): number =>
  Object.values(state.trackedEntries).reduce((total, entry) => {
    if (entry.date === day) return total + entry.durationMs;
    const startedDay = new Date(entry.startedAt).toISOString().slice(0, 10);
    return startedDay === day ? total + entry.durationMs : total;
  }, 0);

export const selectHistoryForDay = (state: DomainState, day: ISODate) =>
  Object.values(state.history).find((entry) => entry.date === day);

const matchesCriteria = (
  task: Task,
  criteria: SmartList['listConfig']['filterCriteria'][number],
): boolean => {
  const text = `${task.title} ${task.notes}`.toLowerCase();
  switch (criteria.type) {
    case 'DUE':
      return task.dueDay !== undefined;
    case 'PRIORITY':
      return task.priority >= Number(criteria.value);
    case 'PROJECT':
      return task.projectId === criteria.value;
    case 'TAG':
      return task.tagIds.includes(criteria.value);
    case 'TIME_ESTIMATE':
      return task.estimateMs >= Number(criteria.value);
    case 'TEXT':
      return text.includes(criteria.value.toLowerCase());
    case 'IS_DONE':
      return task.status === 'done';
  }
};

export const selectSmartListTasks = (state: DomainState, list: SmartList): Task[] => {
  const config = list.listConfig;
  return selectOrderedTasks(state).filter((task) => {
    if (!config.isShowCompletedTasks && task.status === 'done') return false;
    return config.filterCriteria.every((criteria) => matchesCriteria(task, criteria));
  });
};

export const selectArchivedTasks = (state: DomainState): Task[] =>
  selectTasksByStatus(state, 'archived');

export const selectTodayBucket = (state: DomainState, today: ISODate): Task[] =>
  selectDueOn(state, today);

export const selectUpcomingBucket = (
  state: DomainState,
  today: ISODate,
  horizon: ISODate,
): Task[] => selectTasksDueBetween(state, today, horizon);

export const selectCounterByType = (state: DomainState, type: 'STOPWATCH' | 'COUNTER') =>
  Object.values(state.counters).filter((counter) => counter.counterType === type);
