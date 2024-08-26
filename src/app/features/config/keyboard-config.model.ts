export type KeyboardConfig = Readonly<{
  globalShowHide: string | null;
  globalAddNote: string | null;
  globalAddTask: string | null;
  toggleBacklog: string | null;
  goToFocusMode: string | null;
  goToWorkView: string | null;
  goToTimeline: string | null;
  goToScheduledView: string | null;
  // goToFocusMode: string|null,
  // goToDailyAgenda: string|null,
  goToSettings: string | null;
  addNewTask: string | null;
  globalToggleTaskStart: string | null;
  showHelp: string | null;
  showSearchBar: string | null;
  addNewNote: string | null;
  toggleSideNav: string | null;
  openProjectNotes: string | null;
  toggleBookmarks: string | null;
  zoomIn: string | null;
  zoomOut: string | null;
  zoomDefault: string | null;
  saveNote: string | null;
  triggerSync: string | null;

  taskEditTitle: string | null;
  taskToggleDetailPanelOpen: string | null;
  taskOpenEstimationDialog: string | null;
  taskToggleDone: string | null;
  taskAddSubTask: string | null;
  taskAddAttachment: string | null;
  taskMoveToProject: string | null;
  taskOpenContextMenu: string | null;
  taskDelete: string | null;
  taskSchedule: string | null;
  selectPreviousTask: string | null;
  selectNextTask: string | null;
  moveTaskUp: string | null;
  moveTaskDown: string | null;
  moveTaskToTop: string | null;
  moveTaskToBottom: string | null;
  moveToBacklog: string | null;
  moveToTodaysTasks: string | null;
  expandSubTasks: string | null;
  collapseSubTasks: string | null;
  togglePlay: string | null;
  taskEditTags: string | null;
}>;
