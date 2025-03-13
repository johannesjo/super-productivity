import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIMetaFileContent, PFAPIModelCfg } from './pfapi.model';

export class PFAPIMetaModelCtrl {
  static readonly META_MODEL_ID = '___PFAPI_META_MODEL___';

  private _db: PFAPIDatabase;
  private _metaModel: PFAPIMetaFileContent;

  constructor(db: PFAPIDatabase) {
    this._db = db;
  }

  onModelSave(modelCfg: PFAPIModelCfg<unknown>): Promise<unknown> {
    const timestamp = Date.now();
    return this._update({
      lastLocalSyncModelUpdate: timestamp,
    });
  }

  private async _update(
    metaModelUpdate: Partial<PFAPIMetaFileContent>,
  ): Promise<unknown> {
    this._metaModel = {
      ...(await this._load()),
      ...metaModelUpdate,
    };
    return this._save(this._metaModel);
  }

  private _save(metaMode: PFAPIMetaFileContent): Promise<unknown> {
    this._metaModel = metaMode;
    return this._db.save(PFAPIMetaModelCtrl.META_MODEL_ID, {});
  }

  private async _load(): Promise<PFAPIMetaFileContent> {
    return (
      this._metaModel ||
      ((await this._db.load(
        PFAPIMetaModelCtrl.META_MODEL_ID,
      )) as Promise<PFAPIMetaFileContent>)
    );
  }
}
