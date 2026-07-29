import { OperationCaptureService } from '../../op-log/capture/operation-capture.service';
import { OperationWriteFlushService } from '../../op-log/sync/operation-write-flush.service';
import { isDispatchDurable } from './draft-durability.util';

describe('isDispatchDurable', () => {
  const captureWith = ({
    pending = 0,
    persistFailure = false,
  }: {
    pending?: number | (() => number);
    persistFailure?: boolean;
  } = {}): OperationCaptureService =>
    ({
      getPendingCount: () => (typeof pending === 'function' ? pending() : pending),
      hasUnrecoveredPersistFailure: () => persistFailure,
    }) as unknown as OperationCaptureService;

  // Stands in for the real two-phase method: it drains the write queue, takes
  // the op-log lock, and only then runs `fn` — retrying if a capture lands in
  // the gap. `onDrain` lets a test model state the drain itself resolves.
  const flushWith = (onDrain: () => void = () => {}): OperationWriteFlushService =>
    ({
      flushThenRunExclusive: async <T>(fn: () => Promise<T>): Promise<T> => {
        onDrain();
        return fn();
      },
    }) as unknown as OperationWriteFlushService;

  it('reports durable once the queue drained with nothing left in flight', async () => {
    expect(await isDispatchDurable(flushWith(), captureWith())).toBe(true);
  });

  it('reads the risk AFTER the drain, so an in-flight write is not called a failure', async () => {
    // The ordinary case: the note update's own operation is still pending at
    // dispatch time and the drain is what completes it. Read the risk before
    // draining (or outside the exclusive section) and every normal save reports
    // unproven, costing a recovery prompt on text that was written -> red.
    let pending = 1;

    const durable = await isDispatchDurable(
      flushWith(() => {
        pending = 0;
      }),
      captureWith({ pending: () => pending }),
    );

    expect(durable).toBe(true);
  });

  it('reports not durable when the cutoff is never reached', async () => {
    // flushThenRunExclusive throws on a drain timeout, a lock-acquisition
    // timeout, or continuous dispatch activity. The operation may still be
    // unwritten, so the draft stays the only recoverable copy of that text.
    const stuck = {
      flushThenRunExclusive: () =>
        Promise.reject(
          new Error('Operation write flush timeout: 1 pending operation(s).'),
        ),
    } as unknown as OperationWriteFlushService;

    expect(await isDispatchDurable(stuck, captureWith())).toBe(false);
  });

  it('reports not durable while a captured action is still awaiting persistence', async () => {
    expect(await isDispatchDurable(flushWith(), captureWith({ pending: 1 }))).toBe(false);
  });

  it('reports not durable after an unrecovered persist failure', async () => {
    // Live state is ahead of the op log and stays that way until reload, so a
    // dispatch made in this state has no durable operation behind it.
    expect(
      await isDispatchDurable(flushWith(), captureWith({ persistFailure: true })),
    ).toBe(false);
  });
});
