import { AllSyncModels, ModelCfgs } from '../pfapi.model';
import { PFLog } from '../../../core/log';
import {
  CanNotMigrateMajorDownError,
  ImpossibleError,
  ModelMigrationError,
} from '../errors/errors';
import { Pfapi } from '../pfapi';
import { PFAPI_MIGRATE_FORCE_VERSION_LS_KEY } from '../pfapi.const';

export class MigrationService<MD extends ModelCfgs> {
  private static readonly L = 'MigrationService';

  constructor(private _pfapiMain: Pfapi<MD>) {}

  async checkAndMigrateLocalDB(): Promise<void> {
    const meta = await this._pfapiMain.metaModel.load();
    PFLog.normal(`${MigrationService.L}.${this.checkAndMigrateLocalDB.name}()`, {
      meta,
    });

    const forceMigrationVersion = +(
      localStorage.getItem(PFAPI_MIGRATE_FORCE_VERSION_LS_KEY) || 0
    );

    const r = await this.migrate(
      forceMigrationVersion || meta.crossModelVersion,
      await this._pfapiMain.getAllSyncModelData(true),
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
        PFLog.normal(`Migration successful: ${meta.crossModelVersion} → ${versionAfter}`);
      } catch (error) {
        PFLog.critical(`Migration failed`, {
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
      PFLog.normal(`${MigrationService.L}.${this.migrate.name}() no migration needed`, {
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
      // TODO implement migrate down
      // if (cfg?.crossModelBackwardMigrations) {
      //   // ...
      // }
      if (Math.floor(dataInCrossModelVersion) !== Math.floor(codeModelVersion)) {
        throw new CanNotMigrateMajorDownError(
          'Saved model version is higher than current one and no backwards migrations available',
        );
      }
    }

    return this._migrateUp(codeModelVersion, dataInCrossModelVersion, dataIn);
  }

  private async _migrateUp(
    codeModelVersion: number,
    dataInCrossModelVersion: number,
    dataIn: AllSyncModels<MD>,
  ): Promise<{
    dataAfter: AllSyncModels<MD>;
    versionAfter: number;
    wasMigrated: boolean;
  }> {
    const cfg = this._pfapiMain.cfg;
    if (!cfg?.crossModelMigrations) {
      throw new ImpossibleError('No migration function provided');
    }

    const migrationKeys = Object.keys(cfg.crossModelMigrations).map((v) => Number(v));
    const migrationsKeysToRun = migrationKeys.filter((v) => v > dataInCrossModelVersion);
    const migrationsToRun = migrationsKeysToRun.map((v) => cfg!.crossModelMigrations![v]);

    PFLog.normal(
      `${MigrationService.L}.${this.migrate.name}() migrate ${dataInCrossModelVersion} to ${codeModelVersion}`,
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
      PFLog.critical(`Migration functions failed to execute`, { error });
      throw new ModelMigrationError('Error running migration functions', error);
    }
  }
}
