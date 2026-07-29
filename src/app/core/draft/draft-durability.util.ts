import { OperationCaptureService } from '../../op-log/capture/operation-capture.service';
import { OperationWriteFlushService } from '../../op-log/sync/operation-write-flush.service';
import { getPhantomChangeRisk } from '../../op-log/capture/phantom-change-guard.util';
import { Log } from '../log';

/**
 * Whether a just-dispatched entity update is backed by a durably written
 * operation — the evidence a draft needs before it may be retired as SAVED.
 *
 * A reducer applies an action synchronously, so the store showing the new text
 * says nothing about whether an operation for it reached disk. Between the two
 * sit exactly the states {@link getPhantomChangeRisk} enumerates: a write still
 * in flight, an action deferred by a sync window, or a persist failure that
 * left live state permanently ahead of the log.
 *
 * The risk is read INSIDE flushThenRunExclusive so the answer cannot be spoiled
 * by unrelated dispatch activity: the pending counter and the deferred buffer
 * are global, so a background tick (e.g. time tracking) landing between a plain
 * flush and the read would report a perfectly durable save as unproven. That
 * method already drains, takes the op-log lock, and retries the cutoff when
 * something lands in the gap — the same race, already solved.
 *
 * Fails CLOSED: any doubt reports false, which leaves the draft unresolved and
 * costs at most one extra recovery prompt. Reporting true wrongly is what costs
 * text — the read side would treat the only remaining copy of the edit as
 * already saved. Both failure paths log, because "not durable" is otherwise
 * indistinguishable from a permanently stuck write pipeline.
 *
 * Deliberately its own file: the draft lifecycle needs one fact from the op log,
 * and keeping the dependency here means LocalDraftService itself stays free of
 * the core -> sync edge it already goes out of its way to avoid.
 */
export const isDispatchDurable = async (
  writeFlush: OperationWriteFlushService,
  operationCapture: OperationCaptureService,
): Promise<boolean> => {
  try {
    return await writeFlush.flushThenRunExclusive(async () => {
      const risk = getPhantomChangeRisk(operationCapture);
      if (risk) {
        Log.err(
          'isDispatchDurable: dispatch not durable, leaving the draft recoverable',
          risk,
        );
        return false;
      }
      return true;
    });
  } catch (e) {
    // Drain timeout, lock-acquisition timeout, or an unreachable cutoff. Only
    // the first of those logs on its own, so log here or a wedged pipeline
    // silently stops every draft in the session from ever being resolved.
    Log.err('isDispatchDurable: could not prove the dispatch was written', e);
    return false;
  }
};
