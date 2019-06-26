import { GoogleTimeSheetExport, Project, SimpleSummarySettings, WorklogExportSettings } from './project.model';
import { DEFAULT_ISSUE_PROVIDER_CFGS } from '../issue/issue.const';

export const SIMPLE_SUMMARY_DEFAULTS: SimpleSummarySettings = {
  roundWorkTimeTo: null,
  separateTasksBy: ' | ',
  separateFieldsBy: ';',
  isShowAsText: false,
  isListSubTasks: true,
  isListDoneOnly: false,
  isWorkedOnTodayOnly: true,
  isShowTitle: true,
  isShowTimeSpent: true,
  isShowTimeEstimate: true,
  isTimesAsMilliseconds: false,
  isShowDate: false,
};
export const WORKLOG_EXPORT_DEFAULTS: WorklogExportSettings = {
  cols: ['DATE', 'START', 'END', 'TIME_CLOCK', 'TITLES_INCLUDING_SUB'],
  roundWorkTimeTo: null,
  roundStartTimeTo: null,
  roundEndTimeTo: null,
  separateTasksBy: ' | ',
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
  isArchived: false,
  timeWorkedWithoutBreak: null,
  issueIntegrationCfgs: DEFAULT_ISSUE_PROVIDER_CFGS,
  advancedCfg: {
    googleTimeSheetExport: GOOGLE_TIME_SHEET_EXPORT_DEFAULTS,
    simpleSummarySettings: SIMPLE_SUMMARY_DEFAULTS,
    worklogExportSettings: WORKLOG_EXPORT_DEFAULTS,
  },
  workStart: {},
  workEnd: {},
  dayCompleted: {},
  breakTime: {},
  breakNr: {},
};


export const DEFAULT_PROJECT_ID = 'DEFAULT';

export const FIRST_PROJECT: Project = {
  ...DEFAULT_PROJECT,
  id: DEFAULT_PROJECT_ID,
  title: 'Super Productivity',
  themeColor: 'light-blue',
  isDarkTheme: false,
  workStart: {},
  workEnd: {},
};
