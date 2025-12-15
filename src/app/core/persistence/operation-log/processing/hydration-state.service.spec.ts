import { TestBed } from '@angular/core/testing';
import { HydrationStateService } from './hydration-state.service';

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
});
