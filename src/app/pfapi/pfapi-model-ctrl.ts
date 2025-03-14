import { PFAPIModelCfg } from './pfapi.model';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';
import { pfapiLog } from './pfapi-log';

// type ExtractPFAPIModelCfgType<T extends PFAPIModelCfg<unknown>> =
//   T extends PFAPIModelCfg<infer U> ? U : never;

export class PFAPIModelCtrl<MT> {
  public readonly modelId: string;
  public readonly modelCfg: PFAPIModelCfg<MT>;

  private _inMemoryData: MT | null = null;
  private _db: PFAPIDatabase;
  private _metaModel: PFAPIMetaModelCtrl;

  constructor(
    modelId: string,
    modelCfg: PFAPIModelCfg<MT>,
    db: PFAPIDatabase,
    metaModel: PFAPIMetaModelCtrl,
  ) {
    this.modelCfg = modelCfg;
    this._metaModel = metaModel;
    this._db = db;
    this.modelId = modelId;
  }

  save(data: MT): Promise<unknown> {
    this._inMemoryData = data;
    pfapiLog('PFAPIModelCtrl.save', this.modelId, data);
    return Promise.all([
      this._metaModel.onModelSave(this.modelCfg),
      this._db.save(this.modelId, data),
    ]);
  }

  async partialUpdate(data: Partial<MT>): Promise<unknown> {
    if (typeof data !== 'object') {
      throw new Error(`PFAPIModelCtrl.${data} is not an object`);
    }
    const newData = {
      ...(await this.load()),
      ...data,
    };
    return this.save(newData);
  }

  async load(): Promise<MT> {
    pfapiLog('PFAPIModelCtrl.load', this._inMemoryData);
    return this._inMemoryData || ((await this._db.load(this.modelId)) as Promise<MT>);
  }
}
