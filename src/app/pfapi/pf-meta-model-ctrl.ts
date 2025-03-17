import { PFDatabase } from './db/pf-database.class';
import { PFBaseCfg, PFMetaFileContent, PFModelBase, PFModelCfg } from './pf.model';
import { MiniObservable } from './util/mini-observable';

const DEFAULT_META_MODEL: PFMetaFileContent = {
  crossModelVersion: 1,
  revMap: {},
  modelVersions: {},
};

export class PFMetaModelCtrl {
  static readonly META_MODEL_ID = '__PF_META_MODEL__';
  static readonly CLIENT_ID = '__PF_CLIENT_ID__';

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
    const timestamp = Date.now();
    if (modelCfg.isLocalOnly) {
      return Promise.resolve();
    }

    return this._updateMetaModel({
      lastLocalSyncModelUpdate: timestamp,
    });

    // TODO this or other approach
    // const isModelVersionChange =
    //   this._metaModelInMemory.modelVersions[modelId] !== modelCfg.modelVersion;
    // return this._update({
    //   lastLocalSyncModelUpdate: timestamp,
    //   ...(isModelVersionChange
    //     ? {
    //         modelVersions: {
    //           ...(await this._load()).modelVersions,
    //           [modelId]: modelCfg.modelVersion,
    //         },
    //       }
    //     : {}),
    // });
  }

  private async _updateMetaModel(
    metaModelUpdate: Partial<PFMetaFileContent>,
  ): Promise<unknown> {
    this._metaModelInMemory = {
      ...(await this._loadMetaModel()),
      ...metaModelUpdate,
    };
    return this._saveMetaModel(this._metaModelInMemory);
  }

  private _saveMetaModel(metaModel: PFMetaFileContent): Promise<unknown> {
    this._metaModelInMemory = metaModel;
    return this._db.save(PFMetaModelCtrl.META_MODEL_ID, metaModel);
  }

  private async _loadMetaModel(): Promise<PFMetaFileContent> {
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

  private _saveClientId(clientId: string): Promise<unknown> {
    this._clientIdInMemory = clientId;
    return this._db.save(PFMetaModelCtrl.CLIENT_ID, clientId);
  }

  private async _loadClientId(): Promise<string> {
    if (this._clientIdInMemory) {
      return this._clientIdInMemory;
    }
    const clientId = await this._db.load(PFMetaModelCtrl.CLIENT_ID);
    if (typeof clientId !== 'string') {
      throw new Error('Client ID not found');
    }
    return clientId;
  }
}
