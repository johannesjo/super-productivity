import {
  extractSyncFileStateFromPrefix,
  getSyncFilePrefix,
} from '../util/sync-file-prefix';

// TODO move to pure functions maybe
export class EncryptAndCompressHandlerService {
  async compressAndEncrypt<T>(data: T, modelVersion: number): Promise<string> {
    // TODO actual encryption and compression
    const prefix = getSyncFilePrefix({
      isCompressed: false,
      isEncrypted: false,
      modelVersion,
    });
    return prefix + JSON.stringify(data);
  }

  async decompressAndDecrypt<T>(dataStr: string): Promise<{
    data: T;
    modelVersion: number;
  }> {
    const { isCompressed, isEncrypted, modelVersion, cleanDataStr } =
      extractSyncFileStateFromPrefix(dataStr);
    console.log(isCompressed, isEncrypted, modelVersion, cleanDataStr);

    return {
      data: JSON.parse(cleanDataStr),
      modelVersion,
    };
  }
}
