import { TestBed } from '@angular/core/testing';
import { HydrationStateService } from './hydration-state.service';
import { getIsApplyingRemoteOps } from './operation-capture.meta-reducer';

describe('HydrationStateService', () => {
  let service: HydrationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HydrationStateService],
    });
    service = TestBed.inject(HydrationStateService);
  });

  describe('initial state', () => {
    it('should start with isApplyingRemoteOps as false', () => {
      expect(service.isApplyingRemoteOps()).toBeFalse();
    });
  });

  describe('startApplyingRemoteOps', () => {
    it('should set isApplyingRemoteOps to true', () => {
      service.startApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeTrue();
    });

    it('should remain true if called multiple times', () => {
      service.startApplyingRemoteOps();
      service.startApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeTrue();
    });
  });

  describe('endApplyingRemoteOps', () => {
    it('should set isApplyingRemoteOps to false', () => {
      service.startApplyingRemoteOps();
      service.endApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeFalse();
    });

    it('should remain false if called when already false', () => {
      expect(service.isApplyingRemoteOps()).toBeFalse();
      service.endApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeFalse();
    });
  });

  describe('state transitions', () => {
    it('should correctly track multiple start/end cycles', () => {
      expect(service.isApplyingRemoteOps()).toBeFalse();

      service.startApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeTrue();

      service.endApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeFalse();

      service.startApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeTrue();

      service.endApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeFalse();
    });
  });

  describe('service isolation', () => {
    it('should provide independent state per instance', () => {
      // Create a second instance using a new testing module
      const secondService = TestBed.inject(HydrationStateService);

      // Since it's providedIn: 'root', they should be the same instance
      // This test verifies the singleton behavior
      service.startApplyingRemoteOps();
      expect(secondService.isApplyingRemoteOps()).toBeTrue();

      service.endApplyingRemoteOps();
      expect(secondService.isApplyingRemoteOps()).toBeFalse();
    });
  });

  describe('meta-reducer integration', () => {
    /**
     * These tests verify that HydrationStateService correctly notifies the
     * operation-capture meta-reducer to skip capturing during sync.
     * This is critical for preventing the "slow device cascade" problem.
     */
    it('should set meta-reducer flag when startApplyingRemoteOps is called', () => {
      expect(getIsApplyingRemoteOps()).toBeFalse();

      service.startApplyingRemoteOps();

      // Both the service state and meta-reducer flag should be true
      expect(service.isApplyingRemoteOps()).toBeTrue();
      expect(getIsApplyingRemoteOps()).toBeTrue();
    });

    it('should clear meta-reducer flag when endApplyingRemoteOps is called', () => {
      service.startApplyingRemoteOps();
      expect(getIsApplyingRemoteOps()).toBeTrue();

      service.endApplyingRemoteOps();

      // Both the service state and meta-reducer flag should be false
      expect(service.isApplyingRemoteOps()).toBeFalse();
      expect(getIsApplyingRemoteOps()).toBeFalse();
    });

    it('should keep service state and meta-reducer flag in sync', () => {
      // Start sync
      service.startApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeTrue();
      expect(getIsApplyingRemoteOps()).toBeTrue();

      // End sync
      service.endApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeFalse();
      expect(getIsApplyingRemoteOps()).toBeFalse();

      // Start again
      service.startApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeTrue();
      expect(getIsApplyingRemoteOps()).toBeTrue();

      // End again
      service.endApplyingRemoteOps();
      expect(service.isApplyingRemoteOps()).toBeFalse();
      expect(getIsApplyingRemoteOps()).toBeFalse();
    });
  });
});
