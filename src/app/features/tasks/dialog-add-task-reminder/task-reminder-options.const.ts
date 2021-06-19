import { TaskReminderOption, TaskReminderOptionId } from '../task.model';
import { T } from '../../../t.const';

export const taskReminderOptions: TaskReminderOption[] = [
  {
    // id: TaskReminderOptionId.DoNotRemind,
    // title: 'Dont show reminder',
    // }, {
    id: TaskReminderOptionId.AtStart,
    title: T.F.TASK.D_REMINDER_ADD.RO_START,
  },
  {
    id: TaskReminderOptionId.m5,
    title: T.F.TASK.D_REMINDER_ADD.RO_5M,
  },
  {
    id: TaskReminderOptionId.m10,
    title: T.F.TASK.D_REMINDER_ADD.RO_10M,
  },
  {
    id: TaskReminderOptionId.m15,
    title: T.F.TASK.D_REMINDER_ADD.RO_15M,
  },
  {
    id: TaskReminderOptionId.m30,
    title: T.F.TASK.D_REMINDER_ADD.RO_30M,
  },
  {
    id: TaskReminderOptionId.h1,
    title: T.F.TASK.D_REMINDER_ADD.RO_1H,
  },
];
