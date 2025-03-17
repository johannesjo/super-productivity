import {
  pfExtractSyncFileStateFromPrefix,
  pfGetSyncFilePrefix,
} from './util/pf-sync-file-prefix';

// TODO move to pure functions maybe
export class PFEncryptAndCompressHandlerService {
  async compressAndEncrypt<T>(data: T, modelVersion: number): Promise<string> {
    // TODO actual encryption and compression
    const prefix = pfGetSyncFilePrefix({
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
      pfExtractSyncFileStateFromPrefix(dataStr);
    console.log(isCompressed, isEncrypted, modelVersion, cleanDataStr);

    return {
      data: JSON.parse(cleanDataStr),
      modelVersion,
    };
  }
}
