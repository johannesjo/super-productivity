import {
  extractSyncFileStateFromPrefix,
  getSyncFilePrefix,
} from '../util/sync-file-prefix';
import { pfLog } from '../util/log';
import { decrypt, encrypt } from '../encryption/encryption';
import { DecryptNoPasswordError } from '../errors/errors';
import {
  compressWithGzipToString,
  decompressGzipFromString,
} from '../compression/compression-handler';
import { EncryptAndCompressCfg } from '../pfapi.model';

export class EncryptAndCompressHandlerService {
  async compressAndeEncryptData<T>(
    cfg: EncryptAndCompressCfg,
    data: T,
    modelVersion: number,
  ): Promise<string> {
    const { isCompress, isEncrypt, encryptKey } = cfg;
    return this.compressAndEncrypt({
      data,
      modelVersion,
      isCompress,
      isEncrypt,
      encryptKey,
    });
  }

  async decompressAndDecryptData<T>(
    cfg: EncryptAndCompressCfg,
    dataStr: string,
  ): Promise<T> {
    const { encryptKey } = cfg;
    return (
      await this.decompressAndDecrypt<T>({
        dataStr,
        encryptKey,
      })
    ).data;
  }

  async compressAndEncrypt<T>({
    data,
    modelVersion,
    isCompress,
    isEncrypt,
    encryptKey,
  }: {
    data: T;
    modelVersion: number;
    isCompress: boolean;
    isEncrypt: boolean;
    encryptKey?: string;
  }): Promise<string> {
    const prefix = getSyncFilePrefix({
      isCompress,
      isEncrypt,
      modelVersion,
    });
    pfLog(
      2,
      `${EncryptAndCompressHandlerService.name}.${this.compressAndEncrypt.name}()`,
      { prefix, modelVersion, isCompress, isEncrypt },
    );
    let dataStr = JSON.stringify(data);
    if (isCompress) {
      dataStr = await compressWithGzipToString(dataStr);
    }
    if (isEncrypt) {
      if (!encryptKey) {
        throw new Error('No encryption password provided');
      }

      dataStr = await encrypt(dataStr, encryptKey);
    }

    return prefix + dataStr;
  }

  async decompressAndDecrypt<T>({
    dataStr,
    encryptKey,
  }: {
    dataStr: string;
    encryptKey?: string;
  }): Promise<{
    data: T;
    modelVersion: number;
  }> {
    const { isCompressed, isEncrypted, modelVersion, cleanDataStr } =
      extractSyncFileStateFromPrefix(dataStr);
    pfLog(
      2,
      `${EncryptAndCompressHandlerService.name}.${this.decompressAndDecrypt.name}()`,
      { isCompressed, isEncrypted, modelVersion },
    );
    let outStr = cleanDataStr;
    if (isCompressed) {
      outStr = await decompressGzipFromString(outStr);
    }
    if (isEncrypted) {
      if (!encryptKey) {
        throw new DecryptNoPasswordError({
          encryptKey,
          dataStr,
          isCompressed,
          isEncrypted,
          modelVersion,
        });
      }
      outStr = await decrypt(outStr, encryptKey);
    }

    return {
      data: JSON.parse(outStr),
      modelVersion,
    };
  }
}
