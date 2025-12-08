import { PFLog } from '../../../core/log';
import { MiniObservable } from '../util/mini-observable';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import {
  ImpossibleError,
  ModelIdWithoutCtrlError,
  NoRemoteModelFile,
  RemoteFileNotFoundAPIError,
  RevMapModelMismatchErrorOnDownload,
  RevMapModelMismatchErrorOnUpload,
  RevMismatchForModelError,
} from '../errors/errors';
import {
  AllSyncModels,
  EncryptAndCompressCfg,
  ExtractModelCfgType,
  MainModelData,
  ModelCfgs,
  ModelCfgToModelCtrl,
  RemoteMeta,
  RevMap,
} from '../pfapi.model';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { cleanRev } from '../util/clean-rev';
import { getModelIdsToUpdateFromRevMaps } from '../util/get-model-ids-to-update-from-rev-maps';
import { Pfapi } from '../pfapi';
import { SyncProviderId } from '../pfapi.const';

export class ModelSyncService<MD extends ModelCfgs> {
  private static readonly L = 'ModelSyncService';

  constructor(
    private m: ModelCfgToModelCtrl<MD>,
    private _pfapiMain: Pfapi<MD>,
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<SyncProviderId> | null>,
    private _encryptAndCompressHandler: EncryptAndCompressHandlerService,
    private _encryptAndCompressCfg$: MiniObservable<EncryptAndCompressCfg>,
  ) {}

  /**
   * Uploads a model to the remote storage
   *
   * @param modelId - The ID of the model to upload
   * @param data - The model data to upload
   * @param localRev - Optional local revision to check against
   * @returns Promise resolving to the new revision string
   */
  async upload<T extends keyof MD>(
    modelId: T,
    data: ExtractModelCfgType<MD[T]>,
    localRev: string | null = null,
  ): Promise<string> {
    if (!modelId) {
      throw new ImpossibleError('Model ID is required for upload');
    }

    const modelVersion = this._getModelVersion(modelId);
    PFLog.normal(`${ModelSyncService.L}.${this.upload.name}()`, modelId, {
      modelVersion,
      data,
      localRev,
    });

    const target = this._filePathForModelId(modelId);
    const syncProvider = this._currentSyncProvider$.getOrError();
    const dataToUpload = data;
    const encryptedAndCompressedData =
      await this._encryptAndCompressHandler.compressAndEncryptData(
        this._encryptAndCompressCfg$.value,
        (await syncProvider.privateCfg.load())?.encryptKey,
        dataToUpload,
        modelVersion,
      );
    return (
      await syncProvider.uploadFile(target, encryptedAndCompressedData, localRev, true)
    ).rev;
  }

