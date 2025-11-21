import { CompressError, DecompressError } from '../errors/errors';
import { PFLog } from '../../../core/log';

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export async function compressWithGzipToString(input: string): Promise<string> {
  try {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(new TextEncoder().encode(input));
    writer.close();
    const compressed = await new Response(stream.readable).arrayBuffer();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64DataUrl = reader.result as string;
        // Format is "data:[<mediatype>][;base64],<data>"
        const base64 = base64DataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(new Blob([compressed]));
    });
  } catch (error) {
    PFLog.err(error);
    throw new CompressError(error);
  }
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export async function decompressGzipFromString(
  compressedBase64: string,
): Promise<string> {
  try {
    // Use fetch to decode base64 efficiently
    const response = await fetch(
      `data:application/octet-stream;base64,${compressedBase64}`,
    );
    const compressedData = await response.arrayBuffer();

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(compressedData);
    writer.close();

    const decompressed = await new Response(stream.readable).arrayBuffer();
    const decoded = new TextDecoder().decode(decompressed);
    // PFLog.normal( 'Decompression stats', { decompressedLength: decoded.length });
    return decoded;
  } catch (error) {
    PFLog.err(error);
    throw new DecompressError(error);
  }
}
