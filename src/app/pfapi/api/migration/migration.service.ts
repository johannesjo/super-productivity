import {
  AllSyncModels,
  ModelCfgs,
  ModelCfgToModelCtrl,
  ModelVersionMap,
} from '../pfapi.model';
import { pfLog } from '../util/log';
import { ImpossibleError, ModelMigrationError } from '../errors/errors';
import { Pfapi } from '../pfapi';

export class MigrationService<MD extends ModelCfgs> {
  constructor(
    private _pfapiMain: Pfapi<MD>,
    public m: ModelCfgToModelCtrl<MD>,
  ) {}

  async checkAndMigrateLocalDB(): Promise<void> {
    const meta = await this._pfapiMain.metaModel.load();
    pfLog(2, `${MigrationService.name}.${this.checkAndMigrateLocalDB.name}()`, {
      meta,
    });

    const r = await this.migrate(
      meta.crossModelVersion,
      await this._pfapiMain.getAllSyncModelData(true),
      meta.modelVersions,
    );
    if (r.wasMigrated) {
      const { dataAfter, versionAfter } = r;
      try {
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
        pfLog(2, `Migration successful: ${meta.crossModelVersion} → ${versionAfter}`);
      } catch (error) {
        pfLog(0, `Migration failed`, {
          error,
          fromVersion: meta.crossModelVersion,
          toVersion: versionAfter,
        });
        throw new ModelMigrationError(error);
      }
    }
  }

  async migrate(
    dataInCrossModelVersion: number,
    dataIn: AllSyncModels<MD>,
    modelVersionMap: ModelVersionMap,
  ): Promise<{
    dataAfter: AllSyncModels<MD>;
    versionAfter: number;
    wasMigrated: boolean;
  }> {
    const cfg = this._pfapiMain.cfg;
    const codeModelVersion = cfg?.crossModelVersion;
    // const singleModelsToMigrate = Object.keys(modelVersionMap).filter();

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

    try {
      let migratedData = { ...dataIn };
      migrationsToRun.forEach((migrateFn) => {
        migratedData = migrateFn(migratedData);
      });

      return {
        dataAfter: migratedData,
        versionAfter: codeModelVersion,
        wasMigrated: true,
      };
    } catch (error) {
      pfLog(0, `Migration functions failed to execute`, { error });
      throw new ModelMigrationError('Error running migration functions', error);
    }
  }

  // private _getSingleModelIdsToMigrate(modelVersionMap: ModelVersionMap): string[] {
  //   return Object.keys(modelVersionMap).filter((modelId) => {
  //     const modelCtrl = this.m[modelId];
  //     // if (!modelCtrl) {
  //     //   throw new ImpossibleError(`Model controller not found for ${modelId}`);
  //     // }
  //     return modelCtrl.modelCfg.modelVersion > modelVersionMap[modelId];
  //   });
  // }
  //
  // private _migrateSingleModels(migratedData: any) {
  //   const modelIds = Object.keys(this.m);
  //   for (const modelId of modelIds) {
  //     const modelCtrl = this.m[modelId];
  //     // TODO fix
  //     // @ts-ignore
  //     migratedData[modelId] = modelCtrl.migrate(migratedData, modelVersionMap[modelId]);
  //   }
  // }
}
