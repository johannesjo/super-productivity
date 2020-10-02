import { AppDataComplete } from '../../imex/sync/sync.model';

export const isDataRepairPossible = (data: AppDataComplete): boolean => {
  return typeof data === 'object' && data !== null
    && typeof data.task === 'object' && data.task !== null
    && typeof data.project === 'object' && data.project !== null;
};
