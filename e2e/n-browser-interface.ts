import { NightwatchBrowser } from 'nightwatch';

export interface AddTaskWithReminderParams {
  title: string;
  taskSel?: string;
  scheduleTime?: number;
}

export interface NBrowser extends NightwatchBrowser {
  addTask: (taskTitle: string) => NBrowser;
  addNote: (noteTitle: string) => NBrowser;
  goToDefaultProject: () => NBrowser;
  openPanelForTask: (taskSel: string) => NBrowser;
  // TODO use object for params
  addTaskWithReminder: (params: AddTaskWithReminderParams) => NBrowser;
}
