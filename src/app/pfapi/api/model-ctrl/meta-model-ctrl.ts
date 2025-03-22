import { Database } from '../db/database';
import { LocalMeta, ModelBase, ModelCfg } from '../pfapi.model';
import { pfLog } from '../util/log';
import { getEnvironmentId } from '../util/get-environment-id';
import { DBNames } from '../pfapi.const';
import {
  ClientIdNotFoundError,
  InvalidMetaError,
  MetaNotReadyError,
} from '../errors/errors';
import { validateLocalMeta } from '../util/validate-local-meta';
import { PFEventEmitter } from '../util/events';

const DEFAULT_META_MODEL: LocalMeta = {
  crossModelVersion: 1,
  revMap: {},
  modelVersions: {},
  // TODO make mandatory
  lastUpdate: Date.now(),
  metaRev: null,
  lastSyncedUpdate: null,
};

export class MetaModelCtrl {
  static readonly META_MODEL_ID = DBNames.MetaModel;
  static readonly META_MODEL_REMOTE_FILE_NAME = DBNames.MetaModel;
  static readonly CLIENT_ID = DBNames.ClientId;
  public readonly IS_MAIN_FILE_MODE: boolean;

  private readonly _db: Database;
  private _metaModelInMemory?: LocalMeta;
  private _clientIdInMemory?: string;
  private _ev: PFEventEmitter;

  constructor(db: Database, _IS_MAIN_FILE_MODE: boolean, ev: PFEventEmitter) {
    this._db = db;
    this.IS_MAIN_FILE_MODE = _IS_MAIN_FILE_MODE;
    this._ev = ev;
    //
    this.loadClientId().catch((e) => {
      if (e instanceof ClientIdNotFoundError) {
        const clientIdI = this._generateClientId();
        pfLog(2, `${MetaModelCtrl.name} Create clientId ${clientIdI}`);
        this._saveClientId(clientIdI);
      }
    });
    this.loadMetaModel().then((v) => {
      this._metaModelInMemory = v;
    });
  }

  // TODO unit test
  updateRevForModel<MT extends ModelBase>(modelId: string, modelCfg: ModelCfg<MT>): void {
    pfLog(2, `${MetaModelCtrl.name}.${this.updateRevForModel.name}()`, modelId, {
      modelCfg,
      inMemory: this._metaModelInMemory,
    });
    if (modelCfg.isLocalOnly) {
      return;
    }
    const timestamp = Date.now();

    const metaModel = this._metaModelInMemory;
    if (!metaModel) {
      throw new MetaNotReadyError(modelId, modelCfg);
    }

    const isModelVersionChange =
      metaModel.modelVersions[modelId] !== modelCfg.modelVersion;

    this.saveMetaModel({
      ...metaModel,
      lastUpdate: timestamp,

      ...(modelCfg.isMainFileModel && this.IS_MAIN_FILE_MODE
        ? {}
        : {
            revMap: {
              ...metaModel.revMap,
              [modelId]: timestamp.toString(),
            },
          }),

      ...(isModelVersionChange
        ? {
            modelVersions: {
              ...metaModel.modelVersions,
              [modelId]: modelCfg.modelVersion,
            },
          }
        : {}),
    });
  }

  saveMetaModel(metaModel: LocalMeta): Promise<unknown> {
    pfLog(2, `${MetaModelCtrl.name}.${this.saveMetaModel.name}()`, metaModel);
    if (!metaModel.lastUpdate) {
      throw new InvalidMetaError(
        `${MetaModelCtrl.name}.${this.saveMetaModel.name}()`,
        'lastUpdate not found',
      );
    }

    // NOTE: in order to not mess up separate model updates started at the same time, we need to update synchronously as well
    this._metaModelInMemory = validateLocalMeta(metaModel);
    this._ev.emit('metaModelChange', metaModel);
    return this._db.save(MetaModelCtrl.META_MODEL_ID, metaModel);
  }

  async loadMetaModel(): Promise<LocalMeta> {
    pfLog(
      3,
      `${MetaModelCtrl.name}.${this.loadMetaModel.name}()`,
      this._metaModelInMemory,
    );
    if (this._metaModelInMemory) {
      return this._metaModelInMemory;
    }

    const data = (await this._db.load(MetaModelCtrl.META_MODEL_ID)) as LocalMeta;
    // Initialize if not found
    if (!data) {
      this._metaModelInMemory = { ...DEFAULT_META_MODEL };
      return this._metaModelInMemory;
    }
    if (!data.revMap) {
      throw new InvalidMetaError('loadMetaModel: revMap not found');
    }

    this._metaModelInMemory = data;
    return data;
  }

  async loadClientId(): Promise<string> {
    if (this._clientIdInMemory) {
      return this._clientIdInMemory;
    }
    const clientId = await this._db.load(MetaModelCtrl.CLIENT_ID);
    if (typeof clientId !== 'string') {
      throw new ClientIdNotFoundError();
    }
    return clientId;
  }

  private _saveClientId(clientId: string): Promise<unknown> {
    pfLog(2, `${MetaModelCtrl.name}.${this._saveClientId.name}()`, clientId);
    this._clientIdInMemory = clientId;
    return this._db.save(MetaModelCtrl.CLIENT_ID, clientId);
  }

  private _generateClientId(): string {
    pfLog(2, `${MetaModelCtrl.name}.${this._generateClientId.name}()`);
    return getEnvironmentId() + '_' + Date.now();
  }
}
