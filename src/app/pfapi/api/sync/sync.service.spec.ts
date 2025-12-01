import { SyncService } from './sync.service';
import { SyncProviderId, SyncStatus } from '../pfapi.const';
import { MiniObservable } from '../util/mini-observable';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { ModelSyncService } from './model-sync.service';
import { MetaSyncService } from './meta-sync.service';
import { AllSyncModels, LocalMeta, ModelCfg, RemoteMeta } from '../pfapi.model';
import { Pfapi } from '../pfapi';
import {
  LockFromLocalClientPresentError,
  ModelVersionToImportNewerThanLocalError,
  NoRemoteMetaFile,
  RevMismatchForModelError,
} from '../errors/errors';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';

interface FakeModel {
  id: string;
  data?: any;
}

type PfapiAllModelCfg = {
  mainModel1: ModelCfg<FakeModel>;
  mainModel2: ModelCfg<FakeModel>;
  singleModel1: ModelCfg<FakeModel>;
  singleModel2: ModelCfg<FakeModel>;
};

describe('SyncService', () => {
  // Helper functions for common test setups
  const createDefaultLocalMeta = (overrides = {}): LocalMeta => ({
    revMap: {},
    lastUpdate: 1000,
    lastSyncedUpdate: 1000,
    metaRev: 'meta-rev-1',
    crossModelVersion: 1,
    vectorClock: { CLIENT_123: 1 },
    lastSyncedVectorClock: { CLIENT_123: 1 },
    ...overrides,
  });

  const createDefaultRemoteMeta = (overrides = {}): RemoteMeta => ({
    revMap: {},
    lastUpdate: 1000,
    crossModelVersion: 1,
    mainModelData: {},
    vectorClock: { CLIENT_123: 1 },
    ...overrides,
  });

  let service: SyncService<PfapiAllModelCfg>;
  let mockModelControllers: any;
  let mockPfapi: Pfapi<PfapiAllModelCfg>;
  let mockSyncProvider$: MiniObservable<any>;
  let mockEncryptAndCompressCfg$: MiniObservable<any>;
  let mockMetaModelCtrl: jasmine.SpyObj<MetaModelCtrl>;
  let mockEncryptAndCompressHandler: jasmine.SpyObj<EncryptAndCompressHandlerService>;
  let mockSyncProvider: any;
  let mockMetaSyncService: jasmine.SpyObj<MetaSyncService>;
  let mockModelSyncService: jasmine.SpyObj<ModelSyncService<any>>;

  beforeEach(() => {
    // Setup mock model controllers
    mockModelControllers = setupModelControllers();

    // Setup mock PFAPI
    mockPfapi = setupMockPfapi();

    // Setup sync provider
    mockSyncProvider = setupMockSyncProvider();
    mockSyncProvider$ = new MiniObservable(mockSyncProvider);

    // Setup encrypt/compress config
    mockEncryptAndCompressCfg$ = setupEncryptCompressCfg();

    // Setup mock services
    mockMetaModelCtrl = setupMetaModelCtrl();

    mockEncryptAndCompressHandler = setupEncryptAndCompressHandler();
    mockMetaSyncService = setupMetaSyncService();
    mockModelSyncService = setupModelSyncService();

    // Create service with spies for internal services
    service = new SyncService(
      mockModelControllers,
      mockPfapi,
      mockMetaModelCtrl,
      mockSyncProvider$,
      mockEncryptAndCompressCfg$,
      mockEncryptAndCompressHandler,
    );

    // Replace internal services with mocks
    service['_metaFileSyncService'] = mockMetaSyncService;
    service['_modelSyncService'] = mockModelSyncService;
  });

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupModelControllers() {
    return {
      mainModel1: createModelController(true),
      mainModel2: createModelController(true),
      singleModel1: createModelController(false),
      singleModel2: createModelController(false),
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function createModelController(isMainFileModel: boolean) {
    return {
      modelCfg: {
        isMainFileModel,
      },
      save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupMockPfapi() {
    return {
      getAllSyncModelData: jasmine.createSpy('getAllSyncModelData').and.returnValue(
        Promise.resolve({
          mainModel1: { id: 'mainModel1-data-id' },
          mainModel2: { id: 'mainModel2-data-id' },
          singleModel1: { id: 'singleModel1-data-id' },
          singleModel2: { id: 'singleModel2-data-id' },
        } satisfies AllSyncModels<PfapiAllModelCfg>),
      ),
      importAllSycModelData: jasmine
        .createSpy('importAllSycModelData')
        .and.returnValue(Promise.resolve()),
      cfg: {
        crossModelVersion: 1,
      },
    } as unknown as Pfapi<PfapiAllModelCfg>;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupMockSyncProvider() {
    return {
      id: SyncProviderId.Dropbox,
      isReady: jasmine.createSpy('isReady').and.returnValue(Promise.resolve(true)),
      isLimitedToSingleFileSync: false,
      maxConcurrentRequests: 3,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupEncryptCompressCfg() {
    return new MiniObservable({
      isEncrypt: false,
      isCompress: true,
      encryptKey: 'test-key',
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupMetaModelCtrl() {
    const ctrl = jasmine.createSpyObj<MetaModelCtrl>('MetaModelCtrl', [
      'load',
      'save',
      'loadClientId',
    ]);
    ctrl.load.and.returnValue(Promise.resolve(createDefaultLocalMeta()));
    ctrl.loadClientId.and.returnValue(Promise.resolve('test-client-id'));
    return ctrl;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupEncryptAndCompressHandler() {
    return {
      compressAndEncryptData: jasmine
        .createSpy('compressAndEncryptData')
        .and.callFake(({ data }) => Promise.resolve(JSON.stringify(data))),
      decompressAndDecryptData: jasmine
        .createSpy('decompressAndDecryptData')
        .and.callFake(({ dataStr }) =>
          Promise.resolve({ data: JSON.parse(dataStr), version: 1 }),
        ),
      compressAndEncrypt: jasmine.createSpy('compressAndEncrypt'),
      decompressAndDecrypt: jasmine.createSpy('decompressAndDecrypt') as any,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupMetaSyncService() {
    const service2 = jasmine.createSpyObj('MetaSyncService', [
      'download',
      'upload',
      'getRev',
      'lock',
      'saveLocal',
    ]);
    service2.getRev.and.returnValue(Promise.resolve('remote-meta-rev-1'));
    service2.download.and.returnValue(
      Promise.resolve({
        remoteMeta: createDefaultRemoteMeta({
          mainModelData: {
            mainModel1: { id: 'main-model1-data-id' },
            mainModel2: { id: 'main-model2-data-id' },
          },
        }),
        remoteMetaRev: 'remote-meta-rev-1',
      }),
    );
    service2.upload.and.returnValue(Promise.resolve('new-meta-rev-after-upload'));
    service2.lock.and.returnValue(Promise.resolve());
    return service2;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
  function setupModelSyncService() {
    const service3 = jasmine.createSpyObj('ModelSyncService', [
      'upload',
      'download',
      'remove',
      'getModelIdsToUpdateFromRevMaps',
      'updateLocalMainModelsFromRemoteMetaFile',
      'updateLocalUpdated',
      'getMainFileModelDataForUpload',
    ]);
    service3.getModelIdsToUpdateFromRevMaps.and.returnValue({
      toUpdate: [],
      toDelete: [],
    });
    service3.getMainFileModelDataForUpload.and.returnValue(
      Promise.resolve({
        mainModel1: { id: 'mainModel1-data-id' },
      }),
    );
    return service3;
  }

  describe('initialization', () => {
    it('should initialize with the correct dependencies', () => {
      expect(service).toBeTruthy();
      expect(service.m).toBe(mockModelControllers);
      expect(service['_pfapiMain']).toBe(mockPfapi);
      expect(service.IS_DO_CROSS_MODEL_MIGRATIONS).toBe(false);
    });
  });

  describe('sync operations', () => {
    it('should detect already in sync state', async () => {
      // Setup for in-sync state
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            metaRev: 'meta-rev-123',
          }),
        ),
      );
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-123'));

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.InSync);
      expect(mockMetaSyncService.download).not.toHaveBeenCalled();
    });

    it('should return inSync if revs match special case', async () => {
      // Rev different but timestamps match and vector clocks are equal
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1X'));
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 2000,
            vectorClock: { CLIENT_123: 2 },
            lastSyncedVectorClock: { CLIENT_123: 2 },
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 2000,
            vectorClock: { CLIENT_123: 2 }, // Same as local
          }),
          remoteMetaRev: 'meta-rev-1',
        }),
      );

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.InSync);
      expect(mockMetaSyncService.saveLocal).not.toHaveBeenCalled();
    });

    it('should update local data when remote is newer', async () => {
      // Setup for remote newer
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            metaRev: 'meta-rev-local-1',
            lastUpdate: 1000,
            lastSyncedUpdate: 1000,
            vectorClock: { CLIENT_123: 1 },
            lastSyncedVectorClock: { CLIENT_123: 1 },
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 2000,
            vectorClock: { CLIENT_123: 2 }, // Remote is ahead
          }),
          remoteMetaRev: 'meta-rev-remote-2',
        }),
      );
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-remote-2'));

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.UpdateLocal);
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalled();
    });

    it('should update remote when local is newer even if rev is equal', async () => {
      // Setup for local newer
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 1000,
            vectorClock: { CLIENT_123: 2 }, // Local is ahead
            lastSyncedVectorClock: { CLIENT_123: 1 },
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 1000,
            vectorClock: { CLIENT_123: 1 },
          }),
          remoteMetaRev: 'meta-rev-1',
        }),
      );

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.UpdateRemote);
      expect(mockMetaSyncService.upload).toHaveBeenCalled();
    });

    it('should handle conflicts', async () => {
      // Setup for conflict - concurrent vector clocks
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 1000,
            vectorClock: { CLIENT_123: 2, CLIENT_456: 1 }, // Local has changes from both clients
            lastSyncedVectorClock: { CLIENT_123: 1, CLIENT_456: 1 },
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 1500,
            vectorClock: { CLIENT_123: 1, CLIENT_456: 2 }, // Remote has different changes from both clients
          }),
          remoteMetaRev: 'meta-rev-2',
        }),
      );

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData).toBeDefined();
    });
  });

  describe('upload operations', () => {
    beforeEach(() => {
      mockMetaSyncService.upload.and.returnValue(
        Promise.resolve('NEW-meta-rev-after-upload'),
      );
    });

    it('should upload all data with force flag', async () => {
      spyOn(Date, 'now').and.returnValue(12345);

      // After save, load will return the updated meta
      mockMetaModelCtrl.load.and.returnValues(
        Promise.resolve(createDefaultLocalMeta()), // First load
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 12345,
          }),
        ), // Second load after save
      );

      await service.uploadAll(true);

      expect(mockMetaModelCtrl.save).toHaveBeenCalledWith(
        jasmine.objectContaining({
          lastUpdate: 12345,
        }),
        true,
      );

      expect(mockMetaSyncService.upload).toHaveBeenCalledWith(
        jasmine.objectContaining({
          revMap: {
            singleModel1: 'UPDATE_ALL_REV',
            singleModel2: 'UPDATE_ALL_REV',
          },
          lastUpdate: 12345,
          crossModelVersion: 1,
          mainModelData: { mainModel1: { id: 'mainModel1-data-id' } },
        }),
        null,
      );
    });

    it('should handle single file sync provider', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;

      await service.uploadToRemote(
        createDefaultRemoteMeta(),
        createDefaultLocalMeta({
          revMap: { tasks: 'rev1' },
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
        }),
        'meta-rev',
      );

      expect(mockPfapi.getAllSyncModelData).toHaveBeenCalled();
      expect(mockMetaSyncService.upload).toHaveBeenCalled();
    });

    it('should set lastSyncedAction when uploading', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;

      await service.uploadToRemote(
        createDefaultRemoteMeta(),
        createDefaultLocalMeta({
          revMap: { tasks: 'rev1' },
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
        }),
        'meta-rev',
      );

      expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
        jasmine.objectContaining({
          lastSyncedAction: jasmine.stringMatching(
            /^Uploaded single file at \d{4}-\d{2}-\d{2}T/,
          ),
        }),
      );
    });

    it('should upload multiple files when models need updating', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: ['singleModel2'],
      });
      mockModelSyncService.upload.and.returnValue(
        Promise.resolve('new-single-model-rev'),
      );

      const localMeta = createDefaultLocalMeta({
        lastUpdate: 2000,
        lastSyncedUpdate: 1000,
      });

      await service._uploadToRemoteMULTI(
        createDefaultRemoteMeta(),
        localMeta,
        'meta-rev',
      );

      expect(mockModelSyncService.upload).toHaveBeenCalledWith('singleModel1', {
        id: 'singleModel1-data-id',
      });
      expect(mockModelSyncService.remove).toHaveBeenCalledWith('singleModel2');
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
        jasmine.objectContaining({
          lastUpdate: 2000,
          crossModelVersion: 1,
          lastSyncedUpdate: 2000,
          revMap: { singleModel1: 'new-single-model-rev' },
          metaRev: 'NEW-meta-rev-after-upload',
        }),
      );
    });
  });

  describe('download operations', () => {
    it('should download all data from remote', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1', 'singleModel2'],
        toDelete: [],
      });
      mockModelSyncService.download.and.returnValue(
        Promise.resolve({
          data: { id: 'dataX' },
          rev: 'revX',
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            revMap: {
              singleModel1: 'remote-rev-1',
              singleModel2: 'remote-rev-2',
            },
            mainModelData: {
              mainModel1: { id: 'main-model1-data-id' },
              mainModel2: { id: 'main-model2-data-id' },
            },
          }),
          remoteMetaRev: 'meta-rev-2',
        }),
      );

      await service.downloadAll();
      expect(mockMetaSyncService.download).toHaveBeenCalled();
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalled();
      expect(mockPfapi.importAllSycModelData).toHaveBeenCalledWith({
        data: {
          mainModel1: { id: 'main-model1-data-id' },
          mainModel2: { id: 'main-model2-data-id' },
          singleModel1: { id: 'dataX' },
          singleModel2: { id: 'dataX' },
        },
        crossModelVersion: 1,
        isAttemptRepair: true,
        isBackupData: true,
        isSkipLegacyWarnings: false,
      });
    });

    it('should download only data in meta file for single file sync', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;

      await service.downloadToLocal(
        createDefaultRemoteMeta({
          lastUpdate: 2000,
        }),
        createDefaultLocalMeta({
          lastSyncedUpdate: 1000,
          metaRev: 'local-meta-rev',
        }),
        'expected-new-meta-rev',
      );

      expect(
        mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile,
      ).toHaveBeenCalledWith(
        createDefaultRemoteMeta({
          lastUpdate: 2000,
        }),
      );

      expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
        jasmine.objectContaining({
          lastUpdate: 2000,
          crossModelVersion: 1,
          revMap: {},
          lastSyncedUpdate: 2000,
          metaRev: 'expected-new-meta-rev',
        }),
      );
    });

    it('should download multiple files when needed', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['tasks'],
        toDelete: [],
      });
      mockModelSyncService.download.and.returnValue(
        Promise.resolve({
          data: { id: 'tasks-remote' },
          rev: 'tasks-rev-remote',
        }),
      );

      await service._downloadToLocalMULTI(
        createDefaultRemoteMeta({
          revMap: { tasks: 'tasks-rev' },
          lastUpdate: 2000,
        }),
        createDefaultLocalMeta({
          lastSyncedUpdate: 1000,
        }),
        'new-meta-rev',
      );

      expect(mockModelSyncService.download).toHaveBeenCalledWith('tasks', 'tasks-rev');
      expect(mockModelSyncService.updateLocalUpdated).toHaveBeenCalled();
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalled();
    });
  });

  describe('error handling and conflicts', () => {
    it('should handle NoRemoteMetaFile errors by setting up a new remote file', async () => {
      const noRemoteMetaFileError = new NoRemoteMetaFile();
      mockMetaSyncService.getRev.and.throwError(noRemoteMetaFileError);
      mockMetaSyncService.download.and.throwError(noRemoteMetaFileError);

      spyOn(service, 'uploadAll').and.returnValue(Promise.resolve());

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.UpdateRemoteAll);
      expect(service.uploadAll).toHaveBeenCalledWith(true);
    });

    it('should handle LockFromLocalClientPresentError by forcing an update', async () => {
      const lockError = new LockFromLocalClientPresentError();
      mockMetaSyncService.download.and.throwError(lockError);
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('newwww-meta-rev'));

      spyOn(service, 'uploadAll').and.returnValue(Promise.resolve());

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.UpdateRemoteAll);
      expect(service.uploadAll).toHaveBeenCalledWith(true);
    });

    it('should reject with ModelVersionToImportNewerThanLocalError when remote has newer version', async () => {
      (service as any).IS_DO_CROSS_MODEL_MIGRATIONS = true;

      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 1000,
            lastSyncedUpdate: 1000,
            crossModelVersion: 1.0, // Local version
            vectorClock: { CLIENT_123: 1 },
            lastSyncedVectorClock: { CLIENT_123: 1 },
          }),
        ),
      );

      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 2000,
            crossModelVersion: 3.0, // Remote version is major version ahead
            vectorClock: { CLIENT_123: 2 },
          }),
          remoteMetaRev: 'meta-rev-2',
        }),
      );

      await expectAsync(service.sync()).toBeRejectedWithError(
        ModelVersionToImportNewerThanLocalError,
      );
    });

    it('should handle RevMismatchForModelError during download', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: [],
      });
      mockModelSyncService.download.and.throwError(
        new RevMismatchForModelError('singleModel1'),
      );

      await expectAsync(
        service._downloadToLocalMULTI(
          createDefaultRemoteMeta({
            revMap: { singleModel1: 'rev-wrong' },
            lastUpdate: 2000,
          }),
          createDefaultLocalMeta({
            lastSyncedUpdate: 1000,
          }),
          'meta-rev-2',
        ),
      ).toBeRejectedWithError();
    });

    it('should handle connection errors during sync', async () => {
      const connectionError = new Error('Network error');
      mockMetaSyncService.getRev.and.throwError(connectionError);

      await expectAsync(service.sync()).toBeRejected();
    });

    it('should handle errors when sync provider is not set', async () => {
      mockSyncProvider$.next(null);

      await expectAsync(service.sync()).toBeRejected();
    });

    it('should handle errors when sync provider is not ready', async () => {
      mockSyncProvider.isReady.and.returnValue(Promise.resolve(false));

      const result = await service.sync();
      expect(result.status).toBe(SyncStatus.NotConfigured);
    });

    it('should reject when trying to upload with no provider', async () => {
      mockSyncProvider$.next(null);

      await expectAsync(service.uploadAll()).toBeRejectedWithError();
    });
  });

  describe('conflict handling', () => {
    beforeEach(() => {
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 1000,
            revMap: { singleModel1: 'local-rev' },
            vectorClock: { CLIENT_123: 2, CLIENT_456: 1 }, // Local has changes from both clients
            lastSyncedVectorClock: { CLIENT_123: 1, CLIENT_456: 1 },
          }),
        ),
      );

      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            revMap: { singleModel1: 'remote-rev' },
            lastUpdate: 1500,
            mainModelData: { mainModel1: { id: 'remote-data' } },
            vectorClock: { CLIENT_123: 1, CLIENT_456: 2 }, // Remote has different changes from both clients
          }),
          remoteMetaRev: 'meta-rev-2',
        }),
      );
    });

    it('should detect conflicts correctly', async () => {
      const syncResult = await service.sync();

      expect(syncResult.status).toBe(SyncStatus.Conflict);
      expect(syncResult.conflictData).toBeDefined();
      // expect(syncResult.conflictData?.localLastUpdate).toBe(2000);
      // expect(syncResult.conflictData?.remoteLastUpdate).toBe(1500);
    });
  });

  describe('upload error handling', () => {
    it('should handle errors during upload by rolling back', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: [],
      });
      mockModelSyncService.upload.and.throwError(new Error('Upload failed'));

      await expectAsync(
        service._uploadToRemoteMULTI(
          createDefaultRemoteMeta(),
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 1000,
          }),
          'meta-rev',
        ),
      ).toBeRejected();

      // Verify metadata wasn't updated
      expect(mockMetaSyncService.saveLocal).not.toHaveBeenCalled();
    });

    it('should handle meta file upload failures', async () => {
      mockMetaSyncService.upload.and.throwError(new Error('Meta upload failed'));
      await expectAsync(service.uploadAll()).toBeRejected();
    });
  });

  describe('download error handling', () => {
    it('should handle errors during download of individual models', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: [],
      });
      mockModelSyncService.download.and.throwError(new Error('Download failed'));

      await expectAsync(
        service._downloadToLocalMULTI(
          createDefaultRemoteMeta({
            revMap: { singleModel1: 'rev1' },
            lastUpdate: 2000,
          }),
          createDefaultLocalMeta({
            lastSyncedUpdate: 1000,
          }),
          'meta-rev-2',
        ),
      ).toBeRejectedWithError();

      expect(mockMetaSyncService.saveLocal).not.toHaveBeenCalled();
    });

    it('should handle updateLocalMainModelsFromRemoteMetaFile errors', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;
      mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile.and.throwError(
        new Error('Update from meta failed'),
      );

      await expectAsync(
        service.downloadToLocal(
          createDefaultRemoteMeta({
            lastUpdate: 2000,
          }),
          createDefaultLocalMeta({
            lastSyncedUpdate: 1000,
          }),
          'meta-rev-2',
        ),
      ).toBeRejected();
    });
  });

  describe('vector clock preservation', () => {
    it('should preserve vector clock fields when status is InSync', async () => {
      const localMeta = createDefaultLocalMeta({
        lastUpdate: 2000,
        lastSyncedUpdate: 1900, // Different from lastUpdate to trigger saveLocal
        vectorClock: { CLIENT_123: 5 },
        lastSyncedVectorClock: { CLIENT_123: 5 }, // Same as vectorClock for InSync
      });

      const remoteMeta = createDefaultRemoteMeta({
        lastUpdate: 2000,
        vectorClock: { CLIENT_123: 5 }, // Same as local for InSync
      });

      mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));
      mockMetaModelCtrl.loadClientId.and.returnValue(Promise.resolve('CLIENT_123'));
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1'));
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta,
          remoteMetaRev: 'meta-rev-2',
        }),
      );
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: [],
        toDelete: [],
      });

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.InSync);

      // Check that saveLocal was called with vector clock fields preserved
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
        jasmine.objectContaining({
          vectorClock: { CLIENT_123: 5 }, // Should be preserved
          lastSyncedVectorClock: jasmine.any(Object), // Should be set
        }),
      );
    });

    it('should return conflict when vector clock is missing from local', async () => {
      const localMeta = createDefaultLocalMeta({
        lastUpdate: 1000,
        lastSyncedUpdate: 1000,
        vectorClock: undefined, // No vector clock fields
        lastSyncedVectorClock: undefined,
      });

      const remoteMeta = createDefaultRemoteMeta({
        lastUpdate: 2000,
        vectorClock: { CLIENT_456: 10 },
      });

      mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));
      mockMetaModelCtrl.loadClientId.and.returnValue(Promise.resolve('CLIENT_123'));
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('old-rev'));
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta,
          remoteMetaRev: 'new-rev',
        }),
      );
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: [],
        toDelete: [],
      });

      const result = await service.sync();

      // Should return conflict when vector clock is missing from local side
      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData).toBeDefined();
    });
  });
});
