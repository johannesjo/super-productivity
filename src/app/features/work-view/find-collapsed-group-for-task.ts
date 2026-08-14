import { TaskWithSubTasks } from '../tasks/task.model';

/**
 * Finds the collapsed customizer group a task is hidden inside, or `null` when
 * nothing needs expanding.
 *
 * A collapsed group unmounts its whole task-list, so a search result inside one
 * has no DOM row for the reveal step to focus and retrying alone can never
 * succeed. (#8780)
 *
 * Iterates the record's OWN keys rather than indexing it by the collapsed ids: a
 * stale id like `constructor` would otherwise resolve off `Object.prototype`.
 */
export const findCollapsedGroupForTask = (
  grouped: Record<string, TaskWithSubTasks[]> | undefined,
  collapsedGroupIds: string[],
  taskId: string,
): string | null => {
  if (!grouped || !collapsedGroupIds.length) {
    return null;
  }

  for (const groupKey of Object.keys(grouped)) {
    if (!collapsedGroupIds.includes(groupKey)) {
      continue;
    }
    // Subtasks render inside their parent's row, so a hidden subtask is revealed
    // by expanding the group its PARENT sits in.
    const isInGroup = grouped[groupKey].some(
      (task) =>
        task &&
        (task.id === taskId || !!task.subTasks?.some((sub) => sub?.id === taskId)),
    );
    if (isInGroup) {
      return groupKey;
    }
  }

  return null;
};
