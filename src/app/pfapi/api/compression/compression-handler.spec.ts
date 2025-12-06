import { PFLog } from '../../../core/log';
import { DecompressError } from '../errors/errors';
import {
  compressWithGzip,
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

  describe('compressWithGzipToString / decompressGzipFromString', () => {
    it('compresses and decompresses strings losslessly', async () => {
      (globalThis as any).fetch = jasmine
        .createSpy('fetch')
        .and.callFake((url: string) => {
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

  describe('compressWithGzip (binary)', () => {
    it('should compress a string to gzip bytes with valid header', async () => {
      const input = 'Hello, World!';

      const result = await compressWithGzip(input);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
      // Gzip magic number: 0x1f, 0x8b
      expect(result[0]).toBe(0x1f);
      expect(result[1]).toBe(0x8b);
    });

    it('should produce smaller output for repetitive data', async () => {
      const repetitiveInput = 'AAAA'.repeat(1000); // 4000 bytes of 'A'

      const result = await compressWithGzip(repetitiveInput);

      // Compressed should be much smaller than original
      expect(result.length).toBeLessThan(repetitiveInput.length / 10);
    });

    it('should handle empty string', async () => {
      const input = '';

      const result = await compressWithGzip(input);

      expect(result).toBeInstanceOf(Uint8Array);
      // Even empty string produces gzip header
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', async () => {
      const input = '日本語テスト 🎉 émojis';

      const result = await compressWithGzip(input);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0x1f);
      expect(result[1]).toBe(0x8b);
    });

    it('should achieve good compression for JSON payloads', async () => {
      const jsonPayload = JSON.stringify({
        tasks: Array.from({ length: 100 }, (_, i) => ({
          id: `task-${i}`,
          title: `Task number ${i} with some longer description`,
          done: i % 2 === 0,
        })),
      });

      const result = await compressWithGzip(jsonPayload);

      // JSON typically compresses well - should be less than 50% of original
      expect(result.length).toBeLessThan(jsonPayload.length * 0.5);
    });

    it('should produce valid gzip that can be decompressed by DecompressionStream', async () => {
      const original = 'Test payload for round-trip verification';

      const compressed = await compressWithGzip(original);

      // Decompress using DecompressionStream (same API used by server-side Node.js zlib)
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(compressed);
      writer.close();
      const decompressed = await new Response(stream.readable).arrayBuffer();
      const decoded = new TextDecoder().decode(decompressed);

      expect(decoded).toBe(original);
    });
  });
});
