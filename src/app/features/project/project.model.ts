import { IssueIntegrationCfgs, IssueProviderKey } from '../issue/issue';


export type RoundTimeOption = 'QUARTER' | 'HALF' | 'HOUR';

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
  'DATE'
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

export interface WorklogExportSettingsCopy {
  roundWorkTimeTo: RoundTimeOption;
  roundStartEndTimeTo: RoundTimeOption;
  separateTasksBy: string;
  cols: WorklogColTypes[];
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
  timeWorkedWithoutBreak: number;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  advancedCfg: ProjectAdvancedCfg;
  workStart: WorkStartEnd;
  workEnd: WorkStartEnd;
}>;

export type ProjectCfgFormKey = ProjectAdvancedCfgKey | IssueProviderKey | 'basic';


