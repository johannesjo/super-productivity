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

  private readonly _db: PFDatabase;
  private readonly _cfg$: MiniObservable<PFBaseCfg>;
  private _metaModelInMemory: PFMetaFileContent;

  constructor(db: PFDatabase, cfg$: MiniObservable<PFBaseCfg>) {
    this._db = db;
  }

  async onModelSave(
    modelId: string,
    modelCfg: PFModelCfg<PFModelBase>,
  ): Promise<unknown> {
    const timestamp = Date.now();
    if (modelCfg.isLocalOnly) {
      return Promise.resolve();
    }

    return this._update({
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

  private async _update(metaModelUpdate: Partial<PFMetaFileContent>): Promise<unknown> {
    this._metaModelInMemory = {
      ...(await this._load()),
      ...metaModelUpdate,
    };
    return this._save(this._metaModelInMemory);
  }

  private _save(metaModel: PFMetaFileContent): Promise<unknown> {
    this._metaModelInMemory = metaModel;
    return this._db.save(PFMetaModelCtrl.META_MODEL_ID, metaModel);
  }

  private async _load(): Promise<PFMetaFileContent> {
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
}
