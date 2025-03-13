import { PFAPIModelCfg } from './pfapi.model';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';

export class PfapiModelCtrl<M> {
  private _modelCfg: PFAPIModelCfg<M>;
  private _inMemoryData: M | null = null;
  private _db: PFAPIDatabase;
  private _metaModel: PFAPIMetaModelCtrl;

  constructor(
    modelCfg: PFAPIModelCfg<M>,
    db: PFAPIDatabase,
    metaModel: PFAPIMetaModelCtrl,
  ) {
    this._modelCfg = modelCfg;
    this._metaModel = metaModel;
    this._db = db;
  }

  save(data: M): Promise<unknown> {
    this._inMemoryData = data;

    return Promise.all([
      this._metaModel.onModelSave(this._modelCfg),
      this._db.save(this._modelCfg.id, data),
    ]);
  }

  async load(): Promise<M> {
    return this._inMemoryData || ((await this._db.load(this._modelCfg.id)) as Promise<M>);
  }
}
