/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

export enum MODEL_VERSION {
  // moving from null to undefined to save data
  TASK = 5.1,
  // needs to be always the same as TASK !!!
  TASK_ARCHIVE = MODEL_VERSION.TASK,
  // remove bookmark model
  PROJECT = 8.0,
  ISSUE_PROVIDER = 1.1,
  // counted up to account for new compression
  GLOBAL_CONFIG = 4,
  METRIC = 1.0,
  SIMPLE_COUNTER = 2.1,
  NOTE = 1.0,
  TAG = 1.0,
  TASK_REPEAT = 1.43,

  // eslint-disable-next-line @typescript-eslint/naming-convention
  ___NOT_USED_YET___ = 0,
}
