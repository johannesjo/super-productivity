import { PFAPIModelCfg } from './pfapi.model';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';
import { pfapiLog } from './pfapi-log';

// type ExtractPFAPIModelCfgType<T extends PFAPIModelCfg<unknown>> =
//   T extends PFAPIModelCfg<infer U> ? U : never;

export class PfapiModelCtrl<MT> {
  private _modelCfg: PFAPIModelCfg<MT>;
  private _inMemoryData: MT | null = null;
  private _db: PFAPIDatabase;
  private _metaModel: PFAPIMetaModelCtrl;

  constructor(
    modelCfg: PFAPIModelCfg<MT>,
    db: PFAPIDatabase,
    metaModel: PFAPIMetaModelCtrl,
  ) {
    this._modelCfg = modelCfg;
    this._metaModel = metaModel;
    this._db = db;
  }

  // save<T extends MT>(data: T & { [K in Exclude<keyof T, keyof MT>]?: never }): Promise<unknown> {

  save(data: MT): Promise<unknown> {
    this._inMemoryData = data;
    pfapiLog('PfapiModelCtrl.save', this._modelCfg.id, data);
    return Promise.all([
      this._metaModel.onModelSave(this._modelCfg),
      this._db.save(this._modelCfg.id, data),
    ]);
  }

  async load(): Promise<MT> {
    pfapiLog('PfapiModelCtrl.load', this._inMemoryData);
    return (
      this._inMemoryData || ((await this._db.load(this._modelCfg.id)) as Promise<MT>)
    );
  }
}
