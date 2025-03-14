import { PFDatabase } from './db/pf-database.class';
import { PFMetaFileContent, PFModelBase, PFModelCfg } from './pf.model';

export class PFMetaModelCtrl {
  static readonly META_MODEL_ID = '__PF_META_MODEL__';

  private _db: PFDatabase;
  private _metaModel: PFMetaFileContent;

  constructor(db: PFDatabase) {
    this._db = db;
  }

  onModelSave(modelCfg: PFModelCfg<PFModelBase>): Promise<unknown> {
    const timestamp = Date.now();
    return this._update({
      lastLocalSyncModelUpdate: timestamp,
    });
  }

  private async _update(metaModelUpdate: Partial<PFMetaFileContent>): Promise<unknown> {
    this._metaModel = {
      ...(await this._load()),
      ...metaModelUpdate,
    };
    return this._save(this._metaModel);
  }

  private _save(metaModel: PFMetaFileContent): Promise<unknown> {
    this._metaModel = metaModel;
    return this._db.save(PFMetaModelCtrl.META_MODEL_ID, metaModel);
  }

  private async _load(): Promise<PFMetaFileContent> {
    if (this._metaModel) {
      return this._metaModel;
    }

    const data = (await this._db.load(
      PFMetaModelCtrl.META_MODEL_ID,
    )) as PFMetaFileContent;
    // Initialize if not found
    if (!data) {
      const defaultMeta: PFMetaFileContent = {
        revMap: {},
      };
      this._metaModel = defaultMeta;
      return defaultMeta;
    }

    this._metaModel = data;
    return data;
  }
}
