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
    localLamport: 5,
    lastSyncedLamport: 5,
    ...overrides,
  });

  const createDefaultRemoteMeta = (overrides = {}): RemoteMeta => ({
    revMap: {},
    lastUpdate: 1000,
    crossModelVersion: 1,
    mainModelData: {},
    localLamport: 5,
    lastSyncedLamport: null,
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
      // Rev different but timestamps match
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1X'));
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 2000,
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 2000,
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
            localLamport: 5,
            lastSyncedLamport: 5,
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 2000,
            localLamport: 10,
            lastSyncedLamport: 5,
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
            localLamport: 10,
            lastSyncedLamport: 5,
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 1000,
            localLamport: 5,
            lastSyncedLamport: 5,
          }),
          remoteMetaRev: 'meta-rev-1',
        }),
      );

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.UpdateRemote);
      expect(mockMetaSyncService.upload).toHaveBeenCalled();
    });

    it('should handle conflicts', async () => {
      // Setup for conflict
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve(
          createDefaultLocalMeta({
            lastUpdate: 2000,
            lastSyncedUpdate: 1000,
            localLamport: 10,
            lastSyncedLamport: 5,
          }),
        ),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 1500,
            localLamport: 8,
            lastSyncedLamport: 5,
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
            localLamport: 5,
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
          localLamport: 5,
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
        localLamport: 10,
        lastSyncedLamport: 5,
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
          lastSyncedLamport: 10,
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
          localLamport: 5, // max(5, 5) - NO increment on download
          lastSyncedLamport: 5,
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
            localLamport: 5,
            lastSyncedLamport: 5,
          }),
        ),
      );

      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            lastUpdate: 2000,
            crossModelVersion: 3.0, // Remote version is major version ahead
            localLamport: 10,
            lastSyncedLamport: 5,
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
            localLamport: 10,
            lastSyncedLamport: 5,
          }),
        ),
      );

      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: createDefaultRemoteMeta({
            revMap: { singleModel1: 'remote-rev' },
            lastUpdate: 1500,
            mainModelData: { mainModel1: { id: 'remote-data' } },
            localLamport: 8,
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

  describe('Lamport timestamp handling', () => {
    describe('upload operations', () => {
      it('should update lastSyncedLamport after successful upload', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          localLamport: 10,
          lastSyncedLamport: 5,
        });
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 1000,
          localLamport: 5,
        });

        mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));
        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-1',
          }),
        );
        mockMetaSyncService.upload.and.returnValue(
          Promise.resolve('meta-rev-after-upload'),
        );

        await service.uploadToRemote(remoteMeta, localMeta, 'meta-rev-1');

        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            lastSyncedUpdate: 2000,
            lastSyncedLamport: 10,
          }),
        );
      });

      it('should preserve localLamport during multi-file upload', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          localLamport: 15,
          lastSyncedLamport: 8,
          revMap: { singleModel1: 'old-rev' },
        });

        mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
          toUpdate: ['singleModel1'],
          toDelete: [],
        });
        mockModelSyncService.upload.and.returnValue(Promise.resolve('new-rev'));
        mockMetaSyncService.upload.and.returnValue(
          Promise.resolve('meta-rev-after-upload'),
        );
        await service._uploadToRemoteMULTI(
          createDefaultRemoteMeta(),
          localMeta,
          'meta-rev-1',
        );

        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 15,
            lastSyncedLamport: 15,
          }),
        );
      });
    });

    describe('download operations', () => {
      it('should update localLamport to max(local, remote) WITHOUT incrementing after download', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          localLamport: 5,
          lastSyncedLamport: 5,
        });
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2000,
          localLamport: 8,
          mainModelData: { mainModel1: { id: 'data' } },
        });

        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );
        mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile.and.returnValue(
          Promise.resolve(),
        );

        await service.downloadToLocal(remoteMeta, localMeta, 'meta-rev-2');

        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 8, // max(5, 8) - NO increment to prevent sync loops
            lastSyncedLamport: 8,
          }),
        );
      });

      it('should handle missing Lamport timestamps gracefully during download', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          localLamport: undefined as any,
          lastSyncedLamport: undefined as any,
        });
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2000,
          localLamport: undefined as any,
          mainModelData: { mainModel1: { id: 'data' } },
        });

        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );
        mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile.and.returnValue(
          Promise.resolve(),
        );

        await service.downloadToLocal(remoteMeta, localMeta, 'meta-rev-2');

        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 0, // max(0, 0) - NO increment
            lastSyncedLamport: 0,
          }),
        );
      });

      it('should update Lamport timestamps correctly in multi-file download', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          localLamport: 10,
          lastSyncedLamport: 10,
          revMap: { singleModel1: 'old-rev' },
        });
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2000,
          localLamport: 15,
          revMap: { singleModel1: 'new-rev', singleModel2: 'another-rev' },
          mainModelData: { mainModel1: { id: 'data' } },
        });

        mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
          toUpdate: ['singleModel1', 'singleModel2'],
          toDelete: [],
        });
        mockModelSyncService.download.and.returnValue(
          Promise.resolve({ data: { id: 'model-data' }, rev: 'model-rev' }),
        );
        mockModelSyncService.updateLocalUpdated.and.returnValue(Promise.resolve());
        mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile.and.returnValue(
          Promise.resolve(),
        );

        await service._downloadToLocalMULTI(remoteMeta, localMeta, 'meta-rev-2');

        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 15, // max(10, 15) - no increment on download
            lastSyncedLamport: 15,
          }),
        );
      });
    });

    describe('sync loop prevention', () => {
      it('should NOT trigger sync after download when no local changes exist', async () => {
        // Initial state: in sync
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          localLamport: 5,
          lastSyncedLamport: 5,
        });

        // Remote has new data
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2000,
          localLamport: 8,
          mainModelData: { mainModel1: { id: 'data' } },
        });

        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );
        mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile.and.returnValue(
          Promise.resolve(),
        );

        await service.downloadToLocal(remoteMeta, localMeta, 'meta-rev-2');

        // After download, localLamport should equal lastSyncedLamport
        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 8,
            lastSyncedLamport: 8,
          }),
        );

        // This means localLamport === lastSyncedLamport, so no sync will be triggered
      });

      it('should preserve local changes indicator after download', async () => {
        // Local has unsaved changes (localLamport > lastSyncedLamport)
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 1500,
          lastSyncedUpdate: 1000,
          localLamport: 7, // Higher than lastSyncedLamport
          lastSyncedLamport: 5,
        });

        // Remote has different changes
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2000,
          localLamport: 6,
          mainModelData: { mainModel1: { id: 'data' } },
        });

        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );
        mockModelSyncService.updateLocalMainModelsFromRemoteMetaFile.and.returnValue(
          Promise.resolve(),
        );

        await service.downloadToLocal(remoteMeta, localMeta, 'meta-rev-2');

        // localLamport takes max but preserves the fact that local > lastSynced
        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 7, // max(7, 6) = 7
            lastSyncedLamport: 7, // Updated to match
          }),
        );
      });
    });

    describe('InSync status handling', () => {
      it('should update lastSyncedLamport when in sync but Lamport differs', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 2000,
          lastSyncedUpdate: 2000,
          localLamport: 10,
          lastSyncedLamport: 8, // Out of sync with localLamport
          metaRev: 'meta-rev-1',
        });
        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2000,
          localLamport: 10,
        });

        mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));
        // Make getRev return different value to bypass early return
        mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-2'));
        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );

        const result = await service.sync();

        expect(result.status).toBe(SyncStatus.InSync);
        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            lastSyncedLamport: 10,
            metaRev: 'meta-rev-2',
          }),
        );
      });
    });

    describe('uploadAll with Lamport timestamps', () => {
      it('should set lastSyncedLamport when uploading all data', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          localLamport: 20,
          lastSyncedLamport: null,
        });

        mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));

        await service.uploadAll();

        // Check that the meta sync service was called with correct Lamport data
        expect(mockMetaSyncService.upload).toHaveBeenCalledWith(
          jasmine.objectContaining({
            lastUpdate: 2000,
            localLamport: 20,
          }),
          null,
        );

        // And that saveLocal was called with the updated lastSyncedLamport
        expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith(
          jasmine.objectContaining({
            lastSyncedUpdate: 2000,
            lastSyncedLamport: 20,
          }),
        );
      });

      it('should increment localLamport when force uploading for conflict resolution', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          localLamport: 10,
          lastSyncedLamport: 8,
        });

        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2100,
          localLamport: 12,
        });

        mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));
        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );

        await service.uploadAll(true); // Force upload

        // Should increment to be higher than remote's Lamport
        expect(mockMetaModelCtrl.save).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 13, // max(10, 12) + 1
          }),
          true,
        );
      });

      it('should handle Lamport overflow correctly during conflict resolution', async () => {
        const localMeta = createDefaultLocalMeta({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          localLamport: Number.MAX_SAFE_INTEGER - 500,
          lastSyncedLamport: Number.MAX_SAFE_INTEGER - 501,
        });

        const remoteMeta = createDefaultRemoteMeta({
          lastUpdate: 2100,
          localLamport: Number.MAX_SAFE_INTEGER - 100,
        });

        mockMetaModelCtrl.load.and.returnValue(Promise.resolve(localMeta));
        mockMetaSyncService.download.and.returnValue(
          Promise.resolve({
            remoteMeta,
            remoteMetaRev: 'meta-rev-2',
          }),
        );

        await service.uploadAll(true); // Force upload

        // Should reset to 1 when approaching MAX_SAFE_INTEGER
        expect(mockMetaModelCtrl.save).toHaveBeenCalledWith(
          jasmine.objectContaining({
            localLamport: 1, // Reset due to overflow protection
          }),
          true,
        );
      });
    });
  });
});
