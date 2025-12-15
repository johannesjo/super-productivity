import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { SuperSyncStatusService } from './super-sync-status.service';

describe('SuperSyncStatusService', () => {
  let service: SuperSyncStatusService;
  const STORAGE_KEY = 'super_sync_last_remote_check';
  const FRESHNESS_MS = 60_000;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createService = (): SuperSyncStatusService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SuperSyncStatusService],
    });
    return TestBed.inject(SuperSyncStatusService);
  };

  describe('markRemoteChecked', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should store timestamp in localStorage', () => {
      const before = Date.now();
      service.markRemoteChecked();
      const after = Date.now();

      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      expect(stored).toBeGreaterThanOrEqual(before);
      expect(stored).toBeLessThanOrEqual(after);
    });

    it('should update isRemoteCheckFresh to true', () => {
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);
    });
  });

  describe('updatePendingOpsStatus', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should update pending ops status to true', () => {
      service.updatePendingOpsStatus(true);
      // With pending ops, isConfirmedInSync should be false
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should update pending ops status to false', () => {
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);
    });
  });

  describe('isRemoteCheckFresh', () => {
    it('should return false when no remote check has been made', () => {
      service = createService();
      expect(service.isRemoteCheckFresh()).toBe(false);
    });

    it('should return true immediately after markRemoteChecked', () => {
      service = createService();
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);
    });

    it('should return false after freshness threshold expires', fakeAsync(() => {
      service = createService();
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);

      // Advance time past the freshness threshold
      // The service updates _now every second via interval
      tick(FRESHNESS_MS + 2000);

      expect(service.isRemoteCheckFresh()).toBe(false);
      discardPeriodicTasks();
    }));

    it('should load recent timestamp from localStorage on init', () => {
      // Set a recent timestamp before creating the service
      const recentTimestamp = Date.now() - 10_000; // 10 seconds ago
      localStorage.setItem(STORAGE_KEY, String(recentTimestamp));

      // Create a new service instance
      service = createService();
      expect(service.isRemoteCheckFresh()).toBe(true);
    });

    it('should return false for old timestamp loaded from localStorage', () => {
      // Set an old timestamp before creating the service
      const oldTimestamp = Date.now() - FRESHNESS_MS - 10_000; // More than 1 minute ago
      localStorage.setItem(STORAGE_KEY, String(oldTimestamp));

      // Create a new service instance
      service = createService();
      expect(service.isRemoteCheckFresh()).toBe(false);
    });
  });

  describe('isConfirmedInSync', () => {
    it('should return false when there are pending ops', () => {
      service = createService();
      service.markRemoteChecked();
      service.updatePendingOpsStatus(true);
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should return false when remote check is stale', fakeAsync(() => {
      service = createService();
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);

      // Advance time past the freshness threshold
      tick(FRESHNESS_MS + 2000);

      expect(service.isConfirmedInSync()).toBe(false);
      discardPeriodicTasks();
    }));

    it('should return true when no pending ops and remote check is fresh', () => {
      service = createService();
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);
    });

    it('should return false by default (pending ops true, no remote check)', () => {
      service = createService();
      expect(service.isConfirmedInSync()).toBe(false);
    });
  });
});
