import {WorkContext, WorkContextCommon} from './work-context.model';
import {WORKLOG_EXPORT_DEFAULTS} from '../project/project.const';
import {getWorklogStr} from '../../util/get-work-log-str';
import {getYesterdaysDate} from '../../util/get-yesterdays-date';

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
