/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

export enum MODEL_VERSION {
  // issueProvider model
  TASK = 4.1,
  // needs to be always the same as TASK !!!
  TASK_ARCHIVE = MODEL_VERSION.TASK,
  // issueProvider model
  PROJECT = 7.0,
  ISSUE_PROVIDER = 1.1,
  GLOBAL_CONFIG = 3.51,
  METRIC = 1.0,
  SIMPLE_COUNTER = 2.0,
  NOTE = 1.0,
  TAG = 1.0,
  TASK_REPEAT = 1.43,

  // eslint-disable-next-line @typescript-eslint/naming-convention
  ___NOT_USED_YET___ = 0,
}
