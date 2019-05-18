import {ProjectState} from '../../features/project/store/project.reducer';
import {TaskState} from '../../features/tasks/store/task.reducer';
import {GlobalConfig} from '../../features/config/config.model';
import {EntityState} from '@ngrx/entity';
import {Task} from '../../features/tasks/task.model';
import {IssueStateMap} from '../../features/issue/issue';
import {BookmarkState} from '../../features/bookmark/store/bookmark.reducer';
import {NoteState} from '../../features/note/store/note.reducer';
import {Reminder} from '../../features/reminder/reminder.model';
import {Attachment} from '../../features/attachment/attachment.model';
import {ProjectArchive} from '../../features/project/project.model';


export interface AppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfig;
  reminders?: Reminder[];
}

export interface AppDataForProjects {
  note?: {
    [key: string]: NoteState;
  };
  bookmark?: {
    [key: string]: BookmarkState;
  };
  task?: {
    [key: string]: TaskState;
  };
  taskArchive?: {
    [key: string]: EntityState<Task>;
  };
  taskAttachment?: {
    [key: string]: EntityState<Attachment>;
  };
  metric?: {
    [key: string]: EntityState<Attachment>;
  };
  improvement?: {
    [key: string]: EntityState<Attachment>;
  };
  obstruction?: {
    [key: string]: EntityState<Attachment>;
  };
  issue?: {
    [key: string]: IssueStateMap;
  };
}

// NOTE: [key:string] always refers to projectId
export interface AppDataComplete extends AppBaseData, AppDataForProjects {
  lastActiveTime: string;
}


export interface AppDataCompleteCfgBasicEntry {
  appDataKey: keyof AppBaseData;
  load: () => Promise<any>;
  save: (state: any, isForce?: boolean) => Promise<any>;
}


export interface AppDataCompleteCfgForProjectEntry {
  appDataKey: keyof AppDataForProjects;
  load: (id: string) => Promise<EntityState<any>>;
  save: (id: string, state: any, isForce?: boolean) => Promise<any>;
  remove: (id: string) => Promise<any>;
}
