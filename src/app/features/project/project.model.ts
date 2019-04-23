import {IssueIntegrationCfgs, IssueProviderKey, IssueStateMap} from '../issue/issue';
import {NoteState} from '../note/store/note.reducer';
import {BookmarkState} from '../bookmark/store/bookmark.reducer';
import {TaskState} from '../tasks/store/task.reducer';
import {EntityState} from '@ngrx/entity';
import {Task} from '../tasks/task.model';
import {Attachment} from '../attachment/attachment.model';


export type RoundTimeOption = '5M' | 'QUARTER' | 'HALF' | 'HOUR';

export interface WorkStartEndCopy {
  [key: string]: number;
}

export type WorkStartEnd = Readonly<WorkStartEndCopy>;

export interface GoogleTimeSheetExportCopy {
  spreadsheetId: string;
  isAutoLogin: boolean;
  isAutoFocusEmpty: boolean;
  isRoundWorkTimeUp: boolean;
  roundStartTimeTo: RoundTimeOption;
  roundEndTimeTo: RoundTimeOption;
  roundWorkTimeTo: RoundTimeOption;
  defaultValues: string[];
  lastExported: string;
}

export type GoogleTimeSheetExport = Readonly<GoogleTimeSheetExportCopy>;

export interface SimpleSummarySettingsCopy {
  roundWorkTimeTo: RoundTimeOption;
  separateTasksBy: string;
  separateFieldsBy: string;
  isShowAsText: boolean;
  isListSubTasks: boolean;
  isListDoneOnly: boolean;
  isWorkedOnTodayOnly: boolean;
  isShowTitle: boolean;
  isShowTimeSpent: boolean;
  isShowTimeEstimate: boolean;
  isTimesAsMilliseconds: boolean;
  isShowDate: boolean;
}

export type SimpleSummarySettings = Readonly<SimpleSummarySettingsCopy>;


export type WorklogColTypes =
  'EMPTY'
  | 'DATE'
  | 'START'
  | 'END'
  | 'TITLES'
  | 'TITLES_INCLUDING_SUB'
  | 'TIME_MS'
  | 'TIME_STR'
  | 'TIME_CLOCK'
  | 'ESTIMATE_MS'
  | 'ESTIMATE_STR'
  | 'ESTIMATE_CLOCK'
  ;

export enum WorklogGrouping {
  DATE = 'DATE',
  PARENT = 'PARENT',
  TASK = 'TASK',
  WORKLOG = 'WORKLOG'
}

export interface WorklogExportSettingsCopy {
  roundWorkTimeTo: RoundTimeOption;
  roundStartTimeTo: RoundTimeOption;
  roundEndTimeTo: RoundTimeOption;
  separateTasksBy: string;
  cols: WorklogColTypes[];
  groupBy: WorklogGrouping;
}

export type WorklogExportSettings = Readonly<WorklogExportSettingsCopy>;

export type ProjectAdvancedCfg = Readonly<{
  googleTimeSheetExport: GoogleTimeSheetExport;
  simpleSummarySettings: SimpleSummarySettings;
  worklogExportSettings: WorklogExportSettings;
}>;

export type ProjectAdvancedCfgKey = keyof ProjectAdvancedCfg;

export type Project = Readonly<{
  id: string;
  title: string;
  themeColor: string;
  isDarkTheme: boolean;
  isReducedTheme: boolean;
  isArchived: boolean;
  timeWorkedWithoutBreak: number;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  advancedCfg: ProjectAdvancedCfg;
  workStart: WorkStartEnd;
  workEnd: WorkStartEnd;
}>;

export interface ArchivedProject {
  note?: NoteState;
  bookmark?: BookmarkState;
  task?: TaskState;
  taskArchive?: EntityState<Task>;
  taskAttachment?: EntityState<Attachment>;
  issue?: IssueStateMap;
}

export interface ProjectArchive {
  [key: string]: string;
}


export type ProjectCfgFormKey = ProjectAdvancedCfgKey | IssueProviderKey | 'basic';


