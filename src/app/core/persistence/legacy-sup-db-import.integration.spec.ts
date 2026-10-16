import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { openDB } from 'idb';
import { LegacySupDbService } from './legacy-sup-db.service';
import { BackupService } from '../../op-log/backup/backup.service';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { StateSnapshotService } from '../../op-log/backup/state-snapshot.service';
import { OperationLogStoreService } from '../../op-log/persistence/operation-log-store.service';
import { OperationWriteFlushService } from '../../op-log/sync/operation-write-flush.service';
import { LockService } from '../../op-log/sync/lock.service';
import { TaskTimeSyncService } from '../../features/tasks/task-time-sync.service';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../../op-log/model/model-config';
import { validateFull } from '../../op-log/validation/validation-fn';
import legacyV10Backup from '../../op-log/backup/test-fixtures/legacy-v10-backup.json';
import legacySupV12Records from '../../op-log/backup/test-fixtures/legacy-sup-v12-records.json';

/**
 * #7345: the never-migrated `SUP` database of a v11/v12 profile, read by
 * LegacySupDbService and run through the real import pipeline the startup
 * offer uses (BackupService.importCompleteBackup: migrateLegacyBackup,
 * validation, repair). Only the op-log write and the NgRx store are stubbed.
 *
 * `legacy-sup-v12-records.json` is the record layout of a v12.0.5 `SUP_STORE`
 * built from that release's model defaults (FIRST_PROJECT `INBOX`, TODAY tag
 * in task.tagIds, `plannedAt` + `reminders`, `_showSubTasksMode`, flat
 * `taskArchive`, project/tag work times, tag-only tasks, boards, a GitHub
 * issue provider), plus the non-model records v12 kept in the same store.
 */

const DB_NAME = 'SUP';
const STORE_NAME = 'SUP_STORE';

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

const v10BackupAsRecords = (): Record<string, unknown> => {
  const { lastLocalSyncModelChange, lastArchiveUpdate, ...models } =
    structuredClone(legacyV10Backup);
  void lastArchiveUpdate;
  return { ...models, LOCAL_LAST_SYNC_MODEL_CHANGE: lastLocalSyncModelChange };
};

/** v12 records whose slices were last written by older model versions. */
const olderModelVersionRecords = (): Record<string, any> => {
  const r = structuredClone(legacySupV12Records) as Record<string, any>;
  // globalConfig pre-v4: no __modelVersion, timeline instead of schedule,
  // no timeTracking (trackingReminder + misc), partial keyboard.
  const gc = r.globalConfig;
  delete gc.__modelVersion;
  gc.timeline = gc.schedule;
  delete gc.schedule;
  delete gc.timeTracking;
  gc.trackingReminder = { isEnabled: true, isShowOnMobile: false, minTime: 300000 };
  gc.misc.isAutoStartNextTask = true;
  gc.keyboard = { globalShowHide: 'Ctrl+Shift+X', addNewTask: false };
  delete gc.takeABreak.motivationalImgs;
  gc.takeABreak.motivationalImg = 'https://example.org/img.png';
  delete gc.reminder;
  delete gc.evaluation;
  // project pre-v8: themeColor instead of theme, no noteIds / isEnableBacklog.
  r.project.__modelVersion = 6;
  const work = r.project.entities['proj-work'];
  delete work.theme;
  work.themeColor = 'indigo';
  delete r.project.entities['proj-old'].noteIds;
  delete r.project.entities['proj-old'].isEnableBacklog;
  delete r.project.entities['proj-old'].advancedCfg;
  // tag pre-v1: TODAY theme without backgroundImageDark.
  delete r.tag.__modelVersion;
  delete r.tag.entities['TODAY'].theme.backgroundImageDark;
  // task pre-v5: GIT issue type, missing notes, legacy fields.
  r.task.__modelVersion = 3;
  const gh = r.task.entities['t-gh'];
  gh.issueType = 'GIT';
  delete gh.notes;
  gh._isAdditionalInfoOpen = true;
  gh.issueData = { title: 'x' };
  delete r.task.entities['t-planned'].attachments;
  // repeat cfg pre-1.43: no order/quickSetting/repeatCycle/startDate.
  r.taskRepeatCfg.__modelVersion = 1.2;
  const rpt = r.taskRepeatCfg.entities['rpt-1'];
  delete rpt.order;
  delete rpt.quickSetting;
  delete rpt.repeatCycle;
  delete rpt.repeatEvery;
  rpt.isAddToBottom = true;
  // simple counter pre-2.1: totalCountOnDay, no streak fields.
  r.simpleCounter.__modelVersion = 1;
  const sc = r.simpleCounter.entities['COFFEE_COUNTER'];
  sc.totalCountOnDay = sc.countOnDay;
  delete sc.countOnDay;
  delete sc.isTrackStreaks;
  delete sc.streakMinValue;
  delete sc.streakWeekDays;
  // issue provider pre-1.1: CALENDAR key.
  r.issueProvider.__modelVersion = 1;
  r.issueProvider.ids.push('cal-1');
  r.issueProvider.entities['cal-1'] = {
    id: 'cal-1',
    issueProviderKey: 'CALENDAR',
    isEnabled: true,
    isAutoPoll: true,
    isAutoAddToBacklog: false,
    isIntegratedAddTaskBar: false,
    defaultProjectId: null,
    pinnedSearch: null,
    icalUrl: 'https://example.org/cal.ics',
    checkUpdatesEvery: 7200000,
    showBannerBeforeThreshold: 3600000,
  };
  // note without modified.
  delete r.note.entities['n-1'].modified;
  return r;
};

