import { ModelBase, ModelCfg } from '../pfapi.model';
import { Database } from '../db/database';
import { MetaModelCtrl } from './meta-model-ctrl';
import { PFLog } from '../../../core/log';
import { ModelValidationError } from '../errors/errors';

// type ExtractModelType<T extends ModelCfg<unknown>> = T extends ModelCfg<infer U> ? U : never;

/**
 * Controller for handling model data operations
 * @template MT - Model type that extends ModelBase
 */
export class ModelCtrl<MT extends ModelBase> {
  private static readonly L = 'ModelCtrl';

  public readonly modelId: string;
  public readonly modelCfg: ModelCfg<MT>;

  private _inMemoryData: MT | null = null;
  private _db: Database;
  private _metaModel: MetaModelCtrl;

  constructor(
    modelId: string,
    modelCfg: ModelCfg<MT>,
    db: Database,
    metaModel: MetaModelCtrl,
  ) {
    this.modelCfg = modelCfg;
    this._metaModel = metaModel;
    this._db = db;
    this.modelId = modelId;
  }

  /**
   * Saves the model data to database
   * @param data Model data to save
   * @param p
   * @returns Promise resolving after save operation
   */
  async save(
    data: MT,
    p?: { isUpdateRevAndLastUpdate: boolean; isIgnoreDBLock?: boolean },
  ): Promise<unknown> {
    this._inMemoryData = data;
    PFLog.normal(`___ ${ModelCtrl.L}.${this.save.name}():${this.modelId}`, p, {
      // Log only safe metadata, not the actual data which might contain credentials
      dataKeys: data ? Object.keys(data) : [],
      dataType: typeof data,
    });

    // Validate data if validator is available
    if (this.modelCfg.validate) {
      const validationResult = this.modelCfg.validate(data);
      if (!validationResult.success) {
        if (this.modelCfg.repair) {
          try {
            data = this.modelCfg.repair(data);
          } catch (e) {
            PFLog.err(e);
            throw new ModelValidationError({
              id: this.modelId,
              data,
              validationResult,
              e,
            });
          }
        } else {
          throw new ModelValidationError({ id: this.modelId, data, validationResult });
        }
      }
    }

    // Update revision if requested
    const isIgnoreDBLock = !!p?.isIgnoreDBLock;
    if (p?.isUpdateRevAndLastUpdate) {
      await this._metaModel.updateRevForModel(
        this.modelId,
        this.modelCfg,
        isIgnoreDBLock,
      );
    }

    // Save data to database
    return this._db.save(this.modelId, data, isIgnoreDBLock);
  }

  /**
   * Updates part of the model data
   * @param data Partial data to update
   * @returns Promise resolving after update operation
   */
  async partialUpdate(data: Partial<MT>): Promise<unknown> {
    if (typeof data !== 'object' || data === null) {
      throw new Error(`${ModelCtrl.L}:${this.modelId}: data is not an object`);
    }

    // Load current data and merge with partial update
    const currentData = (await this.load()) || {};
    const newData = {
      ...currentData,
      ...data,
    } as MT;

    return this.save(newData);
  }

  // TODO implement isSkipMigration
  /**
   * Loads model data from memory cache or database
   * @returns Promise resolving to model data
   */
  async load(): Promise<MT> {
    PFLog.verbose(`${ModelCtrl.L}.${this.load.name}():${this.modelId}`, {
      inMemoryData: this._inMemoryData,
    });
    return (
      this._inMemoryData ||
      ((await this._db.load(this.modelId)) as Promise<MT>) ||
      (this.modelCfg.defaultData as MT)
    );
  }

  /**
   * Deletes model data from database
   * @returns Promise resolving after remove operation
   */
  async remove(): Promise<unknown> {
    PFLog.normal(`${ModelCtrl.L}.${this.remove.name}():${this.modelId}`);
    this._inMemoryData = null;
    return this._db.remove(this.modelId);
  }
}
