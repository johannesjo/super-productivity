import { TaskReminderOptionId } from '../../tasks/task.model';
import {
  TASK_REMINDER_OPTIONS,
  TASK_REMINDER_OPTIONS_WITHOUT_LONG_LEAD,
} from './task-reminder-options.const';

describe('task reminder options', () => {
  const LONG_LEAD = [
    TaskReminderOptionId.d1,
    TaskReminderOptionId.d3,
    TaskReminderOptionId.w1,
  ];

  it('should offer the long lead times for a task reminder', () => {
    const values = TASK_REMINDER_OPTIONS.map((opt) => opt.value);
    LONG_LEAD.forEach((id) => expect(values).toContain(id));
  });

  it('should keep the long lead times out where the option id is persisted', () => {
    const values = TASK_REMINDER_OPTIONS_WITHOUT_LONG_LEAD.map((opt) => opt.value);
    LONG_LEAD.forEach((id) => expect(values).not.toContain(id));
    expect(values).toContain(TaskReminderOptionId.h1);
    expect(values.length).toBe(TASK_REMINDER_OPTIONS.length - LONG_LEAD.length);
  });
});
