import { Project, SimpleSummarySettings } from './project.model';

export const SIMPLE_SUMMARY_DEFAULTS: SimpleSummarySettings = {
  separateBy: '',
  separateFieldsBy: ';',
  isUseNewLine: true,
  isListSubTasks: true,
  isListDoneOnly: false,
  isWorkedOnTodayOnly: true,
  showTitle: true,
  showTimeSpent: true,
  isTimeSpentAsMilliseconds: false,
  showDate: false,
  regExToRemove: '',
};


export const DEFAULT_PROJECT: Project = {
  id: null,
  title: '',
  themeColor: '',
  isDarkTheme: false,
  startedTimeToday: null,
  timeWorkedWithoutBreak: null,
  issueIntegrationCfgs: {},
  googleTimeSheetExport: {
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
  },
  simpleSummarySettings: SIMPLE_SUMMARY_DEFAULTS
};


export const FIRST_PROJECT: Project = {
  id: 'DEFAULT',
  title: 'Super Productivity',
  themeColor: 'light-blue',
  isDarkTheme: false,
  startedTimeToday: null,
  timeWorkedWithoutBreak: null,
  issueIntegrationCfgs: {},
  googleTimeSheetExport: {
    spreadsheetId: null,
    isAutoLogin: false,
    isAutoFocusEmpty: false,
    isRoundWorkTimeUp: null,
    roundStartTimeTo: null,
    roundEndTimeTo: null,
    roundWorkTimeTo: null,
    defaultValues: [],
    lastExported: null,
  },
  simpleSummarySettings: SIMPLE_SUMMARY_DEFAULTS
};
