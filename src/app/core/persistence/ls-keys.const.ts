import {ProjectDataLsKey} from './persistence';

export const LS_PREFIX = 'SUP_';
export const LS_PROJECT_PREFIX = LS_PREFIX + 'P_';

// special fields
export const LS_IS_V1_MIGRATE = LS_PREFIX + 'IS_V1_MIGRATE';
export const LS_BACKUP = LS_PREFIX + 'COMPLETE_BACKUP';
export const LS_LAST_ACTIVE = LS_PREFIX + 'LAST_ACTIVE';

// global model
export const LS_GLOBAL_CFG = LS_PREFIX + 'GLOBAL_CFG';
export const LS_PROJECT_META_LIST = LS_PREFIX + 'PROJECT_META_LIST';
export const LS_IMPROVEMENT_STATE = LS_PREFIX + 'IMPROVEMENT_STATE';
export const LS_OBSTRUCTION_STATE = LS_PREFIX + 'OBSTRUCTION_STATE';

// special models
export const LS_REMINDER = LS_PREFIX + 'REMINDER';
export const LS_PROJECT_ARCHIVE = LS_PREFIX + 'ARCHIVE';

// project model
export const LS_TASK_ARCHIVE: ProjectDataLsKey = 'TASKS_ARCHIVE';
export const LS_TASK_STATE: ProjectDataLsKey = 'TASKS_STATE';
export const LS_TASK_ATTACHMENT_STATE: ProjectDataLsKey = 'TASK_ATTACHMENT_STATE';
export const LS_ISSUE_STATE: ProjectDataLsKey = 'ISSUE_STATE';
export const LS_NOTE_STATE: ProjectDataLsKey = 'NOTE_STATE';
export const LS_BOOKMARK_STATE: ProjectDataLsKey = 'BOOKMARK_STATE';
export const LS_METRIC_STATE: ProjectDataLsKey = 'METRIC_STATE';


// REAL LS
// -------
export const LS_GITHUB_ISSUE_CACHE_PREFIX = LS_PREFIX + 'GITHUB_ISSUE_CACHE_';

// SESSION STORAGE
const SS_PREFIX = 'SUP_SS_';
export const SS_NOTE_TMP = SS_PREFIX + 'NOTE_TMP_EDIT';
export const SS_PROJECT_TMP = SS_PREFIX + 'PROJECT_TMP_EDIT';
export const SS_GOOGLE_TIME_SUBMITTED = SS_PREFIX + 'GOOGLE_TIME_SUBMITTED';

// REAL LS
export const LS_DAILY_SUMMARY_TAB_INDEX = 'DAILY_SUMMARY_TAB_INDEX_P_';
