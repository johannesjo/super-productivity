import { MigrationService } from './migration.service';
import { PFLog } from '../../../core/log';

describe('MigrationService', () => {
  let service: MigrationService<any>;
  let mockPfapi: any;
  let mockMetaModel: jasmine.SpyObj<any>;

  beforeEach(() => {
    mockMetaModel = jasmine.createSpyObj('metaModel', ['load', 'save']);

    mockPfapi = {
      getAllSyncModelDataFromModelCtrls: jasmine
        .createSpy('getAllSyncModelDataFromModelCtrls')
        .and.resolveTo({}),
      importAllSycModelData: jasmine.createSpy('importAllSycModelData').and.resolveTo(),
      metaModel: mockMetaModel,
      cfg: {
        crossModelVersion: 4.5,
        crossModelMigrations: {},
      },
    };

    // Spy on PFLog
    spyOn(PFLog, 'normal');
    spyOn(PFLog, 'critical');

    service = new MigrationService(mockPfapi);
  });

  describe('checkAndMigrateLocalDB', () => {
    it('should read data from ModelCtrls directly (not NgRx delegate)', async () => {
      // Setup: version matches, no migration needed
      mockMetaModel.load.and.resolveTo({ crossModelVersion: 4.5 });
      mockPfapi.getAllSyncModelDataFromModelCtrls.and.resolveTo({
        task: { ids: ['t1'] },
      });

      await service.checkAndMigrateLocalDB();

      // Verify we called getAllSyncModelDataFromModelCtrls
      expect(mockPfapi.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
    });

    it('should skip migration if versions match', async () => {
      mockMetaModel.load.and.resolveTo({ crossModelVersion: 4.5 });
      mockPfapi.getAllSyncModelDataFromModelCtrls.and.resolveTo({
        task: { ids: ['t1'] },
      });

      await service.checkAndMigrateLocalDB();

      expect(PFLog.normal).toHaveBeenCalledWith(
        jasmine.stringContaining('no migration needed'),
        jasmine.anything(),
      );
      expect(mockPfapi.importAllSycModelData).not.toHaveBeenCalled();
    });

    it('should run migration if data version is lower than code version', async () => {
      // Data version 4.0, code version 4.5
      mockMetaModel.load.and.resolveTo({ crossModelVersion: 4.0 });

      const legacyData = { task: { ids: ['t1'] } };
      mockPfapi.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);

      // Add migration function
      const migrationFn = jasmine.createSpy('migrationFn').and.callFake((data: any) => ({
        ...data,
        migrated: true,
      }));
      // eslint-disable-next-line @typescript-eslint/naming-convention
      (mockPfapi.cfg as any).crossModelMigrations = { '4.5': migrationFn };

      await service.checkAndMigrateLocalDB();

      // Migration should have been called
      expect(migrationFn).toHaveBeenCalled();

      // Should import the migrated data
      expect(mockPfapi.importAllSycModelData).toHaveBeenCalledWith(
        jasmine.objectContaining({
          data: jasmine.objectContaining({ migrated: true }),
          crossModelVersion: 4.5,
          isBackupData: true,
          isAttemptRepair: true,
        }),
      );
    });

    it('should respect force migration version from localStorage', async () => {
      // Simulate localStorage having a force version
      spyOn(localStorage, 'getItem').and.returnValue('3.0');

      mockMetaModel.load.and.resolveTo({ crossModelVersion: 4.5 });
      mockPfapi.getAllSyncModelDataFromModelCtrls.and.resolveTo({
        task: { ids: ['t1'] },
      });

      // Add migrations for 3.5 and 4.0 and 4.5
      const migration35 = jasmine.createSpy('migration35').and.callFake((d: any) => d);
      const migration40 = jasmine.createSpy('migration40').and.callFake((d: any) => d);
      const migration45 = jasmine.createSpy('migration45').and.callFake((d: any) => d);

      /* eslint-disable @typescript-eslint/naming-convention */
      (mockPfapi.cfg as any).crossModelMigrations = {
        '3.5': migration35,
        '4': migration40,
        '4.5': migration45,
      };
      /* eslint-enable @typescript-eslint/naming-convention */

      await service.checkAndMigrateLocalDB();

      // All migrations from 3.0 to 4.5 should be called
      expect(migration35).toHaveBeenCalled();
      expect(migration40).toHaveBeenCalled();
      expect(migration45).toHaveBeenCalled();
    });
  });

  describe('migrate', () => {
    it('should return wasMigrated: false if versions match', async () => {
      const data = { task: { ids: ['t1'] } };
      const result = await service.migrate(4.5, data);

      expect(result.wasMigrated).toBe(false);
      expect(result.dataAfter).toBe(data);
      expect(result.versionAfter).toBe(4.5);
    });

    it('should run migrations in order when version is lower', async () => {
      const data = { task: { ids: ['t1'] }, version: 'original' };
      const callOrder: number[] = [];

      /* eslint-disable @typescript-eslint/naming-convention */
      (mockPfapi.cfg as any).crossModelMigrations = {
        '4.2': (d: any) => {
          callOrder.push(4.2);
          return { ...d, v42: true };
        },
        '4.3': (d: any) => {
          callOrder.push(4.3);
          return { ...d, v43: true };
        },
        '4.5': (d: any) => {
          callOrder.push(4.5);
          return { ...d, v45: true };
        },
      };
      /* eslint-enable @typescript-eslint/naming-convention */

      const result = await service.migrate(4.1, data);

      expect(result.wasMigrated).toBe(true);
      expect(result.versionAfter).toBe(4.5);
      expect(callOrder).toEqual([4.2, 4.3, 4.5]);
      expect(result.dataAfter).toEqual(
        jasmine.objectContaining({
          v42: true,
          v43: true,
          v45: true,
        }),
      );
    });

    it('should throw CanNotMigrateMajorDownError for major version downgrade', async () => {
      const data = { task: { ids: ['t1'] } };

      // Data version 5.0, code version 4.5 (major version difference)
      await expectAsync(service.migrate(5.0, data)).toBeRejectedWithError(
        /higher than current one/,
      );
    });

    it('should allow minor version downgrade without error', async () => {
      const data = { task: { ids: ['t1'] } };

      // Data version 4.6, code version 4.5 (same major version)
      const result = await service.migrate(4.6, data);

      // Should not throw, just return without migration
      expect(result.wasMigrated).toBe(false);
    });
  });
});
