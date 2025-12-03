/**
 * Actions that should NOT be persisted to the operation log.
 * These are UI-only actions that don't affect persisted state.
 */
export const BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  // ===== App-level UI state =====
  '[App] Set Current Worklog Task',

  // ===== Layout/Panel visibility =====
  '[Layout] Toggle Sidebar',
  '[Layout] Show AddTaskBar',
  '[Layout] Hide AddTaskBar',
  '[Layout] Show TaskViewCustomizerPanel',
  '[Layout] Hide TaskViewCustomizerPanel',
  '[Layout] Toggle TaskViewCustomizerPanel',
  '[Layout] ToggleShow Notes',
  '[Layout] Hide Non-Task Side Panel',
  '[Layout] Toggle IssuePanel',
  '[Layout] Hide IssuePanel',
  '[Layout] Show PluginPanel',
  '[Layout] Hide PluginPanel',
  '[Layout] Toggle PluginPanel',
  '[Layout] Toggle ScheduleDayPanel',
  '[Layout] Hide ScheduleDayPanel',

  // ===== Task UI state (selection, expansion) =====
  '[Task] SetCurrentTask',
  '[Task] SetSelectedTask',
  '[Task] UnsetCurrentTask',
  '[Task] Update Task Ui',
  '[Task] Toggle Show Sub Tasks',

  // ===== Focus Mode (transient session state) =====
  '[Focus Mode] Enter/Exit',
  '[FocusMode] Show Overlay',
  '[FocusMode] Hide Overlay',
  '[FocusMode] Select Task',
  '[FocusMode] Select Duration',
  '[FocusMode] Pause Session',
  '[FocusMode] Resume Session',
  '[FocusMode] Cancel Session',
  '[FocusMode] Skip Break',
  '[FocusMode] Complete Break',
  '[FocusMode] Navigate To Main Screen',
  '[FocusMode] Adjust Remaining Time',
  '[FocusMode] Set Focus Session Duration',

  // ===== Idle detection (transient) =====
  '[Idle] Open dialog',
  '[Idle] Set idle time',
  '[Idle] Reset break timer',
]);
