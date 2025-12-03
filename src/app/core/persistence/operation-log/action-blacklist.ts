import {
  hideAddTaskBar,
  hideIssuePanel,
  hideNonTaskSidePanelContent,
  hidePluginPanel,
  hideScheduleDayPanel,
  hideTaskViewCustomizerPanel,
  showAddTaskBar,
  showPluginPanel,
  showTaskViewCustomizerPanel,
  toggleIssuePanel,
  togglePluginPanel,
  toggleScheduleDayPanel,
  toggleShowNotes,
  toggleTaskViewCustomizerPanel,
} from '../../../core-ui/layout/store/layout.actions';
import {
  setCurrentTask,
  setSelectedTask,
  toggleTaskHideSubTasks,
  unsetCurrentTask,
  updateTaskUi,
} from '../../../features/tasks/store/task.actions';
import {
  adjustRemainingTime,
  cancelFocusSession,
  completeBreak,
  hideFocusOverlay,
  navigateToMainScreen,
  pauseFocusSession,
  selectFocusDuration,
  selectFocusTask,
  setFocusSessionDuration,
  showFocusOverlay,
  skipBreak,
  unPauseFocusSession,
} from '../../../features/focus-mode/store/focus-mode.actions';
import {
  openIdleDialog,
  setIdleTime,
  triggerResetBreakTimer,
} from '../../../features/idle/store/idle.actions';

/**
 * Actions that should NOT be persisted to the operation log.
 * These are UI-only actions that don't affect persisted state.
 */
export const BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  // ===== Layout/Panel visibility =====
  showAddTaskBar.type,
  hideAddTaskBar.type,
  showTaskViewCustomizerPanel.type,
  hideTaskViewCustomizerPanel.type,
  toggleTaskViewCustomizerPanel.type,
  toggleShowNotes.type,
  hideNonTaskSidePanelContent.type,
  toggleIssuePanel.type,
  hideIssuePanel.type,
  showPluginPanel.type,
  hidePluginPanel.type,
  togglePluginPanel.type,
  toggleScheduleDayPanel.type,
  hideScheduleDayPanel.type,

  // ===== Task UI state (selection, expansion) =====
  setCurrentTask.type,
  setSelectedTask.type,
  unsetCurrentTask.type,
  updateTaskUi.type,
  toggleTaskHideSubTasks.type,

  // ===== Focus Mode (transient session state) =====
  showFocusOverlay.type,
  hideFocusOverlay.type,
  selectFocusTask.type,
  selectFocusDuration.type,
  pauseFocusSession.type,
  unPauseFocusSession.type,
  cancelFocusSession.type,
  skipBreak.type,
  completeBreak.type,
  navigateToMainScreen.type,
  adjustRemainingTime.type,
  setFocusSessionDuration.type,

  // ===== Idle detection (transient) =====
  openIdleDialog.type,
  setIdleTime.type,
  triggerResetBreakTimer.type,
]);
