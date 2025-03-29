import { EncryptAndCompressCfg, RemoteMeta } from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import {
  LockFromLocalClientPresentError,
  LockPresentError,
  NoRemoteMetaFile,
  RemoteFileNotFoundAPIError,
} from '../errors/errors';
import { pfLog } from '../util/log';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { validateMetaBase } from '../util/validate-meta-base';

export class MetaFileSyncService {
  constructor(
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
    private _metaModelCtrl: MetaModelCtrl,
    private _encryptAndCompressHandler: EncryptAndCompressHandlerService,
    private _encryptAndCompressCfg$: MiniObservable<EncryptAndCompressCfg>,
  ) {}

  async download(
    localRev: string | null = null,
  ): Promise<{ remoteMeta: RemoteMeta; remoteMetaRev: string }> {
    // return {} as any as MetaFileContent;
    pfLog(2, `${MetaFileSyncService.name}.${this.download.name}()`, { localRev });
    const syncProvider = this._currentSyncProvider$.getOrError();
    try {
      const r = await syncProvider.downloadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev,
      );
      if (r.dataStr.startsWith(MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX)) {
        alert('LOCK PRESENT: ' + r.dataStr);
        const lockClientId = r.dataStr
          .slice(MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX.length)
          .replace(/\n/g, '');

        if (lockClientId === (await this._metaModelCtrl.loadClientId())) {
          throw new LockFromLocalClientPresentError();
        }
        throw new LockPresentError();
      }
      const data =
        await this._encryptAndCompressHandler.decompressAndDecryptData<RemoteMeta>(
          this._encryptAndCompressCfg$.value,
          r.dataStr,
        );

      return { remoteMeta: validateMetaBase(data), remoteMetaRev: r.rev };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  async upload(meta: RemoteMeta, revToMatch: string | null = null): Promise<string> {
    const encryptedAndCompressedData =
      await this._encryptAndCompressHandler.compressAndeEncryptData(
        this._encryptAndCompressCfg$.value,
        validateMetaBase(meta),
        meta.crossModelVersion,
      );
    if (encryptedAndCompressedData.length > 200000) {
      console.log('___________LAAARGE DATA UPLOAD');
      alert('LAAARGE DATA UPLOAD');
    }
    pfLog(2, `${MetaFileSyncService.name}.${this.upload.name}()`, {
      meta,
      // encryptedAndCompressedData,
    });

    const syncProvider = this._currentSyncProvider$.getOrError();

    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        encryptedAndCompressedData,
        revToMatch,
        true,
      )
    ).rev;
  }

  async getRev(localRev: string | null): Promise<string> {
    pfLog(2, `${MetaFileSyncService.name}.${this.getRev.name}()`, { localRev });
    const syncProvider = this._currentSyncProvider$.getOrError();
    try {
      const r = await syncProvider.getFileRev(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev || null,
      );
      return r.rev;
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  async lock(revToMatch: string | null = null): Promise<string> {
    pfLog(2, `${MetaFileSyncService.name}.${this.lock.name}()`, { revToMatch });
    const syncProvider = this._currentSyncProvider$.getOrError();
    const clientId = await this._metaModelCtrl.loadClientId();
    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX + clientId,
        revToMatch,
        true,
      )
    ).rev;
  }
}
