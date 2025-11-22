import { PFLog } from '../../../core/log';
import { DecompressError } from '../errors/errors';
import {
  compressWithGzipToString,
  decompressGzipFromString,
} from './compression-handler';

describe('compression-handler', () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    spyOn(PFLog, 'err').and.stub();
    originalFetch = (globalThis as any).fetch;
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  it('compresses and decompresses strings losslessly', async () => {
    (globalThis as any).fetch = jasmine.createSpy('fetch').and.callFake((url: string) => {
      const base64 = url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return Promise.resolve(new Response(bytes));
    });

    const payload = {
      text: 'Hello 😀',
      numbers: [1, 2, 3],
      nested: { active: true, count: 42 },
    };
    const serialized = JSON.stringify(payload);

    const compressed = await compressWithGzipToString(serialized);
    expect(typeof compressed).toBe('string');
    expect(compressed.startsWith('data:')).toBeFalse();

    const decompressed = await decompressGzipFromString(compressed);

    expect(decompressed).toEqual(serialized);
    expect(JSON.parse(decompressed)).toEqual(payload);
  });

  it('throws DecompressError when base64 cannot be decoded', async () => {
    (globalThis as any).fetch = jasmine
      .createSpy('fetch')
      .and.callFake(() => Promise.reject(new Error('fetch failed')));

    await expectAsync(decompressGzipFromString('invalid-base64')).toBeRejectedWithError(
      DecompressError,
    );
  });
});
