import { TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

/**
 * Gets the effective last task creation day string, with fallback logic for backward compatibility.
 * Prefers lastTaskCreationDay if available, otherwise falls back to lastTaskCreation timestamp.
 *
 * @param cfg The task repeat configuration
 * @returns The date string in YYYY-MM-DD format, or undefined if neither field exists
 */
export const getEffectiveLastTaskCreationDay = (
  cfg: TaskRepeatCfg,
): string | undefined => {
  if (cfg.lastTaskCreationDay) {
    return cfg.lastTaskCreationDay;
  }
  if (cfg.lastTaskCreation) {
    return getDbDateStr(cfg.lastTaskCreation);
  }
  return undefined;
};
