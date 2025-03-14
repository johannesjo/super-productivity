import { PFAPIModelCfg } from './pfapi.model';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';
import { pfapiLog } from './pfapi-log';

export class PfapiModelCtrl<MC> {
  private _modelCfg: PFAPIModelCfg<MC>;
  private _inMemoryData: MC | null = null;
  private _db: PFAPIDatabase;
  private _metaModel: PFAPIMetaModelCtrl;

  constructor(
    modelCfg: PFAPIModelCfg<MC>,
    db: PFAPIDatabase,
    metaModel: PFAPIMetaModelCtrl,
  ) {
    this._modelCfg = modelCfg;
    this._metaModel = metaModel;
    this._db = db;
  }

  save(data: MC): Promise<unknown> {
    this._inMemoryData = data;

    pfapiLog('PfapiModelCtrl.save', this._modelCfg.id, data);

    return Promise.all([
      this._metaModel.onModelSave(this._modelCfg),
      this._db.save(this._modelCfg.id, data),
    ]);
  }

  async load(): Promise<MC> {
    pfapiLog('PfapiModelCtrl.load', this._inMemoryData);
    return (
      this._inMemoryData || ((await this._db.load(this._modelCfg.id)) as Promise<MC>)
    );
  }
}
