import { IssueIntegrationCfgs, IssueProviderKey } from '../issue/issue';


export type RoundTimeOption = 'QUARTER' | 'HALF' | 'HOUR';

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
  separateTasksBy: string;
  separateFieldsBy: string;
  isListSubTasks: boolean;
  isListDoneOnly: boolean;
  isMergeToDays: boolean;
  isWorkedOnTodayOnly: boolean;
  isShowTitle: boolean;
  isShowTimeSpent: boolean;
  isShowTimeEstimate: boolean;
  isTimesAsMilliseconds: boolean;
  isShowDate: boolean;
  regExToRemove: string;
}

export type SimpleSummarySettings = Readonly<SimpleSummarySettingsCopy>;

export type ProjectAdvancedCfg = Readonly<{
  googleTimeSheetExport: GoogleTimeSheetExport;
  simpleSummarySettings: SimpleSummarySettings;
}>;

export type ProjectAdvancedCfgKey = keyof ProjectAdvancedCfg;

export type Project = Readonly<{
  id: string;
  title: string;
  themeColor: string;
  isDarkTheme: boolean;
  isReducedTheme: boolean;
  startedTimeToday: number;
  timeWorkedWithoutBreak: number;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  advancedCfg: ProjectAdvancedCfg;
}>;

export type ProjectCfgFormKey = ProjectAdvancedCfgKey | IssueProviderKey | 'basic';


