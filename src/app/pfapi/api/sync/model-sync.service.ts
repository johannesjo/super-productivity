import { pfLog } from '../util/log';
import { MiniObservable } from '../util/mini-observable';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import {
  ImpossibleError,
  NoRemoteModelFile,
  RemoteFileNotFoundAPIError,
  RevMismatchForModelError,
} from '../errors/errors';
import {
  EncryptAndCompressCfg,
  ExtractModelCfgType,
  ModelCfgs,
  ModelCfgToModelCtrl,
} from '../pfapi.model';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { cleanRev } from '../util/clean-rev';

export class ModelSyncService<MD extends ModelCfgs> {
  constructor(
    private m: ModelCfgToModelCtrl<MD>,
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
    private _encryptAndCompressHandler: EncryptAndCompressHandlerService,
    private _encryptAndCompressCfg$: MiniObservable<EncryptAndCompressCfg>,
  ) {}

  async upload<T extends keyof MD>(
    modelId: T,
    data: ExtractModelCfgType<MD[T]>,
    localRev: string | null = null,
  ): Promise<string> {
    const modelVersion = this._getModelVersion(modelId);
    pfLog(2, `${ModelSyncService.name}.${this.upload.name}()`, modelId, {
      modelVersion,
      data,
      localRev,
    });

    const target = this._filePathForModelId(modelId);
    const syncProvider = this._currentSyncProvider$.getOrError();
    const dataToUpload = this.m[modelId].modelCfg.transformBeforeUpload
      ? this.m[modelId].modelCfg.transformBeforeUpload(data)
      : data;
    const encryptedAndCompressedData =
      await this._encryptAndCompressHandler.compressAndeEncryptData(
        this._encryptAndCompressCfg$.value,
        dataToUpload,
        modelVersion,
      );
    return (
      await syncProvider.uploadFile(target, encryptedAndCompressedData, localRev, true)
    ).rev;
  }

  async download<T extends keyof MD>(
    modelId: T,
    expectedRev: string | null = null,
  ): Promise<{ data: ExtractModelCfgType<MD[T]>; rev: string }> {
    pfLog(2, `${ModelSyncService.name}.${this.download.name}()`, {
      modelId,
      expectedRev,
    });

    try {
      const syncProvider = this._currentSyncProvider$.getOrError();
      const { rev, dataStr } = await syncProvider.downloadFile(
        this._filePathForModelId(modelId),
        expectedRev,
      );
      if (expectedRev) {
        if (!rev || !this._isSameRev(rev, expectedRev)) {
          throw new RevMismatchForModelError(modelId);
        }
      }
      const data = await this._encryptAndCompressHandler.decompressAndDecryptData<
        ExtractModelCfgType<MD[T]>
      >(this._encryptAndCompressCfg$.value, dataStr);

      return {
        data: this.m[modelId].modelCfg.transformBeforeDownload
          ? this.m[modelId].modelCfg.transformBeforeDownload(data)
          : data,
        rev,
      };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteModelFile(modelId);
      }
      throw e;
    }
  }

  async updateLocalUpdated(
    toUpdate: string[],
    toDelete: string[],
    dataMap: { [key: string]: unknown },
  ): Promise<unknown> {
    return await Promise.all([
      ...toUpdate.map((modelId) =>
        // NOTE: needs to be cast as any
        this._updateLocal(modelId, dataMap[modelId] as any),
      ),
      // TODO delete local models
      // ...toDelete.map((id) => this._deleteLocalModel(id, 'aaa')),
    ]);
  }

  private async _updateLocal<T extends keyof MD>(
    modelId: T,
    modelData: ExtractModelCfgType<MD[T]>,
  ): Promise<void> {
    await this.m[modelId].save(modelData);
  }

  async remove<T extends keyof MD>(modelId: T): Promise<void> {
    pfLog(2, `${ModelSyncService.name}.${this.remove.name}()`, {
      modelId,
    });
    const syncProvider = this._currentSyncProvider$.getOrError();
    await syncProvider.removeFile(this._filePathForModelId(modelId));
  }

  private _filePathForModelId<T extends keyof MD>(modelId: T): string {
    if (typeof modelId !== 'string') {
      throw new ImpossibleError('Model ID must be a string');
    }
    return modelId;
  }

  private _isSameRev(a: string | null, b: string | null): boolean {
    if (!a || !b) {
      console.warn(`Invalid revs a:${a} and b:${b} given`);
      return false;
    }
    if (a === b) {
      return true;
    }
    return cleanRev(a) === cleanRev(b);
  }

  private _getModelVersion<T extends keyof MD>(modelId: T): number {
    return this.m[modelId].modelCfg.modelVersion;
  }
}
