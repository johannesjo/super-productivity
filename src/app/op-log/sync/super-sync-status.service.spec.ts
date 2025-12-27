import { TestBed } from '@angular/core/testing';
import { SuperSyncStatusService } from './super-sync-status.service';

describe('SuperSyncStatusService', () => {
  let service: SuperSyncStatusService;

  const createService = (): SuperSyncStatusService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SuperSyncStatusService],
    });
    return TestBed.inject(SuperSyncStatusService);
  };

  describe('isConfirmedInSync', () => {
    it('should return false initially (pending ops true, no remote check)', () => {
      service = createService();
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should return false when only markRemoteChecked is called (pending ops still true)', () => {
      service = createService();
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should return false when only pending ops is false (no remote check)', () => {
      service = createService();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should return true when no pending ops AND remote check completed', () => {
      service = createService();
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);
    });

    it('should return true regardless of order of calls', () => {
      service = createService();
      service.markRemoteChecked();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);
    });

    it('should return false when pending ops becomes true again', () => {
      service = createService();
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);

      service.updatePendingOpsStatus(true);
      expect(service.isConfirmedInSync()).toBe(false);
    });
  });

  describe('markRemoteChecked', () => {
    it('should set the remote check flag to true', () => {
      service = createService();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(false);

      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);
    });

    it('should be idempotent', () => {
      service = createService();
      service.updatePendingOpsStatus(false);
      service.markRemoteChecked();
      service.markRemoteChecked();
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(true);
    });
  });

  describe('clearScope', () => {
    it('should reset to default state', () => {
      service = createService();
      service.markRemoteChecked();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);

      service.clearScope();
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should require both conditions to be met again after clear', () => {
      service = createService();
      service.markRemoteChecked();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);

      service.clearScope();

      // Only one condition met
      service.markRemoteChecked();
      expect(service.isConfirmedInSync()).toBe(false);

      // Both conditions met
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);
    });
  });

  describe('updatePendingOpsStatus', () => {
    it('should update pending ops status to true', () => {
      service = createService();
      service.markRemoteChecked();
      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);

      service.updatePendingOpsStatus(true);
      expect(service.isConfirmedInSync()).toBe(false);
    });

    it('should update pending ops status to false', () => {
      service = createService();
      service.markRemoteChecked();
      service.updatePendingOpsStatus(true);
      expect(service.isConfirmedInSync()).toBe(false);

      service.updatePendingOpsStatus(false);
      expect(service.isConfirmedInSync()).toBe(true);
    });
  });
});
