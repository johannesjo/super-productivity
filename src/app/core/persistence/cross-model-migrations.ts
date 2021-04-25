import { AppDataComplete } from '../../imex/sync/sync.model';

export const crossModelMigrations = (data: AppDataComplete): AppDataComplete => {
  return migrateTaskReminders(data);
};

function migrateTaskReminders(data: AppDataComplete): AppDataComplete {
  if (data?.task?.ids.length && data?.reminders?.length) {
    data.reminders.forEach((reminder) => {
      const task = data.task.entities[reminder.relatedId];
      if (task && task.reminderId && !task.plannedAt) {
        // @ts-ignore
        task.plannedAt = reminder.remindAt;
      }
    });
  }
  return data;
}
