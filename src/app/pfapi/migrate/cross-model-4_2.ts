import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';
import { getDbDateStr } from '../../util/get-db-date-str';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_2: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.2__________________');
  const copy = fullData;

  // Ensure both lastTaskCreation and lastTaskCreationDay exist for backward compatibility
  Object.keys(copy.taskRepeatCfg.entities).forEach((id) => {
    const repeatCfg = copy.taskRepeatCfg.entities[id];
    if (!repeatCfg) {
      return; // Skip if entity is null/undefined
    }

    // If only lastTaskCreation exists, add lastTaskCreationDay
    if ('lastTaskCreation' in repeatCfg && !('lastTaskCreationDay' in repeatCfg)) {
      const timestamp = (repeatCfg as any).lastTaskCreation;
      if (timestamp != null && !isNaN(timestamp)) {
        // @ts-ignore - We're adding the new field
        repeatCfg.lastTaskCreationDay = getDbDateStr(timestamp);
      }
    }

    // If only lastTaskCreationDay exists, add lastTaskCreation
    if ('lastTaskCreationDay' in repeatCfg && !('lastTaskCreation' in repeatCfg)) {
      const dateStr = (repeatCfg as any).lastTaskCreationDay;
      if (dateStr && typeof dateStr === 'string') {
        // Parse as UTC date at noon to avoid timezone issues
        // This matches how the dates are handled in get-newest-possible-due-date.util.ts
        const date = new Date(dateStr + 'T12:00:00Z');
        if (!isNaN(date.getTime())) {
          // @ts-ignore - We're adding the old field for compatibility
          repeatCfg.lastTaskCreation = date.getTime();
        }
      }
    }
  });

  PFLog.log('Ensured both lastTaskCreation and lastTaskCreationDay exist', copy);
  return copy;
}) as CrossModelMigrateFn;
