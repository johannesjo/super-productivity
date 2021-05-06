import { AppDataComplete } from '../../imex/sync/sync.model';

export const isDataRepairPossible = (data: AppDataComplete): boolean => {
  const d: any = data as any;
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof d.task === 'object' &&
    d.task !== null &&
    typeof d.project === 'object' &&
    d.project !== null
  );
};
