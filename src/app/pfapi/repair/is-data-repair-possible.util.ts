import { AppDataCompleteLegacy } from '../../imex/sync/sync.model';
import { AppDataCompleteNew } from '../pfapi-config';

export const isDataRepairPossible = (
  data: AppDataCompleteLegacy | AppDataCompleteNew,
): boolean => {
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
