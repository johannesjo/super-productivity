import { AllSyncModels, ModelCfgs } from '../pfapi.model';
import { pfLog } from '../util/log';
import { ImpossibleError } from '../errors/errors';
import { Pfapi } from '../pfapi';

export class MigrationService<MD extends ModelCfgs> {
  constructor(private _pfapiMain: Pfapi<MD>) {}

  async checkAndMigrateLocalDB(): Promise<void> {
    const meta = await this._pfapiMain.metaModel.load();

    const r = await this.migrate(
      meta.crossModelVersion,
      await this._pfapiMain.getAllSyncModelData(true),
    );
    if (r) {
      const { migratedData, migratedVersion } = r;
      await this._pfapiMain.importAllSycModelData({
        data: migratedData,
        crossModelVersion: migratedVersion,
        isBackupData: true,
        isAttemptRepair: true,
      });
      await this._pfapiMain.metaModel.save({
        ...meta,
        crossModelVersion: migratedVersion,
        lastUpdate: Date.now(),
      });
    }
  }

  async migrate(
    dataInCrossModelVersion: number,
    dataIn: AllSyncModels<MD>,
  ): Promise<{ migratedData: AllSyncModels<MD>; migratedVersion: number } | null> {
    const cfg = this._pfapiMain.cfg;
    const codeModelVersion = cfg?.crossModelVersion;
    if (
      typeof codeModelVersion !== 'number' ||
      dataInCrossModelVersion === codeModelVersion
    ) {
      pfLog(2, `${MigrationService.name}.${this.migrate.name}() no migration needed`, {
        dataInCrossModelVersion,
        codeModelVersion,
      });
      return null;
    }
    if (dataInCrossModelVersion > codeModelVersion) {
      throw new ImpossibleError('Saved model version is higher than current one');
    }
    if (!cfg?.crossModelMigrations) {
      throw new ImpossibleError('No migration function provided');
    }

    const migrationKeys = Object.keys(cfg.crossModelMigrations).map((v) => Number(v));
    const migrationsKeysToRun = migrationKeys.filter((v) => v > dataInCrossModelVersion);
    const migrationsToRun = migrationsKeysToRun.map((v) => cfg!.crossModelMigrations![v]);

    pfLog(2, `${MigrationService.name}.${this.migrate.name}()`, {
      migrationKeys,
      migrationsKeysToRun,
      migrationsToRun,
      dataInCrossModelVersion,
      codeModelVersion,
    });

    if (migrationsToRun.length === 0) {
      return null;
    }

    migrationsToRun.forEach((migrateFn) => {
      dataIn = migrateFn(dataIn);
    });

    // TODO single model migration
    // const modelIds = Object.keys(this.m);
    // for (const modelId of modelIds) {
    //   const modelCtrl = this.m[modelId];
    //
    // }

    return { migratedData: dataIn, migratedVersion: codeModelVersion };
  }
}
