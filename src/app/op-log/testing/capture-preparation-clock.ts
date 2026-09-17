import { mergeVectorClocks } from '../../core/util/vector-clock';
import { VectorClock } from '../core/operation.types';
import { VectorClockService } from '../sync/vector-clock.service';

export type CapturePreparationClockReader = Pick<
  VectorClockService,
  'getCurrentVectorClock' | 'getFullVectorClock'
>;

/**
 * Reads the clock the Stage A capture preparation attaches to its candidate.
 *
 * Extracted so the baseline reproduction spec exercises the reader the
 * experiment actually uses instead of a copy of it. The two sources differ in
 * what they prove: the durable clock behind `getCurrentVectorClock()` advances
 * only when reducers commit, while `getFullVectorClock()` merges every RETAINED
 * op — including rejected ones and remote ops whose application failed or is
 * still pending. Merging them yields proof of what this device DOWNLOADED, not
 * of what it APPLIED. See
 * `testing/integration/capture-preparation-baseline.integration.spec.ts`.
 */
export const readCapturePreparationClock = async (
  clocks: CapturePreparationClockReader,
): Promise<VectorClock> =>
  mergeVectorClocks(
    await clocks.getCurrentVectorClock(),
    await clocks.getFullVectorClock(),
  );
