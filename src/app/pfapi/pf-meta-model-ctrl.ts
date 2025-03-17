import { PFDatabase } from './db/pf-database.class';
import { PFBaseCfg, PFMetaFileContent, PFModelBase, PFModelCfg } from './pf.model';
import { MiniObservable } from './util/mini-observable';
import { pfLog } from './util/pf-log';
import { pfGetEnvironmentId } from './util/pf-get-environment-id';

const DEFAULT_META_MODEL: PFMetaFileContent = {
  crossModelVersion: 1,
  revMap: {},
  modelVersions: {},
};

export class PFMetaModelCtrl {
  static readonly META_MODEL_ID = '_PF_meta_';
  static readonly META_MODEL_REMOTE_FILE_NAME = '_PF_meta_';
  static readonly CLIENT_ID = '_PF_client_id_';

  private readonly _db: PFDatabase;
  // private readonly _cfg$: MiniObservable<PFBaseCfg>;
  private _metaModelInMemory?: PFMetaFileContent;
  private _clientIdInMemory?: string;

  constructor(db: PFDatabase, cfg$: MiniObservable<PFBaseCfg>) {
    this._db = db;
  }

  async onModelSave<MT extends PFModelBase>(
    modelId: string,
    modelCfg: PFModelCfg<MT>,
  ): Promise<unknown> {
    pfLog('PFMetaModelCtrl.onModelSave()', modelId, modelCfg);
    const timestamp = Date.now();
    if (modelCfg.isLocalOnly) {
      return Promise.resolve();
    }

    const metaModel = await this.loadMetaModel();
    const isModelVersionChange =
      metaModel.modelVersions[modelId] !== modelCfg.modelVersion;
    return this._updateMetaModel({
      lastLocalSyncModelUpdate: timestamp,
      ...(isModelVersionChange
        ? {
            modelVersions: {
              ...metaModel.modelVersions,
              [modelId]: modelCfg.modelVersion,
            },
          }
        : {}),
    });
  }

  private async _updateMetaModel(
    metaModelUpdate: Partial<PFMetaFileContent>,
  ): Promise<unknown> {
    pfLog('PFMetaModelCtrl._updateMetaModel()', metaModelUpdate);
    this._metaModelInMemory = {
      ...(await this.loadMetaModel()),
      ...metaModelUpdate,
    };
    return this.saveMetaModel(this._metaModelInMemory);
  }

  saveMetaModel(metaModel: PFMetaFileContent): Promise<unknown> {
    this._metaModelInMemory = metaModel;
    return this._db.save(PFMetaModelCtrl.META_MODEL_ID, metaModel);
  }

  async loadMetaModel(): Promise<PFMetaFileContent> {
    if (this._metaModelInMemory) {
      return this._metaModelInMemory;
    }

    const data = (await this._db.load(
      PFMetaModelCtrl.META_MODEL_ID,
    )) as PFMetaFileContent;
    // Initialize if not found
    if (!data) {
      this._metaModelInMemory = { ...DEFAULT_META_MODEL };
      return this._metaModelInMemory;
    }

    this._metaModelInMemory = data;
    return data;
  }

  async loadClientId(): Promise<string> {
    if (this._clientIdInMemory) {
      return this._clientIdInMemory;
    }
    const clientId = await this._db.load(PFMetaModelCtrl.CLIENT_ID);
    if (typeof clientId !== 'string') {
      throw new Error('Client ID not found');
    }
    return clientId;
  }

  private _saveClientId(clientId: string): Promise<unknown> {
    this._clientIdInMemory = clientId;
    return this._db.save(PFMetaModelCtrl.CLIENT_ID, clientId);
  }

  private _generateClientId(): string {
    return pfGetEnvironmentId() + '_' + Date.now();
  }
}