describe('LegacySupDbService → BackupService import (#7345 integration)', () => {
  let legacySupDb: LegacySupDbService;
  let backupService: BackupService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;

  beforeEach(async () => {
    await deleteSupDb();
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'saveImportBackup',
      'pruneImportBackups',
      'runDestructiveStateReplacement',
    ]);
    mockOpLogStore.saveImportBackup.and.resolveTo({ backupId: 'b', savedAt: 1 });
    mockOpLogStore.runDestructiveStateReplacement.and.resolveTo();
    const mockSnapshot = jasmine.createSpyObj('StateSnapshotService', [
      'getStateSnapshotAsync',
    ]);
    mockSnapshot.getStateSnapshotAsync.and.resolveTo({
      task: { ids: [] },
      project: { ids: [] },
    });
    const mockLock = jasmine.createSpyObj('LockService', ['request']);
    mockLock.request.and.callFake(async (_name: string, fn: () => Promise<void>) => fn());
    const mockFlush = jasmine.createSpyObj('OperationWriteFlushService', [
      'flushPendingWrites',
    ]);
    mockFlush.flushPendingWrites.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        BackupService,
        { provide: Store, useValue: mockStore },
        {
          provide: ImexViewService,
          useValue: jasmine.createSpyObj('ImexViewService', ['setDataImportInProgress']),
        },
        { provide: StateSnapshotService, useValue: mockSnapshot },
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: OperationWriteFlushService, useValue: mockFlush },
        { provide: LockService, useValue: mockLock },
        {
          provide: TaskTimeSyncService,
          useValue: jasmine.createSpyObj('TaskTimeSyncService', ['clear']),
        },
      ],
    });
    legacySupDb = TestBed.inject(LegacySupDbService);
    backupService = TestBed.inject(BackupService);
  });

  afterEach(async () => {
    await deleteSupDb();
  });

  /** Loads `SUP` and imports it the way StartupService does (JSON round trip). */
  const loadAndImport = async (): Promise<AppDataComplete> => {
    const legacyData = await legacySupDb.loadUnmigratedData();
    expect(legacyData).not.toBeNull();
    // Strict: the default isOwnStateRestore=false refuses state still invalid
    // after repair, so this fails where the startup offer would load broken state.
    await backupService.importCompleteBackup(
      JSON.parse(JSON.stringify(legacyData)),
      false,
      true,
      true,
    );
    expect(mockOpLogStore.runDestructiveStateReplacement).toHaveBeenCalledTimes(1);
    const action = mockStore.dispatch.calls.mostRecent().args[0] as unknown as ReturnType<
      typeof loadAllData
    >;
    expect(action.type).toBe(loadAllData.type);
    return action.appDataComplete as AppDataComplete;
  };

  it('imports a realistic v12.0.5 SUP_STORE without losing tasks or projects', async () => {
    await seedSupDb(structuredClone(legacySupV12Records));

    const imported = await loadAndImport();

    expect(validateFull(imported).isValid).toBe(true);
    const fx = legacySupV12Records;
    expect(imported.task.ids).toEqual(jasmine.arrayContaining(fx.task.ids));
    expect(imported.archiveYoung.task.ids).toEqual(
      jasmine.arrayContaining(fx.taskArchive.ids),
    );
    // Legacy `INBOX` becomes INBOX_PROJECT; every other project survives.
    expect(imported.project.ids).toEqual(
      jasmine.arrayContaining(['INBOX_PROJECT', 'proj-work', 'proj-old']),
    );
    expect(imported.project.entities['INBOX_PROJECT']!.taskIds).toContain('t-parent');
    expect(imported.task.entities['t-parent']!.projectId).toBe('INBOX_PROJECT');
    // Tag-only tasks get a project instead of being dropped.
    expect(imported.task.entities['t-tagonly']!.projectId).toBe('INBOX_PROJECT');
    expect(imported.tag.ids).toEqual(jasmine.arrayContaining(['tag-home']));
    expect(imported.task.entities['t-reminder']!.dueWithTime).toBe(1745000000000);
    expect(imported.task.entities['t-planned']!.dueDay).toBe('2099-01-05');
    expect(imported.task.entities['t-gh']!.issueProviderId).toBe('gh-prov-1');
    expect(imported.issueProvider.ids).toEqual(['gh-prov-1']);
    expect(imported.taskRepeatCfg.ids).toEqual(['rpt-1']);
    expect(imported.note.ids).toEqual(['n-1']);
    expect(imported.simpleCounter.ids).toEqual(['COFFEE_COUNTER']);
    expect(imported.timeTracking.project['proj-work']['2025-04-10']).toEqual(
      jasmine.objectContaining({ s: 1744268400000, e: 1744297200000 }),
    );
    expect(imported.globalConfig.sync.syncProvider).toBe(
      fx.globalConfig.sync.syncProvider as never,
    );
  });

  // v12 migrated each model in memory on load and only wrote a slice back when
  // it changed, so a slice untouched since an older model version is still on
  // disk in that shape. migrateLegacyBackup + repair must still accept it.
  it('imports v12 records last written by older model versions', async () => {
    const records = olderModelVersionRecords();
    await seedSupDb(records);

    const imported = await loadAndImport();

    expect(validateFull(imported).isValid).toBe(true);
    expect(imported.task.ids).toEqual(jasmine.arrayContaining(records.task.ids));
    expect(imported.archiveYoung.task.ids).toEqual(
      jasmine.arrayContaining(records.taskArchive.ids),
    );
    expect(imported.project.ids).toEqual(
      jasmine.arrayContaining(['INBOX_PROJECT', 'proj-work', 'proj-old']),
    );
    expect(imported.project.entities['proj-old']!.noteIds).toEqual([]);
    expect(imported.project.entities['proj-work']!.theme).toBeDefined();
    expect(imported.taskRepeatCfg.entities['rpt-1']!.order).toBe(1);
    expect(imported.note.entities['n-1']!.modified).toBe(1744000000000);
  });

  it('imports the v10 legacy fixture laid out as SUP_STORE records', async () => {
    await seedSupDb(v10BackupAsRecords());

    const imported = await loadAndImport();

    expect(imported.task.ids).toEqual(jasmine.arrayContaining(legacyV10Backup.task.ids));
    expect(imported.archiveYoung.task.ids).toEqual(
      jasmine.arrayContaining(legacyV10Backup.taskArchive.ids),
    );
    expect(imported.project.ids).toEqual(jasmine.arrayContaining(['proj-1']));
  });
});