  /**
   * Downloads a model from remote storage
   *
   * @param modelId - The ID of the model to download
   * @param expectedRev - Optional expected revision to verify
   * @returns Promise resolving to object with data and revision
   * @throws NoRemoteModelFile if the file doesn't exist remotely
   * @throws RevMismatchForModelError if revisions don't match
   */
  async download<T extends keyof MD>(
    modelId: T,
    expectedRev: string | null = null,
  ): Promise<{ data: ExtractModelCfgType<MD[T]>; rev: string }> {
    if (!modelId) {
      throw new ImpossibleError('Model ID is required for download');
    }

    PFLog.normal(`${ModelSyncService.L}.${this.download.name}()`, {
      modelId,
      expectedRev,
    });

    try {
      const syncProvider = this._currentSyncProvider$.getOrError();
      const { rev, legacyRev, dataStr } = await syncProvider.downloadFile(
        this._filePathForModelId(modelId),
      );
      if (expectedRev) {
        if (
          !rev ||
          !(
            this._isSameRev(rev, expectedRev) ||
            (legacyRev && this._isSameRev(legacyRev, expectedRev))
          )
        ) {
          const isNewer =
            rev &&
            expectedRev &&
            new Date(rev).getTime() > new Date(expectedRev).getTime();
          if (isNewer) {
            // This can happen if the meta file was not updated correctly, e.g. due to an interrupted sync
            // or if the remote file was updated by another client and the meta file is lagging behind.
            // In this case we assume that the remote file is the source of truth and we should download it.
            PFLog.warn(
              `Rev mismatch: Remote rev is newer than expected. Proceeding with download.`,
              rev,
              expectedRev,
              legacyRev,
            );
          } else {
            PFLog.normal('Rev mismatch', rev, expectedRev, legacyRev);
            throw new RevMismatchForModelError(modelId, { rev, expectedRev, legacyRev });
          }
        }
      }
      const data = await this._encryptAndCompressHandler.decompressAndDecryptData<
        ExtractModelCfgType<MD[T]>
      >(
        this._encryptAndCompressCfg$.value,
        (await syncProvider.privateCfg.load())?.encryptKey,
        dataStr,
      );

      if (!this.m[modelId]?.modelCfg) {
        throw new ModelIdWithoutCtrlError({ modelId });
      }

      return {
        data,
        rev,
      };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteModelFile(modelId);
      }
      throw e;
    }
  }

  /**
   * Removes a model file from remote
   *
   * @param modelId - The ID of the model to delete
   * @private
   */
  async remove<T extends keyof MD>(modelId: T): Promise<void> {
    if (!modelId) {
      throw new ImpossibleError('Model ID is required for removal');
    }

    PFLog.normal(`${ModelSyncService.L}.${this.remove.name}()`, {
      modelId,
    });
    const syncProvider = this._currentSyncProvider$.getOrError();
    await syncProvider.removeFile(this._filePathForModelId(modelId));
  }

  /**
   * Updates local models based on the provided data
   *
   * @param toUpdate - Array of model IDs to update
   * @param toDelete - Array of model IDs to delete
   * @param dataMap - Map of model data indexed by model ID
   * @returns Promise resolving once all operations are complete
   */
  async updateLocalUpdated(
    toUpdate: string[],
    toDelete: string[],
    dataMap: { [key: string]: unknown },
  ): Promise<unknown> {
    return await Promise.all([
      ...toUpdate.map((modelId) =>
        // NOTE: needs to be cast to a generic type, since dataMap is a generic object
        this._updateLocal(modelId, dataMap[modelId] as ExtractModelCfgType<MD[string]>),
      ),
      ...toDelete.map((modelId) => this._removeLocal(modelId)),
    ]);
  }

  /**
   * Updates local models from remote metadata
   *
   * @param remote - Remote metadata containing model data
   */
  async updateLocalMainModelsFromRemoteMetaFile(remote: RemoteMeta): Promise<void> {
    const mainModelData = remote.mainModelData;
    if (typeof mainModelData === 'object' && mainModelData !== null) {
      PFLog.normal(
        `${ModelSyncService.L}.${this.updateLocalMainModelsFromRemoteMetaFile.name}() updating (main) models`,
        Object.keys(mainModelData),
      );

      // Check for unregistered models before processing to prevent data loss
      const unregisteredModels: string[] = [];
      Object.keys(mainModelData).forEach((modelId) => {
        if (!this.m[modelId]) {
          unregisteredModels.push(modelId);
        }
      });

      if (unregisteredModels.length > 0) {
        throw new ModelIdWithoutCtrlError(
          `Remote metadata contains models not registered locally: ${unregisteredModels.join(', ')}. ` +
            `This may indicate a version mismatch between synced devices. ` +
            `To prevent data loss, sync has been blocked. ` +
            `Please ensure all devices are running the same version of the app.`,
        );
      }

      Object.keys(mainModelData).forEach((modelId) => {
        if (modelId in mainModelData) {
          this.m[modelId].save(
            mainModelData[modelId] as ExtractModelCfgType<MD[string]>,
            {
              isUpdateRevAndLastUpdate: false,
              // NOTE: this is during sync, so we ignore the DB lock
              isIgnoreDBLock: true,
            },
          );
        }
      });
    } else {
      throw new ImpossibleError('No remote.mainModelData!!! Is this correct?');
    }
  }

  /**
   * Retrieves model data to be included in the main file when uploading
   *
   * @param completeModel - Optional complete model data to use
   * @returns Promise resolving to main model data
   */
  async getMainFileModelDataForUpload(
    completeModel?: AllSyncModels<MD>,
  ): Promise<MainModelData> {
    const mainFileModelIds = Object.keys(this.m).filter(
      (modelId) => this.m[modelId].modelCfg.isMainFileModel,
    );

    completeModel = completeModel || (await this._pfapiMain.getAllSyncModelData());
    const mainModelData: MainModelData = Object.fromEntries(
      mainFileModelIds.map((modelId) => [modelId, completeModel[modelId]]),
    );
    PFLog.normal(`${ModelSyncService.L}.${this.getMainFileModelDataForUpload.name}()`, {
      mainModelData,
      mainFileModelIds,
    });
    return mainModelData;
  }

  /**
   * Determines which models need to be updated based on revision maps
   *
   * @param params - Configuration object with revision maps and error context
   * @returns Object containing arrays of model IDs to update and delete
   */
  getModelIdsToUpdateFromRevMaps({
    revMapNewer,
    revMapToOverwrite,
    errorContext,
  }: {
    revMapNewer: RevMap;
    revMapToOverwrite: RevMap;
    errorContext: 'UPLOAD' | 'DOWNLOAD';
  }): { toUpdate: string[]; toDelete: string[] } {
    if (!revMapNewer || !revMapToOverwrite) {
      throw new ImpossibleError('Both revision maps are required');
    }

    const all = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);
    try {
      return {
        toUpdate: all.toUpdate.filter(
          // NOTE: we are also filtering out all non-existing local models, since revMaps might contain legacy models
          (modelId) => this.m[modelId] && !this.m[modelId].modelCfg.isMainFileModel,
        ),
        toDelete: all.toDelete.filter(
          // NOTE: we are also filtering out all non-existing local models, since revMaps might contain legacy models
          (modelId) => this.m[modelId] && !this.m[modelId].modelCfg.isMainFileModel,
        ),
      };
    } catch (e) {
      // TODO maybe remove error again
      if (errorContext === 'UPLOAD') {
        throw new RevMapModelMismatchErrorOnUpload({ e, revMapNewer, revMapToOverwrite });
      } else {
        throw new RevMapModelMismatchErrorOnDownload({
          e,
          revMapNewer,
          revMapToOverwrite,
        });
      }
    }
  }

  /**
   * Updates a local model with provided data
   *
   * @param modelId - The ID of the model to update
   * @param modelData - The data to update the model with
   * @private
   */
  private async _updateLocal<T extends keyof MD>(
    modelId: T,
    modelData: ExtractModelCfgType<MD[T]>,
  ): Promise<void> {
    await this.m[modelId].save(modelData, {
      isUpdateRevAndLastUpdate: true,
      // NOTE: this is during sync, so we ignore the DB lock
      isIgnoreDBLock: true,
    });
  }

  /**
   * Removes a model from local storage
   *
   * @param modelId - The ID of the model to delete
   * @private
   */
  private async _removeLocal<T extends keyof MD>(modelId: T): Promise<void> {
    PFLog.normal(
      `${ModelSyncService.L}.${this._removeLocal.name}: Delete local model ${String(modelId)}`,
    );
    await this.m[modelId].remove();
  }

  /**
   * Converts a model ID to a file path
   *
   * @param modelId - The model ID to convert
   * @returns The file path for the model
   * @private
   */
  private _filePathForModelId<T extends keyof MD>(modelId: T): string {
    if (typeof modelId !== 'string') {
      throw new ImpossibleError('Model ID must be a string');
    }
    return modelId;
  }

  /**
   * Checks if two revision strings refer to the same revision
   *
   * @param a - First revision string
   * @param b - Second revision string
   * @returns True if revisions are the same
   * @private
   */
  private _isSameRev(a: string | null, b: string | null): boolean {
    if (!a || !b) {
      PFLog.err(`Invalid revs a:${a} and b:${b} given`);
      return false;
    }
    if (a === b) {
      return true;
    }
    return cleanRev(a) === cleanRev(b);
  }

  /**
   * Gets the model version for a given model ID
   *
   * @param modelId - The model ID to get the version for
   * @returns The model version number
   * @private
   */
  private _getModelVersion<T extends keyof MD>(modelId: T): number {
    // return this.m[modelId].modelCfg.modelVersion;
    return this._pfapiMain.cfg?.crossModelVersion || 0;
  }
}
