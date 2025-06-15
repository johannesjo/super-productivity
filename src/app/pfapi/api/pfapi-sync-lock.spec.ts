import { Pfapi } from './pfapi';
import { Database } from './db/database';
import { SyncStatus } from './pfapi.const';

describe('Pfapi Sync Lock', () => {
  let pfapi: any;
  let mockDb: jasmine.SpyObj<Database>;
  let mockSyncService: jasmine.SpyObj<any>;
  // let mockReducer: jasmine.Spy;

  beforeEach(() => {
    // Create mock database
    mockDb = jasmine.createSpyObj('Database', ['lock', 'unlock', 'save']);

    // Create mock sync service
    mockSyncService = jasmine.createSpyObj('SyncService', [
      'sync',
      'downloadAll',
      'uploadAll',
    ]);

    // Create a minimal Pfapi instance for testing
    pfapi = {
      db: mockDb,
      ev: {
        emit: jasmine.createSpy('emit'),
      },
      _syncService: mockSyncService,
      _wrapSyncAction: Pfapi.prototype['_wrapSyncAction'],
      sync: Pfapi.prototype.sync,
      downloadAll: Pfapi.prototype.downloadAll,
      uploadAll: Pfapi.prototype.uploadAll,
    };

    // Bind the methods to the instance
    pfapi._wrapSyncAction = pfapi._wrapSyncAction.bind(pfapi);
    pfapi.sync = pfapi.sync.bind(pfapi);
    pfapi.downloadAll = pfapi.downloadAll.bind(pfapi);
    pfapi.uploadAll = pfapi.uploadAll.bind(pfapi);
  });

  describe('_wrapSyncAction', () => {
    it('should lock database before sync and unlock after success', async () => {
      mockSyncService.sync.and.returnValue(
        Promise.resolve({ status: SyncStatus.InSync }),
      );

      await pfapi.sync();

      expect(mockDb.lock).toHaveBeenCalledBefore(mockSyncService.sync);
      expect(mockDb.unlock).toHaveBeenCalled();
      expect(pfapi.ev.emit).toHaveBeenCalledWith('syncStatusChange', 'SYNCING');
      expect(pfapi.ev.emit).toHaveBeenCalledWith('syncStatusChange', 'IN_SYNC');
    });

    it('should unlock database even when sync fails', async () => {
      const error = new Error('Sync failed');
      mockSyncService.sync.and.returnValue(Promise.reject(error));

      try {
        await pfapi.sync();
        fail('Should have thrown error');
      } catch (e) {
        expect(e).toBe(error);
      }

      expect(mockDb.lock).toHaveBeenCalled();
      expect(mockDb.unlock).toHaveBeenCalled();
      expect(pfapi.ev.emit).toHaveBeenCalledWith('syncStatusChange', 'ERROR');
      expect(pfapi.ev.emit).toHaveBeenCalledWith('syncError', error);
    });

    it('should emit correct sync status events in order', async () => {
      mockSyncService.downloadAll.and.returnValue(Promise.resolve());

      await pfapi.downloadAll();

      const emitCalls = pfapi.ev.emit.calls.allArgs();
      expect(emitCalls[0]).toEqual(['syncStatusChange', 'SYNCING']);
      expect(emitCalls[1]).toEqual(['syncDone', undefined]);
      expect(emitCalls[2]).toEqual(['syncStatusChange', 'IN_SYNC']);
    });

    it('should lock database during uploadAll', async () => {
      mockSyncService.uploadAll.and.returnValue(Promise.resolve());

      await pfapi.uploadAll(true);

      expect(mockDb.lock).toHaveBeenCalledBefore(mockSyncService.uploadAll);
      expect(mockSyncService.uploadAll).toHaveBeenCalledWith(true);
      expect(mockDb.unlock).toHaveBeenCalled();
    });

    it('should prevent concurrent sync operations via lock', async () => {
      // Simulate a locked database
      let isLocked = false;
      mockDb.lock.and.callFake(() => {
        if (isLocked) {
          throw new Error('Database is already locked');
        }
        isLocked = true;
      });
      mockDb.unlock.and.callFake(() => {
        isLocked = false;
      });

      mockSyncService.sync.and.returnValue(
        new Promise((resolve) =>
          setTimeout(() => resolve({ status: SyncStatus.InSync }), 100),
        ),
      );

      // Start first sync
      const sync1Promise = pfapi.sync();

      // Try to start second sync immediately
      try {
        await pfapi.sync();
        fail('Second sync should have failed due to lock');
      } catch (e: any) {
        expect(e.message).toBe('Database is already locked');
      }

      // Wait for first sync to complete
      await sync1Promise;

      // Now second sync should work
      await pfapi.sync();
      expect(mockSyncService.sync).toHaveBeenCalledTimes(2);
    });

    it('should handle sync returning different statuses', async () => {
      const conflictData = { local: { lastUpdate: 1 }, remote: { lastUpdate: 2 } };
      mockSyncService.sync.and.returnValue(
        Promise.resolve({
          status: SyncStatus.Conflict,
          conflictData,
        }),
      );

      const result = await pfapi.sync();

      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData).toBe(conflictData);
      expect(mockDb.lock).toHaveBeenCalled();
      expect(mockDb.unlock).toHaveBeenCalled();
      expect(pfapi.ev.emit).toHaveBeenCalledWith('syncStatusChange', 'IN_SYNC');
    });

    it('should pass through the correct log prefix', async () => {
      spyOn(console, 'log'); // Spy on console.log if pfLog uses it
      mockSyncService.sync.and.returnValue(
        Promise.resolve({ status: SyncStatus.InSync }),
      );
      mockSyncService.downloadAll.and.returnValue(Promise.resolve());
      mockSyncService.uploadAll.and.returnValue(Promise.resolve());

      await pfapi.sync();
      await pfapi.downloadAll(true);
      await pfapi.uploadAll(false);

      // Verify each method was called with correct parameters
      expect(mockSyncService.sync).toHaveBeenCalled();
      expect(mockSyncService.downloadAll).toHaveBeenCalledWith(true);
      expect(mockSyncService.uploadAll).toHaveBeenCalledWith(false);
    });
  });

  describe('Database lock behavior during sync', () => {
    it('should block save operations while sync is in progress', async () => {
      let syncResolve: any;
      const syncPromise = new Promise((resolve) => {
        syncResolve = resolve;
      });
      mockSyncService.sync.and.returnValue(syncPromise);

      // Start sync (which locks the database)
      const syncOperation = pfapi.sync();

      // Database should be locked
      expect(mockDb.lock).toHaveBeenCalled();

      // Complete the sync
      syncResolve({ status: SyncStatus.InSync });
      await syncOperation;

      // Database should be unlocked
      expect(mockDb.unlock).toHaveBeenCalled();
    });

    it('should maintain lock until after status change event', async () => {
      const emitOrder: string[] = [];

      pfapi.ev.emit.and.callFake((event: string) => {
        emitOrder.push(event);
        if (
          event === 'syncStatusChange' &&
          emitOrder[emitOrder.length - 1] === 'syncStatusChange'
        ) {
          // This is the IN_SYNC status change
          expect(mockDb.unlock).not.toHaveBeenCalled();
        }
      });

      mockSyncService.sync.and.returnValue(
        Promise.resolve({ status: SyncStatus.InSync }),
      );

      await pfapi.sync();

      expect(mockDb.unlock).toHaveBeenCalled();
      expect(emitOrder).toContain('syncStatusChange');
    });
  });
});
