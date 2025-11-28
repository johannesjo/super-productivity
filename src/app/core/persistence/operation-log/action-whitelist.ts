export const BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  // Explicitly EXCLUDED (not persisted):
  '[App] Set Current Worklog Task', // UI state
  '[Layout] Toggle Sidebar', // UI state
  '[Layout] Show AddTaskBar',
  '[Layout] Hide AddTaskBar',
  '[Focus Mode] Enter/Exit', // transient

  // Task UI Actions
  '[Task] SetCurrentTask',
  '[Task] SetSelectedTask',
  '[Task] UnsetCurrentTask',
  '[Task] Update Task Ui',
  '[Task] Toggle Show Sub Tasks',
]);
