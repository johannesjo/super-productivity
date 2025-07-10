import { TaskReminderOptionId } from '../task.model';
import { devError } from '../../../util/dev-error';
import { TaskLog } from '../../../core/log';

export const remindOptionToMilliseconds = (
  due: number,
  remindOptId: TaskReminderOptionId,
): number | undefined => {
  switch (remindOptId) {
    case TaskReminderOptionId.AtStart: {
      return due;
    }
    case TaskReminderOptionId.m5: {
      // prettier-ignore
      return due - (5 * 60 * 1000);
    }
    case TaskReminderOptionId.m10: {
      // prettier-ignore
      return due - (10 * 60 * 1000);
    }
    case TaskReminderOptionId.m15: {
      // prettier-ignore
      return due - (15 * 60 * 1000);
    }
    case TaskReminderOptionId.m30: {
      // prettier-ignore
      return due - (30 * 60 * 1000);
    }
    case TaskReminderOptionId.h1: {
      // prettier-ignore
      return due - (60 * 60 * 1000);
    }
  }
  return undefined;
};

export const millisecondsDiffToRemindOption = (
  due: number,
  remindAt?: number,
): TaskReminderOptionId => {
  if (typeof remindAt !== 'number') {
    return TaskReminderOptionId.DoNotRemind;
  }
  const diff: number = due - remindAt;
  if (diff >= 60 * 60 * 1000) {
    return TaskReminderOptionId.h1;
  } else if (diff >= 30 * 60 * 1000) {
    return TaskReminderOptionId.m30;
  } else if (diff >= 15 * 60 * 1000) {
    return TaskReminderOptionId.m15;
  } else if (diff >= 10 * 60 * 1000) {
    return TaskReminderOptionId.m10;
  } else if (diff >= 5 * 60 * 1000) {
    return TaskReminderOptionId.m5;
  } else if (diff <= 0) {
    return TaskReminderOptionId.AtStart;
  } else {
    TaskLog.log(due, remindAt);
    devError('Cannot determine remind option. Invalid params');
    return TaskReminderOptionId.DoNotRemind;
  }
};
