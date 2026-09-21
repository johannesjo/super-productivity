import { mergeVectorClocks } from '../../core/util/vector-clock';
import {
  isFullStateOpType,
  OperationLogEntry,
  VectorClock,
} from '../core/operation.types';
import { OperationLogStoreService } from '../persistence/operation-log-store.service';
import { VectorClockService } from './vector-clock.service';

export type CapturePreparationClockReader = Pick<
  VectorClockService,
  'getCurrentVectorClock'
>;

export type CapturePreparationStore = Pick<
  OperationLogStoreService,
  | 'getOpsAfterSeq'
  | 'getLatestFullStateOpEntry'
  | 'isRawRebuildIncomplete'
  | 'getPendingRemoteOps'
  | 'getFailedRemoteOps'
>;

/**
 * True when this device's own reducers established the entry's state.
 *
 * Local full-state ops carry no `applicationStatus` because the op-log captures
 * them after their reducer ran — authoring one IS applying it. Remote ops are
 * applied once reducers commit, which is also when `archive_pending` is set and
 * when the durable clock advances; outstanding archive work does not undo the
 * state. `rejectedAt` excludes both a remote import that never applied and a
 * local import the server refused, which is not a baseline to publish against.
 */
const isAppliedLocally = (entry: OperationLogEntry): boolean =>
  !entry.rejectedAt &&
  (entry.source === 'local' ||
    entry.applicationStatus === 'applied' ||
    entry.applicationStatus === 'archive_pending');

/**
 * Finds the newest full-state replacement this device actually applied.
 *
 * The metadata pointer handles the ordinary case without scanning retained ops.
 * A newest full-state op that has not applied can hide an older applied baseline;
 * only that abnormal case falls back to the retained-log scan.
 */
export const findAppliedFullStateBaseline = async (
  store: CapturePreparationStore,
): Promise<OperationLogEntry | undefined> => {
  const newest = await store.getLatestFullStateOpEntry();
  if (!newest || isAppliedLocally(newest)) return newest;

  const entries = await store.getOpsAfterSeq(0);
  let latest: OperationLogEntry | undefined;
  for (const entry of entries) {
    if (!isFullStateOpType(entry.op.opType)) continue;
    if (!isAppliedLocally(entry)) continue;
    if (!latest || entry.seq > latest.seq) latest = entry;
  }
  return latest;
};

/**
 * Reports why this device may not prepare a capture, or `undefined` if it may.
 *
 * Preparation builds the task itself from live state, so a correct candidate
 * clock is not enough: downloaded-but-unapplied state must not reach the task
 * either. This reuses the conditions the ordinary incomplete-remote sync gate
 * already refuses on rather than inventing a second notion of "ready".
 */
export const findCapturePreparationBlocker = async (
  store: CapturePreparationStore,
): Promise<string | undefined> => {
  const [isRawRebuildIncomplete, pendingRemoteOps, failedRemoteOps] = await Promise.all([
    store.isRawRebuildIncomplete(),
    store.getPendingRemoteOps(),
    store.getFailedRemoteOps(),
  ]);
  if (isRawRebuildIncomplete) return 'an interrupted state rebuild is incomplete';
  if (pendingRemoteOps.length > 0)
    return `${pendingRemoteOps.length} downloaded operation(s) have not been applied`;
  if (failedRemoteOps.length > 0)
    return `${failedRemoteOps.length} downloaded operation(s) failed to apply`;
  return undefined;
};

/**
 * Reads the clock the Stage A capture preparation attaches to its candidate.
 *
 * Both sources are evidence of APPLIED state, deliberately. The durable clock
 * advances only in `markReducersCommittedAndMergeClocks`; the baseline supplies
 * the one case the durable clock under-counts — a local import whose own counter
 * ran ahead of it (backup import plus "Use My Data"). Merging the whole retained
 * log instead, as this reader used to, also imports replacements this device
 * rejected or failed to apply. See
 * `testing/integration/capture-preparation-baseline.integration.spec.ts`.
 */
export const readCapturePreparationClock = async (
  store: CapturePreparationStore,
  clocks: CapturePreparationClockReader,
): Promise<VectorClock> =>
  mergeVectorClocks(
    await clocks.getCurrentVectorClock(),
    (await findAppliedFullStateBaseline(store))?.op.vectorClock ?? {},
  );
