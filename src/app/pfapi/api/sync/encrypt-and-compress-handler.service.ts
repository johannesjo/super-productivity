import {
  extractSyncFileStateFromPrefix,
  getSyncFilePrefix,
} from '../util/sync-file-prefix';
import { pfLog } from '../util/log';

// TODO move to pure functions maybe
export class EncryptAndCompressHandlerService {
  async compressAndEncrypt<T>(data: T, modelVersion: number): Promise<string> {
    const prefix = getSyncFilePrefix({
      isCompress: false,
      isEncrypt: false,
      modelVersion,
    });
    pfLog(
      3,
      `${EncryptAndCompressHandlerService.name}.${this.compressAndEncrypt.name}()`,
      { prefix },
    );
    return prefix + JSON.stringify(data);
  }

  async decompressAndDecrypt<T>(dataStr: string): Promise<{
    data: T;
    modelVersion: number;
  }> {
    const { isCompressed, isEncrypted, modelVersion, cleanDataStr } =
      extractSyncFileStateFromPrefix(dataStr);
    pfLog(
      3,
      `${EncryptAndCompressHandlerService.name}.${this.decompressAndDecrypt.name}()`,
      { isCompressed, isEncrypted, modelVersion, cleanDataStr },
    );

    return {
      data: JSON.parse(cleanDataStr),
      modelVersion,
    };
  }
}
