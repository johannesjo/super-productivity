import { ProjectState } from '../../project/store/project.reducer';
import { TaskState } from '../../tasks/store/task.reducer';
import { GlobalConfig } from '../config/config.model';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';
import { IssueEntityMap } from '../../issue/issue';

export interface SyncHandler {
  id: string;
  syncToFn: Function;
  syncFromFn: Function;
}

// NOTE: [key:string] always refers to projectId
export interface AppDataComplete {
  project: ProjectState;
  globalConfig: GlobalConfig;
  task?: {
    [key: string]: TaskState;
  };
  taskArchive?: {
    [key: string]: EntityState<Task>;
  };
  issue?: {
    [key: string]: IssueEntityMap;
  };
}