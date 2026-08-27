import { OpLog } from '../../core/log';
import { InvalidFilePrefixError } from '../core/errors/sync-errors';
import { extractSyncFileStateFromPrefix } from './sync-file-prefix';

describe('sync-file-prefix app shim', () => {
  beforeEach(() => {
    spyOn(OpLog, 'log').and.stub();
  });

  it('throws InvalidFilePrefixError without logging raw sync payload content', () => {
    const rawPayload = '{"task":{"entities":{"task1":{"title":"secret task"}}}}';

    expect(() => extractSyncFileStateFromPrefix(rawPayload)).toThrowError(
      InvalidFilePrefixError,
    );

    // JSON.stringify, not join(): the structured meta arg stringifies to
    // `[object Object]` under join, so a payload leaked into it would pass
    // unseen — and the meta is exactly where the diagnostic fields live.
    const logText = JSON.stringify((OpLog.log as jasmine.Spy).calls.allArgs());
    expect(logText).toContain('inputLength');
    expect(logText).not.toContain('secret task');
    expect(logText).not.toContain(rawPayload);
  });

  // #9627: classification itself is pinned in @sp/sync-core's own spec. What
  // this shim owns is the bridge — the diagnostic is worthless if it never
  // reaches the exportable OpLog history a user actually sends us.
  it('carries the head-shape diagnostic into the OpLog history', () => {
    // Synthetic stand-in for a ciphertext head — same shape, none of a user's
    // bytes. Classification itself is pinned in @sp/sync-core's spec.
    expect(() =>
      extractSyncFileStateFromPrefix('QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWY'),
    ).toThrowError(InvalidFilePrefixError);

    const [message, meta] = (OpLog.log as jasmine.Spy).calls.mostRecent().args;
    // Also inlined in the message so the line greps as one unit in a console.
    expect(message).toContain('headShape="base64"');
    expect(message).toContain('prefixAt=-1');
    expect(meta).toEqual(jasmine.objectContaining({ headShape: 'base64', prefixAt: -1 }));
  });
});
