import { ProjectState } from '../../project/store/project.reducer';
import { TaskState } from '../../tasks/store/task.reducer';
import { GlobalConfig } from '../config/config.model';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';
import { IssueStateMap } from '../../issue/issue';
import { BookmarkState } from '../../bookmark/store/bookmark.reducer';
import { NoteState } from '../../note/store/note.reducer';


// NOTE: [key:string] always refers to projectId
export interface AppDataComplete {
  lastActiveTime: string;
  project: ProjectState;
  globalConfig: GlobalConfig;
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
    [key: string]: EntityState<Task>;
  };
  issue?: {
    [key: string]: IssueStateMap;
  };
}
