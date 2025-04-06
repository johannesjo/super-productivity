import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { ArchiveModel } from '../../features/time-tracking/time-tracking.model';

export const validateArchive = <R>(d: ArchiveModel | R): boolean =>
  typeof d === 'object' &&
  d !== null &&
  'task' in d &&
  isEntityStateConsistent(d.task) &&
  typeof d.lastTimeTrackingFlush === 'number' &&
  typeof d.timeTracking.project === 'object' &&
  typeof d.timeTracking.tag === 'object';
