import { PFDatabase } from './db/pf-database.class';
import { PFMetaFileContent, PFModelCfg } from './pf.model';

export class PFMetaModelCtrl {
  static readonly META_MODEL_ID = '___PF_META_MODEL___';

  private _db: PFDatabase;
  private _metaModel: PFMetaFileContent;

  constructor(db: PFDatabase) {
    this._db = db;
  }

  onModelSave(modelCfg: PFModelCfg<unknown>): Promise<unknown> {
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

  private _save(metaMode: PFMetaFileContent): Promise<unknown> {
    this._metaModel = metaMode;
    return this._db.save(PFMetaModelCtrl.META_MODEL_ID, {});
  }

  private async _load(): Promise<PFMetaFileContent> {
    return (
      this._metaModel ||
      ((await this._db.load(PFMetaModelCtrl.META_MODEL_ID)) as Promise<PFMetaFileContent>)
    );
  }
}
