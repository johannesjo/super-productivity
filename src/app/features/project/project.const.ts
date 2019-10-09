import {Project, ProjectThemeCfg} from './project.model';
import {DEFAULT_ISSUE_PROVIDER_CFGS} from '../issue/issue.const';
import {getYesterdaysDate} from '../../util/get-yesterdays-date';
import {getWorklogStr} from '../../util/get-work-log-str';
import {WorklogExportSettings, WorklogGrouping} from '../worklog/worklog.model';

export const WORKLOG_EXPORT_DEFAULTS: WorklogExportSettings = {
  cols: ['DATE', 'START', 'END', 'TIME_CLOCK', 'TITLES_INCLUDING_SUB'],
  roundWorkTimeTo: null,
  roundStartTimeTo: null,
  roundEndTimeTo: null,
  separateTasksBy: ' | ',
  groupBy: WorklogGrouping.DATE
};

export const DEFAULT_PROJECT_THEME: ProjectThemeCfg = {
  isAutoContrast: true,
  primary: '#0b77d2',
  huePrimary: '500',
  accent: '#ff4081',
  hueAccent: '500',
  warn: '#e11826',
  hueWarn: '500',
};

export const DEFAULT_PROJECT: Project = {
  id: null,
  title: '',
  themeColor: '',
  isArchived: false,
  timeWorkedWithoutBreak: null,
  theme: DEFAULT_PROJECT_THEME,
  issueIntegrationCfgs: DEFAULT_ISSUE_PROVIDER_CFGS,
  advancedCfg: {
    worklogExportSettings: WORKLOG_EXPORT_DEFAULTS,
  },
  workStart: {},
  workEnd: {},
  lastCompletedDay: getWorklogStr(getYesterdaysDate()),
  breakTime: {},
  breakNr: {},
};


export const DEFAULT_PROJECT_ID = 'DEFAULT';

export const FIRST_PROJECT: Project = {
  ...DEFAULT_PROJECT,
  id: DEFAULT_PROJECT_ID,
  title: 'Super Productivity',
  workStart: {},
  workEnd: {},
  theme: DEFAULT_PROJECT_THEME
};
