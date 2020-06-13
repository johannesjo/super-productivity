import {NightwatchBrowser} from 'nightwatch';

export interface NBrowser extends NightwatchBrowser {
  addTask: (taskTitle: string) => NBrowser;
  addNote: (noteTitle: string) => NBrowser;
  goToDefaultProject: () => NBrowser;
  openPanelForTask: (taskSel: string) => NBrowser;
  // TODO use object for params
  addTaskWithReminder: (taskTitle: string, taskSel?: string, scheduleTime?: number) => NBrowser;
}
