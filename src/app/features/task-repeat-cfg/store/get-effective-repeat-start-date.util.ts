import { TaskRepeatCfg } from '../task-repeat-cfg.model';

export const getEffectiveRepeatStartDate = (cfg: TaskRepeatCfg): string => {
  if (cfg.repeatFromCompletionDate && cfg.lastTaskCreationDay) {
    return cfg.lastTaskCreationDay;
  }

  return cfg.startDate || '1970-01-01';
};
