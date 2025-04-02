import { AllSyncModels, ModelCfgs } from '../pfapi.model';
import { pfLog } from '../util/log';
import { ImpossibleError } from '../errors/errors';
import { Pfapi } from '../pfapi';

export class MigrationService<MD extends ModelCfgs> {
  constructor(private _pfapiMain: Pfapi<MD>) {}

  async checkAndMigrateLocalDB(): Promise<void> {
    const meta = await this._pfapiMain.metaModel.load();
    pfLog(2, `${MigrationService.name}.${this.checkAndMigrateLocalDB.name}()`, {
      meta,
    });

    const r = await this.migrate(
      meta.crossModelVersion,
      await this._pfapiMain.getAllSyncModelData(true),
    );
    if (r.wasMigrated) {
      const { dataAfter, versionAfter } = r;
      await this._pfapiMain.importAllSycModelData({
        data: dataAfter,
        crossModelVersion: versionAfter,
        isBackupData: true,
        isAttemptRepair: true,
      });
      await this._pfapiMain.metaModel.save({
        ...meta,
        crossModelVersion: versionAfter,
        lastUpdate: Date.now(),
      });
    }
  }

  async migrate(
    dataInCrossModelVersion: number,
    dataIn: AllSyncModels<MD>,
  ): Promise<{
    dataAfter: AllSyncModels<MD>;
    versionAfter: number;
    wasMigrated: boolean;
  }> {
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
      return {
        dataAfter: dataIn,
        versionAfter: dataInCrossModelVersion,
        wasMigrated: false,
      };
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

    alert(
      `MIGRATING cross model version from ${dataInCrossModelVersion} to ${codeModelVersion}`,
    );

    pfLog(
      2,
      `${MigrationService.name}.${this.migrate.name}() migrate ${dataInCrossModelVersion} to ${codeModelVersion}`,
      {
        migrationKeys,
        migrationsKeysToRun,
        migrationsToRun,
        dataInCrossModelVersion,
        codeModelVersion,
      },
    );

    if (migrationsToRun.length === 0) {
      return {
        dataAfter: dataIn,
        versionAfter: dataInCrossModelVersion,
        wasMigrated: false,
      };
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

    return { dataAfter: dataIn, versionAfter: codeModelVersion, wasMigrated: true };
  }
}
