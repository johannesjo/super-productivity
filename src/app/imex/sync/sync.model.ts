import {ProjectState} from '../../features/project/store/project.reducer';
import {TaskState} from '../../features/tasks/store/task.reducer';
import {GlobalConfigState} from '../../features/config/global-config.model';
import {TaskArchive} from '../../features/tasks/task.model';
import {IssueStateMap} from '../../features/issue/issue';
import {BookmarkState} from '../../features/bookmark/store/bookmark.reducer';
import {NoteState} from '../../features/note/store/note.reducer';
import {Reminder} from '../../features/reminder/reminder.model';
import {ProjectArchive} from '../../features/project/project.model';
import {MetricState} from '../../features/metric/metric.model';
import {ImprovementState} from '../../features/metric/improvement/improvement.model';
import {ObstructionState} from '../../features/metric/obstruction/obstruction.model';
import {TaskRepeatCfgState} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import {AttachmentState} from '../../features/attachment/store/attachment.reducer';


export interface AppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfigState;
  reminders?: Reminder[];
}

// NOTE: [key:string] always refers to projectId
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
  taskRepeatCfg?: {
    [key: string]: TaskRepeatCfgState;
  };
  taskArchive?: {
    [key: string]: TaskArchive;
  };
  taskAttachment?: {
    [key: string]: AttachmentState;
  };
  metric?: {
    [key: string]: MetricState;
  };
  improvement?: {
    [key: string]: ImprovementState;
  };
  obstruction?: {
    [key: string]: ObstructionState;
  };
  issue?: {
    [key: string]: IssueStateMap;
  };
}

export interface AppDataComplete extends AppBaseData, AppDataForProjects {
  lastActiveTime: string;
}

