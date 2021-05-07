import { TaskReminderOptionId } from '../task.model';

export const remindOptionToMilliseconds = (
  plannedAt: number,
  remindOptId: TaskReminderOptionId,
): number | undefined => {
  switch (remindOptId) {
    case TaskReminderOptionId.AtStart: {
      return plannedAt;
    }
    case TaskReminderOptionId.m5: {
      // prettier-ignore
      return plannedAt - (5 * 60 * 1000);
    }
    case TaskReminderOptionId.m10: {
      // prettier-ignore
      return plannedAt - (10 * 60 * 1000);
    }
    case TaskReminderOptionId.m15: {
      // prettier-ignore
      return plannedAt - (15 * 60 * 1000);
    }
    case TaskReminderOptionId.m30: {
      // prettier-ignore
      return plannedAt - (30 * 60 * 1000);
    }
    case TaskReminderOptionId.h1: {
      // prettier-ignore
      return plannedAt - (60 * 60 * 1000);
    }
  }
  return undefined;
};

export const millisecondsDiffToRemindOption = (
  plannedAt: number,
  remindAt?: number,
): TaskReminderOptionId => {
  if (typeof remindAt !== 'number') {
    return TaskReminderOptionId.DoNotRemind;
  }

  const diff: number = (plannedAt as number) - remindAt;
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
  } else if (diff === 0) {
    return TaskReminderOptionId.AtStart;
  } else {
    return TaskReminderOptionId.DoNotRemind;
  }
};
