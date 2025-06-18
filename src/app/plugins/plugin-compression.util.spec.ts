import {
  compressPluginCode,
  decompressPluginCode,
  compressPlugin,
  decompressPlugin,
  shouldCompress,
  calculateCompressionStats,
} from './plugin-compression.util';

describe('Plugin Compression Utilities', () => {
  describe('compressPluginCode / decompressPluginCode', () => {
    it('should compress and decompress code correctly', async () => {
      const originalCode = `
        // Test plugin code
        const plugin = {
          name: 'Test Plugin',
          version: '1.0.0',
          execute: function() {
            console.log('Hello from plugin!');
            // Add some repetitive content to test compression
            const data = {
              items: ['item1', 'item2', 'item3', 'item4', 'item5'],
              values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              messages: ['hello', 'world', 'hello', 'world', 'hello', 'world']
            };
            return data;
          }
        };
      `.repeat(10); // Repeat to ensure it's compressible

      const compressed = await compressPluginCode(originalCode);
      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeLessThan(originalCode.length);

      const decompressed = await decompressPluginCode(compressed);
      expect(decompressed).toBe(originalCode);
    });

    it('should handle empty strings', async () => {
      const compressed = await compressPluginCode('');
      const decompressed = await decompressPluginCode(compressed);
      expect(decompressed).toBe('');
    });

    it('should handle unicode content', async () => {
      const originalCode = 'const message = "Hello 世界 🎉";';
      const compressed = await compressPluginCode(originalCode);
      const decompressed = await decompressPluginCode(compressed);
      expect(decompressed).toBe(originalCode);
    });
  });

  describe('compressPlugin / decompressPlugin', () => {
    it('should compress and decompress entire plugin', async () => {
      const manifest = JSON.stringify({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      });
      const code = 'console.log("Test plugin");'.repeat(100);
      const indexHtml = '<html><body>Test Plugin</body></html>'.repeat(50);
      const icon = '<svg><circle cx="50" cy="50" r="40"/></svg>';

      const compressed = await compressPlugin(manifest, code, indexHtml, icon);

      expect(compressed.compressed).toBe(true);
      expect(compressed.compressionRatio).toBeGreaterThan(1);
      expect(compressed.manifest).toBe(manifest); // Manifest not compressed
      expect(compressed.code).not.toBe(code); // Code is compressed
      expect(compressed.indexHtml).toBeDefined();
      expect(compressed.icon).toBe(icon); // Icon not compressed

      const decompressed = await decompressPlugin(compressed);
      expect(decompressed.manifest).toBe(manifest);
      expect(decompressed.code).toBe(code);
      expect(decompressed.indexHtml).toBe(indexHtml);
      expect(decompressed.icon).toBe(icon);
    });

    it('should handle plugin without optional assets', async () => {
      const manifest = JSON.stringify({ id: 'minimal', name: 'Minimal' });
      const code = 'console.log("minimal");';

      const compressed = await compressPlugin(manifest, code);
      const decompressed = await decompressPlugin(compressed);

      expect(decompressed.manifest).toBe(manifest);
      expect(decompressed.code).toBe(code);
      expect(decompressed.indexHtml).toBeUndefined();
      expect(decompressed.icon).toBeUndefined();
    });
  });

  describe('shouldCompress', () => {
    it('should return true for content > 1KB', () => {
      const largeContent = 'x'.repeat(1025);
      expect(shouldCompress(largeContent)).toBe(true);
    });

    it('should return false for content <= 1KB', () => {
      const smallContent = 'x'.repeat(1024);
      expect(shouldCompress(smallContent)).toBe(false);
    });
  });

  describe('calculateCompressionStats', () => {
    it('should calculate compression statistics correctly', () => {
      const stats = calculateCompressionStats(1000, 250);

      expect(stats.originalSize).toBe(1000);
      expect(stats.compressedSize).toBe(250);
      expect(stats.ratio).toBe(4);
      expect(stats.savingsPercent).toBe(75);
    });

    it('should handle no compression case', () => {
      const stats = calculateCompressionStats(1000, 1000);

      expect(stats.ratio).toBe(1);
      expect(stats.savingsPercent).toBe(0);
    });
  });
});
