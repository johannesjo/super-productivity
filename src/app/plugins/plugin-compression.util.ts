/**
 * Utility functions for plugin compression and decompression
 * Uses fflate for efficient compression
 */

import { strToU8, strFromU8, compress, decompress } from 'fflate';

export interface CompressedPlugin {
  manifest: string; // JSON string
  code: string; // Compressed base64
  indexHtml?: string; // Compressed base64
  icon?: string; // Not compressed (already small)
  compressed: true;
  compressionRatio?: number;
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savingsPercent: number;
}

/**
 * Compress plugin code for storage
 */
export const compressPluginCode = async (code: string): Promise<string> => {
  const input = strToU8(code);
  const compressed = await new Promise<Uint8Array>((resolve, reject) => {
    compress(input, { level: 6 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...compressed));
};

/**
 * Decompress plugin code
 */
export const decompressPluginCode = async (compressedBase64: string): Promise<string> => {
  // Convert from base64
  const binaryString = atob(compressedBase64);
  const compressed = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    compressed[i] = binaryString.charCodeAt(i);
  }

  const decompressed = await new Promise<Uint8Array>((resolve, reject) => {
    decompress(compressed, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  return strFromU8(decompressed);
};

/**
 * Compress an entire plugin for storage
 */
export const compressPlugin = async (
  manifest: string,
  code: string,
  indexHtml?: string,
  icon?: string,
): Promise<CompressedPlugin> => {
  const originalSize =
    manifest.length + code.length + (indexHtml?.length || 0) + (icon?.length || 0);

  // Compress code (usually the largest part)
  const compressedCode = await compressPluginCode(code);

  // Compress index.html if present
  const compressedIndexHtml = indexHtml ? await compressPluginCode(indexHtml) : undefined;

  const result: CompressedPlugin = {
    manifest, // Keep manifest uncompressed for quick access
    code: compressedCode,
    indexHtml: compressedIndexHtml,
    icon, // Icons are already optimized SVGs
    compressed: true,
  };

  // Calculate compression ratio
  const compressedSize =
    manifest.length +
    compressedCode.length +
    (compressedIndexHtml?.length || 0) +
    (icon?.length || 0);

  result.compressionRatio = originalSize / compressedSize;

  return result;
};

/**
 * Decompress a plugin
 */
export const decompressPlugin = async (
  compressed: CompressedPlugin,
): Promise<{
  manifest: string;
  code: string;
  indexHtml?: string;
  icon?: string;
}> => {
  const code = await decompressPluginCode(compressed.code);
  const indexHtml = compressed.indexHtml
    ? await decompressPluginCode(compressed.indexHtml)
    : undefined;

  return {
    manifest: compressed.manifest,
    code,
    indexHtml,
    icon: compressed.icon,
  };
};

/**
 * Check if data is compressed
 */
export const isCompressed = (data: any): data is CompressedPlugin => {
  return data && typeof data === 'object' && data.compressed === true;
};

/**
 * Calculate compression statistics
 */
export const calculateCompressionStats = (
  originalSize: number,
  compressedSize: number,
): CompressionStats => {
  const ratio = originalSize / compressedSize;
  const savingsPercent = ((originalSize - compressedSize) / originalSize) * 100;

  return {
    originalSize,
    compressedSize,
    ratio,
    savingsPercent,
  };
};

/**
 * Estimate if compression would be beneficial
 * Generally, compression is beneficial for code > 1KB
 */
export const shouldCompress = (content: string): boolean => {
  return content.length > 1024; // 1KB threshold
};
