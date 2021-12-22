import { Reminder } from './reminder.model';
import { WorkContextType } from '../work-context/work-context.model';

export const migrateReminders = (reminders: Reminder[]): Reminder[] => {
  if (!Array.isArray(reminders)) {
    if (confirm('Migration: No reminders found. Proceed')) {
      return [];
    } else {
      throw new Error('Reminders missing during migration.');
    }
  }

  return reminders.map((reminder) => {
    // eslint-disable-next-line
    if ((reminder as any)['projectId']) {
      const { projectId, ...newReminder } = reminder as any;
      return {
        ...newReminder,
        workContextId: projectId,
        workContextType: WorkContextType.PROJECT,
      };
    }
    return reminder;
  });
};
