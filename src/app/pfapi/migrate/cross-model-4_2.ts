import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';
import { getWorklogStr } from '../../util/get-work-log-str';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_2: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.2__________________');
  const copy = fullData;

  // Migrate lastTaskCreation (timestamp) to lastTaskCreationDay (date string)
  Object.keys(copy.taskRepeatCfg.entities).forEach((id) => {
    const repeatCfg = copy.taskRepeatCfg.entities[id]!;
    if ('lastTaskCreation' in repeatCfg) {
      // Convert timestamp to date string
      const timestamp = (repeatCfg as any).lastTaskCreation;
      // @ts-ignore - We're migrating from old field to new field
      repeatCfg.lastTaskCreationDay = getWorklogStr(timestamp);
      // @ts-ignore - Remove old field
      delete (repeatCfg as any).lastTaskCreation;
    }
  });

  PFLog.log('Migrated lastTaskCreation to lastTaskCreationDay', copy);
  return copy;
}) as CrossModelMigrateFn;
