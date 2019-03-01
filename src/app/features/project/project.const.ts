import { GoogleTimeSheetExport, Project, SimpleSummarySettings } from './project.model';
import { DEFAULT_ISSUE_PROVIDER_CFGS } from '../issue/issue.const';

export const SIMPLE_SUMMARY_DEFAULTS: SimpleSummarySettings = {
  roundWorkTimeTo: null,
  separateTasksBy: '|',
  separateFieldsBy: ';',
  isListSubTasks: true,
  isListDoneOnly: false,
  isMergeToDays: true,
  isWorkedOnTodayOnly: true,
  isShowTitle: true,
  isShowTimeSpent: true,
  isShowTimeEstimate: true,
  isTimesAsMilliseconds: false,
  isShowDate: false,
};

export const GOOGLE_TIME_SHEET_EXPORT_DEFAULTS: GoogleTimeSheetExport = {
  spreadsheetId: null,
  isAutoLogin: false,
  isAutoFocusEmpty: false,
  isRoundWorkTimeUp: null,
  roundStartTimeTo: null,
  roundEndTimeTo: null,
  roundWorkTimeTo: null,
  lastExported: null,
  defaultValues: [
    '{date}',
    '{startTime}',
    '{currentTime}',
    '{totalTime}',
  ]
};


export const DEFAULT_PROJECT: Project = {
  id: null,
  title: '',
  themeColor: '',
  isDarkTheme: false,
  isReducedTheme: false,
  startedTimeToday: null,
  timeWorkedWithoutBreak: null,
  issueIntegrationCfgs: DEFAULT_ISSUE_PROVIDER_CFGS,
  advancedCfg: {
    googleTimeSheetExport: GOOGLE_TIME_SHEET_EXPORT_DEFAULTS,
    simpleSummarySettings: SIMPLE_SUMMARY_DEFAULTS
  },
};


export const DEFAULT_PROJECT_ID = 'DEFAULT';

export const FIRST_PROJECT: Project = {
  ...DEFAULT_PROJECT,
  id: DEFAULT_PROJECT_ID,
  title: 'Super Productivity',
  themeColor: 'light-blue',
  isDarkTheme: false,
};
