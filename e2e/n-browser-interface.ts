import { NightwatchAPI } from 'nightwatch';

export interface AddTaskWithReminderParams {
  title: string;
  taskSel?: string;
  scheduleTime?: number;
}

export interface NBrowser extends NightwatchAPI {
  addTask: (taskTitle: string, isSkipClose?: boolean) => NBrowser;
  addTaskWithNewTag: (tagName: string) => NBrowser;
  addNote: (noteTitle: string) => NBrowser;
  draftTask: (taskTitle: string) => NBrowser;
  createAndGoToDefaultProject: () => NBrowser;
  noError: () => NBrowser;
  loadAppAndClickAwayWelcomeDialog: (url?: string) => NBrowser;
  openPanelForTask: (taskSel: string) => NBrowser;
  sendKeysToActiveEl: (keys: string | string[]) => NBrowser;
  addTaskWithReminder: (params: AddTaskWithReminderParams) => NBrowser;
}
