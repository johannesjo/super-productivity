import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ImmediateUploadService } from './immediate-upload.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogSyncService } from './operation-log-sync.service';
import { Operation, OpType } from '../operation.types';

describe('ImmediateUploadService', () => {
  let service: ImmediateUploadService;
  let mockPfapiService: any;
  let mockUploadService: jasmine.SpyObj<OperationLogUploadService>;
  let mockSyncService: jasmine.SpyObj<OperationLogSyncService>;
  let syncStatusEmitSpy: jasmine.Spy;

  const createMockOp = (id: string): Operation => ({
    id,
    clientId: 'clientA',
    actionType: '[Task] Add',
    opType: OpType.Create,
    entityType: 'TASK',
    entityId: `task-${id}`,
    payload: {},
    vectorClock: { clientA: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
  });

  beforeEach(() => {
    syncStatusEmitSpy = jasmine.createSpy('emit');
    mockPfapiService = {
      pf: {
        isSyncInProgress: false,
        getActiveSyncProvider: jasmine
          .createSpy('getActiveSyncProvider')
          .and.returnValue({
            id: 'SuperProductivitySync',
            supportsOperationSync: true, // Required for isOperationSyncCapable check
            uploadOperations: jasmine.createSpy('uploadOperations'),
            isReady: jasmine.createSpy('isReady').and.returnValue(Promise.resolve(true)),
          }),
        ev: {
          emit: syncStatusEmitSpy,
        },
      },
    };

    mockUploadService = jasmine.createSpyObj('OperationLogUploadService', [
      'uploadPendingOps',
    ]);
    mockSyncService = jasmine.createSpyObj('OperationLogSyncService', [
      'isWhollyFreshClient',
      'processRemoteOps',
    ]);

    // Default mock implementations
    mockSyncService.isWhollyFreshClient.and.returnValue(Promise.resolve(false));
    mockSyncService.processRemoteOps.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        ImmediateUploadService,
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: OperationLogUploadService, useValue: mockUploadService },
        { provide: OperationLogSyncService, useValue: mockSyncService },
      ],
    });

    service = TestBed.inject(ImmediateUploadService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe('checkmark (IN_SYNC) behavior', () => {
    it('should show checkmark when upload succeeds and no piggybacked ops', fakeAsync(() => {
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 3,
          rejectedCount: 0,
          piggybackedOps: [], // No remote ops = confirmed in sync
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150); // Debounce (100ms) + processing

      expect(syncStatusEmitSpy).toHaveBeenCalledWith('syncStatusChange', 'IN_SYNC');
    }));

    it('should NOT show checkmark when piggybacked ops exist', fakeAsync(() => {
      const piggybackedOp = createMockOp('piggybacked-1');
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 2,
          rejectedCount: 0,
          piggybackedOps: [piggybackedOp], // Remote ops exist = may not be fully in sync
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150);

      // Should process piggybacked ops
      expect(mockSyncService.processRemoteOps).toHaveBeenCalledWith([piggybackedOp]);
      // But should NOT show checkmark
      expect(syncStatusEmitSpy).not.toHaveBeenCalled();
    }));

    it('should NOT show checkmark when nothing was uploaded', fakeAsync(() => {
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 0, // Nothing uploaded
          rejectedCount: 0,
          piggybackedOps: [],
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150);

      expect(syncStatusEmitSpy).not.toHaveBeenCalled();
    }));

    it('should NOT show checkmark when upload fails', async () => {
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      service.initialize();
      service.trigger();

      // Wait for debounce + processing
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Silent failure - no checkmark, no error state
      expect(syncStatusEmitSpy).not.toHaveBeenCalled();
    });

    it('should process multiple piggybacked ops without showing checkmark', fakeAsync(() => {
      const piggybackedOps = [
        createMockOp('piggybacked-1'),
        createMockOp('piggybacked-2'),
        createMockOp('piggybacked-3'),
      ];
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 5,
          rejectedCount: 0,
          piggybackedOps,
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150);

      expect(mockSyncService.processRemoteOps).toHaveBeenCalledWith(piggybackedOps);
      expect(syncStatusEmitSpy).not.toHaveBeenCalled();
    }));
  });

  describe('guards', () => {
    it('should skip upload when sync is in progress', fakeAsync(() => {
      mockPfapiService.pf.isSyncInProgress = true;
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 1,
          rejectedCount: 0,
          piggybackedOps: [],
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150);

      expect(mockUploadService.uploadPendingOps).not.toHaveBeenCalled();
    }));

    it('should skip upload for fresh clients', fakeAsync(() => {
      mockSyncService.isWhollyFreshClient.and.returnValue(Promise.resolve(true));
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 1,
          rejectedCount: 0,
          piggybackedOps: [],
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150);

      expect(mockUploadService.uploadPendingOps).not.toHaveBeenCalled();
    }));

    it('should skip upload when provider is not ready', fakeAsync(() => {
      mockPfapiService.pf
        .getActiveSyncProvider()
        .isReady.and.returnValue(Promise.resolve(false));
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 1,
          rejectedCount: 0,
          piggybackedOps: [],
          rejectedOps: [],
        }),
      );

      service.initialize();
      service.trigger();
      tick(150);

      expect(mockUploadService.uploadPendingOps).not.toHaveBeenCalled();
    }));
  });

  describe('debouncing', () => {
    it('should debounce rapid triggers into single upload', fakeAsync(() => {
      mockUploadService.uploadPendingOps.and.returnValue(
        Promise.resolve({
          uploadedCount: 1,
          rejectedCount: 0,
          piggybackedOps: [],
          rejectedOps: [],
        }),
      );

      service.initialize();

      // Rapid triggers
      service.trigger();
      service.trigger();
      service.trigger();
      service.trigger();
      service.trigger();

      tick(150);

      // Should only upload once despite 5 triggers
      expect(mockUploadService.uploadPendingOps).toHaveBeenCalledTimes(1);
    }));
  });
});
