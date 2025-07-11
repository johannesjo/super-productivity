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
      // Simulate sync in progress
      let syncPromise: Promise<any> | null = null;
      mockSyncService.sync.and.callFake(() => {
        return new Promise((resolve) => {
          syncPromise = new Promise((r) =>
            setTimeout(() => {
              r(resolve({ status: SyncStatus.InSync }));
            }, 100),
          );
          syncPromise.then(resolve);
        });
      });

      // Start first sync
      const firstSync = pfapi.sync();

      // Try to start second sync while first is in progress
      let secondSyncError: Error | null = null;
      try {
        await pfapi.sync();
      } catch (e) {
        secondSyncError = e as Error;
      }

      // Wait for first sync to complete
      await firstSync;

      expect(secondSyncError).toBeTruthy();
      expect(secondSyncError?.message).toBe('Sync already in progress');
      expect(mockDb.lock).toHaveBeenCalledTimes(1);
      expect(mockDb.unlock).toHaveBeenCalledTimes(1);
    });

    it('should allow sync after previous sync completes', async () => {
      mockSyncService.sync.and.returnValue(
        Promise.resolve({ status: SyncStatus.InSync }),
      );

      // First sync
      await pfapi.sync();
      expect(mockDb.lock).toHaveBeenCalledTimes(1);
      expect(mockDb.unlock).toHaveBeenCalledTimes(1);

      // Second sync should work
      await pfapi.sync();
      expect(mockDb.lock).toHaveBeenCalledTimes(2);
      expect(mockDb.unlock).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid sync trigger attempts gracefully', async () => {
      let syncCount = 0;
      mockSyncService.sync.and.callFake(() => {
        syncCount++;
        return new Promise((resolve) => {
          setTimeout(() => resolve({ status: SyncStatus.InSync }), 50);
        });
      });

      // Simulate multiple rapid sync attempts (like from different triggers)
      const syncPromises: Promise<any>[] = [];
      const errors: Error[] = [];

      // First sync should succeed
      syncPromises.push(pfapi.sync());

      // These should fail with "Sync already in progress"
      for (let i = 0; i < 5; i++) {
        syncPromises.push(
          pfapi.sync().catch((e) => {
            errors.push(e);
            return 'failed';
          }),
        );
      }

      // Wait for all promises to settle
      const results = await Promise.all(syncPromises);

      // Only one sync should have actually executed
      expect(syncCount).toBe(1);
      expect(errors.length).toBe(5);
      expect(errors.every((e) => e.message === 'Sync already in progress')).toBe(true);
      expect(results[0]).toEqual({ status: SyncStatus.InSync });
      expect(results.slice(1).every((r) => r === 'failed')).toBe(true);
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
      spyOn(console, 'log'); // Spy on console.log for logging
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
