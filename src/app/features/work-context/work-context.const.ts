import {WorkContextCommon} from './work-context.model';
import {getWorklogStr} from '../../util/get-work-log-str';
import {getYesterdaysDate} from '../../util/get-yesterdays-date';
import {WorklogExportSettings, WorklogGrouping} from '../worklog/worklog.model';

export const WORKLOG_EXPORT_DEFAULTS: WorklogExportSettings = {
  cols: ['DATE', 'START', 'END', 'TIME_CLOCK', 'TITLES_INCLUDING_SUB'],
  roundWorkTimeTo: null,
  roundStartTimeTo: null,
  roundEndTimeTo: null,
  separateTasksBy: ' | ',
  groupBy: WorklogGrouping.DATE
};

export const WORK_CONTEXT_DEFAULT_COMMON: WorkContextCommon = {
  advancedCfg: {
    worklogExportSettings: WORKLOG_EXPORT_DEFAULTS,
  },
  workStart: {},
  workEnd: {},
  lastCompletedDay: getWorklogStr(getYesterdaysDate()),
  breakTime: {},
  breakNr: {},
};
