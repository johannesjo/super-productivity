import { ProjectDataLsKey } from './persistence';

export const LS_PREFIX = 'SUP_';
export const LS_PROJECT_PREFIX = LS_PREFIX + 'P_';
export const LS_GLOBAL_CFG = LS_PREFIX + 'GLOBAL_CFG';
export const LS_BACKUP = LS_PREFIX + 'COMPLETE_BACKUP';
export const LS_LAST_ACTIVE = LS_PREFIX + 'LAST_ACTIVE';

export const LS_PROJECT_META_LIST = LS_PREFIX + 'PROJECT_META_LIST';
export const LS_PROJECT_CFG: ProjectDataLsKey = 'CFG';
export const LS_TASK_ARCHIVE: ProjectDataLsKey = 'TASKS_ARCHIVE';
export const LS_TASK_STATE: ProjectDataLsKey = 'TASKS_STATE';
export const LS_ISSUE_STATE: ProjectDataLsKey = 'ISSUE_STATE';
export const LS_BOOKMARK_STATE: ProjectDataLsKey = 'BOOKMARK_STATE';
