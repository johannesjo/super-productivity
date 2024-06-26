import { NightwatchBrowser } from 'nightwatch';

export interface AddTaskWithReminderParams {
  title: string;
  taskSel?: string;
  scheduleTime?: number;
}

export interface NBrowser extends NightwatchBrowser {
  addTask: (taskTitle: string) => NBrowser;
  addTaskWithNewTag: (tagTitle: string) => NBrowser;
  addNote: (noteTitle: string) => NBrowser;
  draftTask: (taskTitle: string) => NBrowser;
  goToDefaultProject: () => NBrowser;
  loadAppAndClickAwayWelcomeDialog: (url?: string) => NBrowser;
  openPanelForTask: (taskSel: string) => NBrowser;
  // TODO use object for params
  addTaskWithReminder: (params: AddTaskWithReminderParams) => NBrowser;
}
