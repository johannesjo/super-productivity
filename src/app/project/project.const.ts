import { GoogleTimeSheetExport, Project, SimpleSummarySettings } from './project.model';

export const SIMPLE_SUMMARY_DEFAULTS: SimpleSummarySettings = {
  separateBy: '',
  separateFieldsBy: ';',
  isUseNewLine: true,
  isListSubTasks: true,
  isListDoneOnly: false,
  isWorkedOnTodayOnly: true,
  isShowTitle: true,
  isShowTimeSpent: true,
  isShowTimeEstimate: true,
  isTimesAsMilliseconds: false,
  isShowDate: false,
  regExToRemove: '',
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
  startedTimeToday: null,
  timeWorkedWithoutBreak: null,
  issueIntegrationCfgs: {},
  advancedCfg: {
    googleTimeSheetExport: GOOGLE_TIME_SHEET_EXPORT_DEFAULTS,
    simpleSummarySettings: SIMPLE_SUMMARY_DEFAULTS
  },
};


export const FIRST_PROJECT: Project = {
  ...DEFAULT_PROJECT,
  id: 'DEFAULT',
  title: 'Super Productivity',
  themeColor: 'light-blue',
  isDarkTheme: false,
};
