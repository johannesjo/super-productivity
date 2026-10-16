import { TestBed } from '@angular/core/testing';
import { openDB } from 'idb';
import { LegacySupDbService } from './legacy-sup-db.service';
import legacyV12Data from '../../op-log/backup/test-fixtures/legacy-v10-backup.json';
import {
  isLegacyBackupData,
  migrateLegacyBackup,
} from '../../op-log/backup/migrate-legacy-backup';
import { isDataRepairPossible } from '../../op-log/validation/is-data-repair-possible.util';
import { AppDataComplete } from '../../op-log/model/model-config';

const DB_NAME = 'SUP';
const STORE_NAME = 'SUP_STORE';

/** Lays out `SUP` the way v12's IndexedDBAdapterService did: one record per model. */
const seedSupDb = async (records: Record<string, unknown>): Promise<void> => {
  const db = await openDB(DB_NAME, 2, {
    upgrade: (database) => {
      database.createObjectStore(STORE_NAME);
    },
  });
  for (const [key, value] of Object.entries(records)) {
    await db.put(STORE_NAME, value, key);
  }
  db.close();
};

const deleteSupDb = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });

const supDbExists = async (): Promise<boolean> =>
  (await indexedDB.databases()).some((db) => db.name === DB_NAME);

/** The fixture is a v11/v12 `loadComplete()` result; its model keys are the `SUP_STORE` records. */
const v12Records = (): Record<string, unknown> => {
  const models = Object.entries(legacyV12Data).filter(
    ([key]) => key !== 'lastLocalSyncModelChange' && key !== 'lastArchiveUpdate',
  );
  return {
    ...Object.fromEntries(models),
    LOCAL_LAST_SYNC_MODEL_CHANGE: legacyV12Data.lastLocalSyncModelChange,
  };
};

describe('LegacySupDbService', () => {
  let service: LegacySupDbService;

  beforeEach(async () => {
    await deleteSupDb();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegacySupDbService);
  });

  afterEach(async () => {
    await deleteSupDb();
  });

  it('should return null and not create the database when there is none', async () => {
    expect(await service.loadUnmigratedData()).toBeNull();
    expect(await supDbExists()).toBe(false);
  });

  it('should load a never-migrated v12 profile', async () => {
    await seedSupDb(v12Records());

    const data = await service.loadUnmigratedData();

    expect(data).not.toBeNull();
    expect((data!.task as { ids: string[] }).ids).toEqual(legacyV12Data.task.ids);
    expect((data!.project as { ids: string[] }).ids).toEqual(['proj-1']);
    expect(data!.taskArchive).toEqual(legacyV12Data.taskArchive);
    expect(data!.globalConfig).toEqual(legacyV12Data.globalConfig);
    expect('LOCAL_LAST_SYNC_MODEL_CHANGE' in data!).toBe(false);
  });

  it('should hand the import path data it migrates and accepts', async () => {
    await seedSupDb(v12Records());

    const data = (await service.loadUnmigratedData())!;

    expect(isLegacyBackupData(data)).toBe(true);
    expect(isDataRepairPossible(data as unknown as AppDataComplete)).toBe(true);
    const migrated = migrateLegacyBackup(data);
    expect(migrated.task.ids).toEqual(jasmine.arrayContaining(legacyV12Data.task.ids));
    expect(migrated.archiveYoung.task.ids).toEqual(
      jasmine.arrayContaining(legacyV12Data.taskArchive.ids),
    );
  });

  it('should return null once v13–v16 had migrated it (marker 42)', async () => {
    await seedSupDb({ ...v12Records(), LOCAL_LAST_SYNC_MODEL_CHANGE: 42 });

    expect(await service.loadUnmigratedData()).toBeNull();
  });

  it('should return null when the profile holds no user data', async () => {
    await seedSupDb({
      LOCAL_LAST_SYNC_MODEL_CHANGE: 1705341600000,
      globalConfig: legacyV12Data.globalConfig,
      task: { ids: [], entities: {} },
      project: { ids: [], entities: {} },
    });

    expect(await service.loadUnmigratedData()).toBeNull();
  });

  it('should fill the slices the import requires when records are missing', async () => {
    await seedSupDb({ taskArchive: legacyV12Data.taskArchive });

    const data = (await service.loadUnmigratedData())!;

    expect(data).not.toBeNull();
    expect(data.task).toEqual({ ids: [], entities: {} });
    expect(data.project).toEqual({ ids: [], entities: {} });
  });

  it('should not read stray non-model records', async () => {
    await seedSupDb({ ...v12Records(), SUP_COMPLETE_BACKUP: { huge: true } });

    const data = (await service.loadUnmigratedData())!;

    expect('SUP_COMPLETE_BACKUP' in data).toBe(false);
  });
});
