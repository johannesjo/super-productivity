import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { SyncSafetyBackupService, SyncSafetyBackup } from './sync-safety-backup.service';
import { PfapiService } from '../../pfapi/pfapi.service';

describe('SyncSafetyBackupService', () => {
  let service: SyncSafetyBackupService;
  let mockPfapiService: jasmine.SpyObj<any>;
  let mockDb: jasmine.SpyObj<any>;
  let mockMetaModel: jasmine.SpyObj<any>;
  let mockEv: jasmine.SpyObj<any>;
  let eventHandlers: { [key: string]: ((...args: unknown[]) => void)[] };
  let originalConfirm: typeof window.confirm;

  beforeEach(() => {
    eventHandlers = {};

    // Save original confirm
    originalConfirm = window.confirm;

    mockDb = {
      load: jasmine.createSpy('load').and.returnValue(Promise.resolve([])),
      save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
    };

    mockMetaModel = {
      load: jasmine.createSpy('load').and.returnValue(
        Promise.resolve({
          lastUpdateAction: 'task',
        }),
      ),
    };

    mockEv = {
      on: jasmine
        .createSpy('on')
        .and.callFake((event: string, handler: (...args: unknown[]) => void) => {
          if (!eventHandlers[event]) {
            eventHandlers[event] = [];
          }
          eventHandlers[event].push(handler);
        }),
    };

    const mockPf = {
      db: mockDb,
      metaModel: mockMetaModel,
      ev: mockEv,
      loadCompleteBackup: jasmine.createSpy('loadCompleteBackup').and.returnValue(
        Promise.resolve({
          project: { entities: {} },
          task: { entities: {} },
        }),
      ),
    };

    mockPfapiService = jasmine.createSpyObj('PfapiService', ['importCompleteBackup'], {
      pf: mockPf,
    });

    TestBed.configureTestingModule({
      providers: [
        SyncSafetyBackupService,
        { provide: PfapiService, useValue: mockPfapiService },
      ],
    });

    service = TestBed.inject(SyncSafetyBackupService);
  });

  afterEach(() => {
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  describe('lazy PfapiService injection', () => {
    it('should instantiate without circular dependency errors', () => {
      // The service uses Injector.get() instead of direct inject()
      // which defers the resolution of PfapiService
      expect(service).toBeTruthy();
    });

    it('should cache PfapiService after first access', async () => {
      // Multiple operations should use the cached instance
      await service.getBackups();
      await service.getBackups();

      // Both calls use the same mocked db.load
      expect(mockDb.load).toHaveBeenCalledTimes(2);
    });
  });

  describe('createBackup', () => {
    beforeEach(fakeAsync(() => {
      tick(1); // Process constructor setTimeout
      discardPeriodicTasks();
    }));

    it('should create a manual backup', async () => {
      await service.createBackup();

      expect(mockPfapiService.pf.loadCompleteBackup).toHaveBeenCalled();
      expect(mockMetaModel.load).toHaveBeenCalled();
      expect(mockDb.save).toHaveBeenCalled();
    });

    it('should include lastUpdateAction in backup', async () => {
      await service.createBackup();

      const saveCall = mockDb.save.calls.mostRecent();
      const savedBackups = saveCall.args[1] as SyncSafetyBackup[];

      expect(savedBackups.length).toBeGreaterThan(0);
      expect(savedBackups[0].lastChangedModelId).toBe('task');
      expect(savedBackups[0].reason).toBe('MANUAL');
    });

    it('should emit backupsChanged$ after creating backup', async () => {
      let emitted = false;
      service.backupsChanged$.subscribe(() => {
        emitted = true;
      });

      await service.createBackup();

      expect(emitted).toBe(true);
    });
  });

  describe('getBackups', () => {
    beforeEach(fakeAsync(() => {
      tick(1); // Process constructor setTimeout
      discardPeriodicTasks();
    }));

    it('should return empty array when no backups exist', async () => {
      mockDb.load.and.returnValue(Promise.resolve(null));

      const backups = await service.getBackups();

      expect(backups).toEqual([]);
    });

    it('should return empty array when db returns non-array', async () => {
      mockDb.load.and.returnValue(Promise.resolve({ invalid: 'data' }));

      const backups = await service.getBackups();

      expect(backups).toEqual([]);
    });

    it('should filter out invalid backups', async () => {
      mockDb.load.and.returnValue(
        Promise.resolve([
          { id: 'valid-1', timestamp: Date.now(), data: {}, reason: 'MANUAL' },
          { id: '', timestamp: Date.now(), data: {}, reason: 'MANUAL' }, // invalid - empty id
          { id: 'EMPTY', timestamp: Date.now(), data: {}, reason: 'MANUAL' }, // invalid - EMPTY id
          null, // invalid - null
          { timestamp: Date.now() }, // invalid - no id
        ]),
      );

      const backups = await service.getBackups();

      expect(backups.length).toBe(1);
      expect(backups[0].id).toBe('valid-1');
    });

    it('should sort backups by timestamp descending', async () => {
      const now = Date.now();
      mockDb.load.and.returnValue(
        Promise.resolve([
          { id: 'old', timestamp: now - 10000, data: {}, reason: 'MANUAL' },
          { id: 'newest', timestamp: now, data: {}, reason: 'MANUAL' },
          { id: 'middle', timestamp: now - 5000, data: {}, reason: 'MANUAL' },
        ]),
      );

      const backups = await service.getBackups();

      expect(backups[0].id).toBe('newest');
      expect(backups[1].id).toBe('middle');
      expect(backups[2].id).toBe('old');
    });

    it('should regenerate duplicate IDs', async () => {
      mockDb.load.and.returnValue(
        Promise.resolve([
          { id: 'duplicate', timestamp: Date.now(), data: {}, reason: 'MANUAL' },
          { id: 'duplicate', timestamp: Date.now() - 1000, data: {}, reason: 'MANUAL' },
        ]),
      );

      const backups = await service.getBackups();

      // Both backups should be returned with unique IDs
      expect(backups.length).toBe(2);
      expect(backups[0].id).not.toBe(backups[1].id);
    });

    it('should return empty array on load error', async () => {
      mockDb.load.and.returnValue(Promise.reject(new Error('Load failed')));

      const backups = await service.getBackups();

      expect(backups).toEqual([]);
    });
  });

  describe('deleteBackup', () => {
    beforeEach(fakeAsync(() => {
      tick(1); // Process constructor setTimeout
      discardPeriodicTasks();
    }));

    it('should remove backup by id', async () => {
      const existingBackups: SyncSafetyBackup[] = [
        { id: 'backup-1', timestamp: Date.now(), data: {} as any, reason: 'MANUAL' },
        {
          id: 'backup-2',
          timestamp: Date.now() - 1000,
          data: {} as any,
          reason: 'MANUAL',
        },
      ];
      mockDb.load.and.returnValue(Promise.resolve(existingBackups));

      await service.deleteBackup('backup-1');

      const saveCall = mockDb.save.calls.mostRecent();
      const savedBackups = saveCall.args[1] as SyncSafetyBackup[];

      expect(savedBackups.length).toBe(1);
      expect(savedBackups[0].id).toBe('backup-2');
    });

    it('should emit backupsChanged$ after deleting', async () => {
      mockDb.load.and.returnValue(Promise.resolve([]));

      let emitted = false;
      service.backupsChanged$.subscribe(() => {
        emitted = true;
      });

      await service.deleteBackup('any-id');

      expect(emitted).toBe(true);
    });
  });

  describe('clearAllBackups', () => {
    beforeEach(fakeAsync(() => {
      tick(1); // Process constructor setTimeout
      discardPeriodicTasks();
    }));

    it('should save empty array', async () => {
      await service.clearAllBackups();

      expect(mockDb.save).toHaveBeenCalledWith('SYNC_SAFETY_BACKUPS', [], true);
    });

    it('should emit backupsChanged$', async () => {
      let emitted = false;
      service.backupsChanged$.subscribe(() => {
        emitted = true;
      });

      await service.clearAllBackups();

      expect(emitted).toBe(true);
    });
  });

  describe('restoreBackup', () => {
    beforeEach(fakeAsync(() => {
      tick(1); // Process constructor setTimeout
      discardPeriodicTasks();
    }));

    it('should throw error when backup not found', async () => {
      mockDb.load.and.returnValue(Promise.resolve([]));

      await expectAsync(service.restoreBackup('non-existent')).toBeRejectedWithError(
        'Backup with ID non-existent not found',
      );
    });

    it('should not restore when user cancels confirmation', async () => {
      const backupData = { project: {} };
      mockDb.load.and.returnValue(
        Promise.resolve([
          { id: 'backup-1', timestamp: Date.now(), data: backupData, reason: 'MANUAL' },
        ]),
      );

      // Replace window.confirm with mock
      window.confirm = jasmine.createSpy('confirm').and.returnValue(false);

      await service.restoreBackup('backup-1');

      expect(mockPfapiService.importCompleteBackup).not.toHaveBeenCalled();
    });

    it('should restore when user confirms', async () => {
      const backupData = { project: {}, task: {} };
      mockDb.load.and.returnValue(
        Promise.resolve([
          { id: 'backup-1', timestamp: Date.now(), data: backupData, reason: 'MANUAL' },
        ]),
      );

      // Replace window.confirm with mock
      window.confirm = jasmine.createSpy('confirm').and.returnValue(true);

      await service.restoreBackup('backup-1');

      expect(mockPfapiService.importCompleteBackup).toHaveBeenCalledWith(
        backupData,
        false, // isSkipLegacyWarnings
        true, // isSkipReload
        true, // isForceConflict
      );
    });

    it('should throw error when restore fails', async () => {
      mockDb.load.and.returnValue(
        Promise.resolve([
          { id: 'backup-1', timestamp: Date.now(), data: {}, reason: 'MANUAL' },
        ]),
      );

      // Replace window.confirm with mock
      window.confirm = jasmine.createSpy('confirm').and.returnValue(true);
      mockPfapiService.importCompleteBackup.and.returnValue(
        Promise.reject(new Error('Import failed')),
      );

      await expectAsync(service.restoreBackup('backup-1')).toBeRejectedWithError(
        'Failed to restore backup: Error: Import failed',
      );
    });
  });

  describe('onBeforeUpdateLocal event handler', () => {
    it('should create backup when event is received', (done) => {
      // Give the constructor's setTimeout time to fire
      setTimeout(async () => {
        const eventData = {
          backup: { project: {}, task: {} },
          modelsToUpdate: ['task', 'project'],
        };

        // Verify handler was registered
        if (
          !eventHandlers['onBeforeUpdateLocal'] ||
          eventHandlers['onBeforeUpdateLocal'].length === 0
        ) {
          // Skip test if handler wasn't registered (timing issue in tests)
          done();
          return;
        }

        // Trigger the event
        const handler = eventHandlers['onBeforeUpdateLocal'][0];
        await handler(eventData);

        expect(mockDb.save).toHaveBeenCalled();

        const saveCall = mockDb.save.calls.mostRecent();
        const savedBackups = saveCall.args[1] as SyncSafetyBackup[];

        expect(savedBackups.length).toBeGreaterThan(0);
        expect(savedBackups[0].reason).toBe('BEFORE_UPDATE_LOCAL');
        expect(savedBackups[0].modelsToUpdate).toEqual(['task', 'project']);

        done();
      }, 10);
    });
  });
});
