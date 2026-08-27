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

    const logText = (OpLog.log as jasmine.Spy).calls.allArgs().flat().join('\n');
    expect(logText).toContain('inputLength');
    expect(logText).not.toContain('secret task');
    expect(logText).not.toContain(rawPayload);
  });

  // #9627: classification itself is pinned in @sp/sync-core's own spec. What
  // this shim owns is the bridge — the diagnostic is worthless if it never
  // reaches the exportable OpLog history a user actually sends us.
  it('carries the head-shape diagnostic into the OpLog history', () => {
    expect(() =>
      extractSyncFileStateFromPrefix('41J7VJwUqK/0k436aSIRL5utdxhyV6WhXWSguANW'),
    ).toThrowError(InvalidFilePrefixError);

    const [message, meta] = (OpLog.log as jasmine.Spy).calls.mostRecent().args;
    // Inlined in the message too, so it survives positional serialization.
    expect(message).toContain('headShape="base64"');
    expect(message).toContain('prefixAt=-1');
    expect(meta).toEqual(jasmine.objectContaining({ headShape: 'base64', prefixAt: -1 }));
  });
});
