import { CompressError, DecompressError } from '../errors/errors';

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export async function compressWithGzipToString(input: string): Promise<string> {
  try {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(new TextEncoder().encode(input));
    writer.close();
    const compressed = await new Response(stream.readable).arrayBuffer();
    // Convert to Base64 without using spread operator
    const bytes = new Uint8Array(compressed);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // pfLog(2, 'Compression stats', {
    //   inputLength: input.length,
    //   compressedSize: compressed.byteLength,
    //   base64Length: base64.length,
    // });

    return base64;
  } catch (error) {
    console.error(error);
    throw new CompressError(error);
  }
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export async function decompressGzipFromString(
  compressedBase64: string,
): Promise<string> {
  try {
    const binaryString = atob(compressedBase64);
    // More efficient conversion
    const compressedData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressedData[i] = binaryString.charCodeAt(i);
    }

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(compressedData);
    writer.close();

    const decompressed = await new Response(stream.readable).arrayBuffer();
    const decoded = new TextDecoder().decode(decompressed);
    // pfLog(2, 'Decompression stats', { decompressedLength: decoded.length });
    return decoded;
  } catch (error) {
    console.error(error);
    throw new DecompressError(error);
  }
}
