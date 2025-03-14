import { PFModelCfg } from './pf.model';
import { PFDatabase } from './db/pf-database.class';
import { PFMetaModelCtrl } from './pf-meta-model-ctrl';
import { pfLog } from './pf-log';

// type ExtractPFModelCfgType<T extends PFModelCfg<unknown>> =
//   T extends PFModelCfg<infer U> ? U : never;

export class PFModelCtrl<MT> {
  public readonly modelId: string;
  public readonly modelCfg: PFModelCfg<MT>;

  private _inMemoryData: MT | null = null;
  private _db: PFDatabase;
  private _metaModel: PFMetaModelCtrl;

  constructor(
    modelId: string,
    modelCfg: PFModelCfg<MT>,
    db: PFDatabase,
    metaModel: PFMetaModelCtrl,
  ) {
    this.modelCfg = modelCfg;
    this._metaModel = metaModel;
    this._db = db;
    this.modelId = modelId;
  }

  save(data: MT): Promise<unknown> {
    this._inMemoryData = data;
    pfLog('PFModelCtrl.save', this.modelId, data);
    return Promise.all([
      this._metaModel.onModelSave(this.modelCfg),
      this._db.save(this.modelId, data),
    ]);
  }

  async partialUpdate(data: Partial<MT>): Promise<unknown> {
    if (typeof data !== 'object') {
      throw new Error(`PFModelCtrl.${data} is not an object`);
    }
    const newData = {
      ...(await this.load()),
      ...data,
    };
    return this.save(newData);
  }

  async load(): Promise<MT> {
    pfLog('PFModelCtrl.load', this._inMemoryData);
    return this._inMemoryData || ((await this._db.load(this.modelId)) as Promise<MT>);
  }
}
