import {NightwatchBrowser} from 'nightwatch';

export interface NBrowser extends NightwatchBrowser {
  addTask: (taskTitle: string) => NBrowser;
}
