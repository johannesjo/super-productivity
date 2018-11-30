import { IssueIntegrationCfg } from '../issue/issue';
import { JiraCfg } from '../issue/jira/jira';

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GIT?: IssueIntegrationCfg;
}

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
  separateBy: string,
  separateFieldsBy: string,
  isUseNewLine: boolean,
  isListSubTasks: boolean,
  isListDoneOnly: boolean,
  isWorkedOnTodayOnly: boolean,
  showTitle: boolean,
  showTimeSpent: boolean,
  isTimeSpentAsMilliseconds: boolean,
  showDate: boolean,
  regExToRemove: string,
}

export type SimpleSummarySettings = Readonly<SimpleSummarySettingsCopy>;

export type Project = Readonly<{
  id: string;
  title: string;
  themeColor: string;
  isDarkTheme: boolean;
  startedTimeToday: number;
  timeWorkedWithoutBreak: number;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  googleTimeSheetExport: GoogleTimeSheetExport;
  simpleSummarySettings: SimpleSummarySettings;
}>;

