import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { SuperSyncStatusService } from './super-sync-status.service';

describe('SuperSyncStatusService', () => {
  let service: SuperSyncStatusService;
  const STORAGE_KEY_PREFIX = 'super_sync_last_remote_check_';
  const TEST_SCOPE = 'test-scope-123';
  const STORAGE_KEY = `${STORAGE_KEY_PREFIX}${TEST_SCOPE}`;
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

  describe('setScope', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should set the scope and load existing timestamp', () => {
      // Set a recent timestamp before setting scope
      const recentTimestamp = Date.now() - 10_000;
      localStorage.setItem(STORAGE_KEY, String(recentTimestamp));

      service.setScope(TEST_SCOPE);
      expect(service.isRemoteCheckFresh()).toBe(true);
    });

    it('should return false for fresh check when scope has no stored timestamp', () => {
      service.setScope(TEST_SCOPE);
      expect(service.isRemoteCheckFresh()).toBe(false);
    });

    it('should switch to new scope when called with different scopeId', () => {
      const scope1 = 'scope-1';
      const scope2 = 'scope-2';

      // Set timestamp for scope1
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${scope1}`, String(Date.now()));

      service.setScope(scope1);
      expect(service.isRemoteCheckFresh()).toBe(true);

      // Switch to scope2 which has no timestamp
      service.setScope(scope2);
      expect(service.isRemoteCheckFresh()).toBe(false);
    });

    it('should not reload if same scope is set again', () => {
      service.setScope(TEST_SCOPE);
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);

      // Clear localStorage to simulate external change
      localStorage.removeItem(STORAGE_KEY);

      // Setting same scope should not reload (should still be fresh from memory)
      service.setScope(TEST_SCOPE);
      expect(service.isRemoteCheckFresh()).toBe(true);
    });
  });

  describe('clearScope', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should reset to default state', () => {
      service.setScope(TEST_SCOPE);
      service.markRemoteChecked();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);

      service.clearScope();
      expect(service.isRemoteCheckFresh()).toBe(false);
      expect(service.isConfirmedInSync()).toBe(false);
    });
  });

  describe('markRemoteChecked', () => {
    beforeEach(() => {
      service = createService();
      service.setScope(TEST_SCOPE);
    });

    it('should store timestamp in localStorage with scope', () => {
      const before = Date.now();
      service.markRemoteChecked();
      const after = Date.now();

      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      expect(stored).toBeGreaterThanOrEqual(before);
      expect(stored).toBeLessThanOrEqual(after);
    });

    it('should not store timestamp if no scope is set', () => {
      // Create service without setting scope
      const noScopeService = createService();
      noScopeService.markRemoteChecked();

      // No key should be set
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should update isRemoteCheckFresh to true', () => {
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);
    });
  });

  describe('updatePendingOpsStatus', () => {
    beforeEach(() => {
      service = createService();
      service.setScope(TEST_SCOPE);
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
    it('should return false when no scope is set', () => {
      service = createService();
      expect(service.isRemoteCheckFresh()).toBe(false);
    });

    it('should return false when no remote check has been made', () => {
      service = createService();
      service.setScope(TEST_SCOPE);
      expect(service.isRemoteCheckFresh()).toBe(false);
    });

    it('should return true immediately after markRemoteChecked', () => {
      service = createService();
      service.setScope(TEST_SCOPE);
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);
    });

    it('should return false after freshness threshold expires', fakeAsync(() => {
      service = createService();
      service.setScope(TEST_SCOPE);
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);

      // Advance time past the freshness threshold
      // The service updates _now every second via interval
      tick(FRESHNESS_MS + 2000);

      expect(service.isRemoteCheckFresh()).toBe(false);
      discardPeriodicTasks();
    }));

    it('should load recent timestamp from localStorage on setScope', () => {
      // Set a recent timestamp before setting scope
      const recentTimestamp = Date.now() - 10_000; // 10 seconds ago
      localStorage.setItem(STORAGE_KEY, String(recentTimestamp));

      // Create a new service instance and set scope
      service = createService();
      service.setScope(TEST_SCOPE);
      expect(service.isRemoteCheckFresh()).toBe(true);
    });

    it('should return false for old timestamp loaded from localStorage', () => {
      // Set an old timestamp before setting scope
      const oldTimestamp = Date.now() - FRESHNESS_MS - 10_000; // More than 1 minute ago
      localStorage.setItem(STORAGE_KEY, String(oldTimestamp));

      // Create a new service instance and set scope
      service = createService();
      service.setScope(TEST_SCOPE);
      expect(service.isRemoteCheckFresh()).toBe(false);
    });
  });

  describe('isConfirmedInSync', () => {
    it('should return false when there are pending ops', () => {
      service = createService();
      service.setScope(TEST_SCOPE);
      service.markRemoteChecked();
      service.updatePendingOpsStatus(true);
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should return false when remote check is stale', fakeAsync(() => {
      service = createService();
      service.setScope(TEST_SCOPE);
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
      service.setScope(TEST_SCOPE);
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);
    });

    it('should return false by default (pending ops true, no remote check)', () => {
      service = createService();
      service.setScope(TEST_SCOPE);
      expect(service.isConfirmedInSync()).toBe(false);
    });
  });

  describe('scope isolation', () => {
    it('should keep separate timestamps for different scopes', () => {
      const scope1 = 'server-a-user-1';
      const scope2 = 'server-b-user-2';

      service = createService();

      // Set scope1 and mark remote checked
      service.setScope(scope1);
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);

      // Switch to scope2 - should have no timestamp
      service.setScope(scope2);
      expect(service.isRemoteCheckFresh()).toBe(false);

      // Mark scope2 as checked
      service.markRemoteChecked();
      expect(service.isRemoteCheckFresh()).toBe(true);

      // Switch back to scope1 - should still have its timestamp
      service.setScope(scope1);
      expect(service.isRemoteCheckFresh()).toBe(true);
    });
  });
});
