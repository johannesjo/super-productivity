import type { DomainState } from '@noura/domain';

// Backup/import review counts (Phase 9 "import conflict review"): a concise,
// deterministic summary shown before accepting an imported state.

export interface ImportCounts {
  tasks: number;
  doneTasks: number;
  projects: number;
  tags: number;
  notes: number;
  smartLists: number;
}

export const countState = (state: DomainState): ImportCounts => {
  const tasks = Object.values(state.tasks);
  return {
    tasks: tasks.length,
    doneTasks: tasks.filter((task) => task.status === 'done').length,
    projects: Object.keys(state.projects).length,
    tags: Object.keys(state.tags).length,
    notes: Object.keys(state.notes).length,
    smartLists: Object.keys(state.smartLists).length,
  };
};

export const importSummary = (counts: ImportCounts): string =>
  `Imported ${counts.tasks} tasks (${counts.doneTasks} done), ${counts.projects} projects, ` +
  `${counts.tags} tags, ${counts.notes} notes, ${counts.smartLists} smart lists.`;
