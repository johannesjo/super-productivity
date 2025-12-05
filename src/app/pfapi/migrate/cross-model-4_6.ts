import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';

interface LegacyReminder {
  id: string;
  remindAt: number;
  title: string;
  type: 'NOTE' | 'TASK';
  relatedId: string;
}

/**
 * Migration 4.6: Move reminders to task.remindAt
 *
 * This migration:
 * 1. Reads all reminders from the legacy reminders array
 * 2. For TASK reminders, updates the corresponding task's remindAt field
 * 3. Discards NOTE reminders (feature discontinued)
 * 4. Clears the reminders array
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_6: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.6 (Reminder Migration)__________________');
  const copy = fullData;

  const reminders = (copy.reminders || []) as LegacyReminder[];

  if (reminders.length === 0) {
    PFLog.log('No reminders to migrate');
    return copy;
  }

  PFLog.log(`Migrating ${reminders.length} reminders to task.remindAt`);

  let migratedCount = 0;
  let skippedNotes = 0;
  let skippedMissing = 0;

  for (const reminder of reminders) {
    if (reminder.type === 'NOTE') {
      // Note reminders are discontinued
      skippedNotes++;
      PFLog.log(`Skipping NOTE reminder: ${reminder.id}`);
      continue;
    }

    if (reminder.type === 'TASK') {
      const task = copy.task?.entities?.[reminder.relatedId];
      if (task) {
        // Update the task with remindAt
        // @ts-ignore - modifying readonly entity
        copy.task.entities[reminder.relatedId] = {
          ...task,
          remindAt: reminder.remindAt,
        };
        migratedCount++;
        PFLog.log(`Migrated reminder for task: ${reminder.relatedId}`);
      } else {
        // Task not found (might be archived or deleted)
        skippedMissing++;
        PFLog.log(`Task not found for reminder: ${reminder.relatedId}`);
      }
    }
  }

  // Clear the reminders array
  // @ts-ignore
  copy.reminders = [];

  PFLog.log(
    `Migration complete: ${migratedCount} migrated, ${skippedNotes} NOTE reminders skipped, ${skippedMissing} missing tasks`,
  );
  PFLog.log(copy);
  return copy;
}) as CrossModelMigrateFn;
