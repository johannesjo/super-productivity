import { TestBed } from '@angular/core/testing';
import { OperationLogMigrationService } from './operation-log-migration.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { PersistenceLocalService } from '../../persistence-local.service';
import { OpLog } from '../../../log';

describe('OperationLogMigrationService', () => {
  let service: OperationLogMigrationService;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockPfapiService: any;
  let mockPersistenceLocalService: jasmine.SpyObj<PersistenceLocalService>;

  beforeEach(() => {
    // Mock OperationLogStoreService
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'getLastSeq',
      'append',
      'saveStateCache',
    ]);

    // Mock PfapiService with deep structure
    mockPfapiService = {
      pf: {
        getAllSyncModelData: jasmine.createSpy('getAllSyncModelData'),
        metaModel: {
          loadClientId: jasmine.createSpy('loadClientId'),
        },
      },
    };

    // Mock PersistenceLocalService
    mockPersistenceLocalService = jasmine.createSpyObj('PersistenceLocalService', [
      'save',
    ]);

    // Spy on OpLog
    spyOn(OpLog, 'normal');
    spyOn(OpLog, 'error');
    TestBed.configureTestingModule({
      providers: [
        OperationLogMigrationService,
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: PersistenceLocalService, useValue: mockPersistenceLocalService },
      ],
    });
    service = TestBed.inject(OperationLogMigrationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkAndMigrate', () => {
    it('should do nothing if lastSeq > 0 (already migrated)', async () => {
      mockOpLogStore.getLastSeq.and.resolveTo(10);

      await service.checkAndMigrate();

      expect(mockOpLogStore.getLastSeq).toHaveBeenCalled();
      expect(mockPfapiService.pf.getAllSyncModelData).not.toHaveBeenCalled();
    });

    it('should do nothing if no legacy user data is found', async () => {
      mockOpLogStore.getLastSeq.and.resolveTo(0);
      // Return data with no user data (empty ids arrays or missing models)
      mockPfapiService.pf.getAllSyncModelData.and.resolveTo({
        globalConfig: { some: 'config' }, // config model, ignored
        task: { ids: [] }, // empty user model
        project: undefined,
      });

      await service.checkAndMigrate();

      expect(mockOpLogStore.getLastSeq).toHaveBeenCalled();
      expect(mockPfapiService.pf.getAllSyncModelData).toHaveBeenCalled();
      expect(mockPfapiService.pf.metaModel.loadClientId).not.toHaveBeenCalled();
      expect(mockOpLogStore.append).not.toHaveBeenCalled();
    });

    it('should migrate legacy data if found', async () => {
      mockOpLogStore.getLastSeq.and.resolveTo(0);
      const legacyData = {
        task: { ids: ['t1'] },
        project: { ids: ['p1'] },
        globalConfig: { some: 'config' },
      };
      mockPfapiService.pf.getAllSyncModelData.and.resolveTo(legacyData);
      const clientId = 'test-client-id';
      mockPfapiService.pf.metaModel.loadClientId.and.resolveTo(clientId);
      mockOpLogStore.append.and.resolveTo();
      mockOpLogStore.saveStateCache.and.resolveTo();

      await service.checkAndMigrate();

      expect(mockOpLogStore.getLastSeq).toHaveBeenCalled();
      expect(mockPfapiService.pf.getAllSyncModelData).toHaveBeenCalledWith(true);
      expect(mockPfapiService.pf.metaModel.loadClientId).toHaveBeenCalled();

      // Check append call (Genesis Operation)
      expect(mockOpLogStore.append).toHaveBeenCalled();
      const appendCallArgs = mockOpLogStore.append.calls.first().args[0];
      expect(appendCallArgs).toEqual(
        jasmine.objectContaining({
          actionType: '[Migration] Genesis Import',
          entityType: 'MIGRATION',
          clientId: clientId,
          payload: legacyData,
        }),
      );

      // Check saveStateCache call
      expect(mockOpLogStore.saveStateCache).toHaveBeenCalled();
      const saveCacheCallArgs = mockOpLogStore.saveStateCache.calls.first().args[0];
      expect(saveCacheCallArgs).toEqual(
        jasmine.objectContaining({
          state: legacyData,
          lastAppliedOpSeq: 1,
        }),
      );
    });
  });
});
