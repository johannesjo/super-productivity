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
  // const PFAPI_MODEL_CFGS: PfapiAllModelCfg = {
  //   mainModel1: {
  //     modelVersion: 1,
  //     isMainFileModel: true,
  //   },
  //   mainModel2: {
  //     modelVersion: 1,
  //     isMainFileModel: true,
  //   },
  //
  //   singleModel1: {
  //     modelVersion: 1,
  //   },
  //   singleModel2: {
  //     modelVersion: 1,
  //   },
  // } as const;

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
    mockModelControllers = {
      mainModel1: {
        modelCfg: {
          isMainFileModel: true,
          transformBeforeUpload: jasmine
            .createSpy('transformBeforeUpload')
            .and.callFake((data) => data),
          transformBeforeDownload: jasmine
            .createSpy('transformBeforeDownload')
            .and.callFake((data) => data),
        },
        save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
      },
      mainModel2: {
        modelCfg: {
          isMainFileModel: true,
          transformBeforeUpload: jasmine
            .createSpy('transformBeforeUpload')
            .and.callFake((data) => data),
          transformBeforeDownload: jasmine
            .createSpy('transformBeforeDownload')
            .and.callFake((data) => data),
        },
        save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
      },
      singleModel1: {
        modelCfg: {
          isMainFileModel: false,
          transformBeforeUpload: jasmine
            .createSpy('transformBeforeUpload')
            .and.callFake((data) => data),
          transformBeforeDownload: jasmine
            .createSpy('transformBeforeDownload')
            .and.callFake((data) => data),
        },
        save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
      },
      singleModel2: {
        modelCfg: {
          isMainFileModel: false,
          transformBeforeUpload: jasmine
            .createSpy('transformBeforeUpload')
            .and.callFake((data) => data),
          transformBeforeDownload: jasmine
            .createSpy('transformBeforeDownload')
            .and.callFake((data) => data),
        },
        save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
      },
    };

    // Setup mock PFAPI
    mockPfapi = {
      getAllSyncModelData: jasmine.createSpy('getAllSyncModelData').and.returnValue(
        Promise.resolve({
          mainModel1: { id: 'mainModel1-data-id' },
          mainModel2: { id: 'mainModel2-data-id' },
          singleModel1: { id: 'singleModel1-data-id' },
          singleModel2: { id: 'singleModel2-data-id' },
        } satisfies AllSyncModels<PfapiAllModelCfg>),
      ),
      cfg: {
        crossModelVersion: 1,
      },
    } as unknown as Pfapi<PfapiAllModelCfg>;

    // Setup sync provider
    mockSyncProvider = {
      id: SyncProviderId.Dropbox,
      isReady: jasmine.createSpy('isReady').and.returnValue(Promise.resolve(true)),
      isLimitedToSingleFileSync: false,
      maxConcurrentRequests: 3,
    };
    mockSyncProvider$ = new MiniObservable(mockSyncProvider);

    // Setup encrypt/compress config
    mockEncryptAndCompressCfg$ = new MiniObservable({
      isEncrypt: false,
      isCompress: true,
      encryptKey: 'test-key',
    });

    // Setup meta model controller
    mockMetaModelCtrl = jasmine.createSpyObj<MetaModelCtrl>('MetaModelCtrl', [
      'load',
      'save',
    ]);
    mockMetaModelCtrl.load.and.returnValue(
      Promise.resolve({
        revMap: {},
        lastUpdate: 1000,
        lastSyncedUpdate: 1000,
        metaRev: 'meta-rev-1',
        modelVersions: {},
        crossModelVersion: 1,
      } satisfies LocalMeta),
    );

    // Setup encryption handler
    mockEncryptAndCompressHandler = {
      compressAndeEncryptData: jasmine
        .createSpy('compressAndeEncryptData')
        .and.callFake(({ data }) => Promise.resolve(JSON.stringify(data))),
      decompressAndDecryptData: jasmine
        .createSpy('decompressAndDecryptData')
        .and.callFake(({ dataStr }) =>
          Promise.resolve({ data: JSON.parse(dataStr), version: 1 }),
        ),
      compressAndEncrypt: jasmine.createSpy('compressAndEncrypt'),
      decompressAndDecrypt: jasmine.createSpy('decompressAndDecrypt') as any,
    };

    // Setup MetaSyncService mock
    mockMetaSyncService = jasmine.createSpyObj('MetaSyncService', [
      'download',
      'upload',
      'getRev',
      'lock',
      'saveLocal',
    ]);
    mockMetaSyncService.getRev.and.returnValue(Promise.resolve('remote-meta-rev-1'));
    mockMetaSyncService.download.and.returnValue(
      Promise.resolve({
        remoteMeta: {
          revMap: {},
          lastUpdate: 1000,
          modelVersions: {},
          crossModelVersion: 1,
          mainModelData: { mainModel1: { id: 'main-model1-data-id' } },
        },
        remoteMetaRev: 'remote-meta-rev-1',
      } satisfies { remoteMeta: RemoteMeta; remoteMetaRev: string }),
    );

    mockMetaSyncService.upload.and.returnValue(
      Promise.resolve('new-meta-rev-after-upload'),
    );

    // Setup ModelSyncService mock
    mockModelSyncService = jasmine.createSpyObj('ModelSyncService', [
      'upload',
      'download',
      'remove',
      'getModelIdsToUpdateFromRevMaps',
      'updateLocalFromRemoteMetaFile',
      'updateLocalUpdated',
      'getMainFileModelDataForUpload',
    ]);
    mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
      toUpdate: [],
      toDelete: [],
    });
    mockModelSyncService.getMainFileModelDataForUpload.and.returnValue(
      Promise.resolve({
        mainModel1: { id: 'mainModel1-data-id' },
      }),
    );

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
        Promise.resolve({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-123',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-123'));

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.InSync);
      expect(mockMetaSyncService.download).not.toHaveBeenCalled();
    });

    it('should return inSync if revs match special case', async () => {
      // rev for some unlikely reason different to local (maybe due to the other client is not just ready with its sync)
      mockMetaSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1X'));
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 2000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
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
        Promise.resolve({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-local-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
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
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 1000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
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
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          revMap: {},
          metaRev: 'meta-rev-1',
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 1500,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
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
      await service.uploadAll(true);
      expect(mockMetaModelCtrl.save).toHaveBeenCalled();
      expect(mockMetaSyncService.upload).toHaveBeenCalled();
      expect(mockMetaModelCtrl.save).toHaveBeenCalledWith({
        revMap: {},
        // lastUpdate: jasmine.any(Number),
        lastUpdate: 12345,
        lastSyncedUpdate: 1000,
        metaRev: 'meta-rev-1',
        modelVersions: {},
        crossModelVersion: 1,
      });
      expect(mockMetaSyncService.upload).toHaveBeenCalledWith(
        {
          revMap: {
            singleModel1: 'UPDATE_ALL_REV',
            singleModel2: 'UPDATE_ALL_REV',
          },
          lastUpdate: 1000,
          crossModelVersion: 1,
          modelVersions: {},
          mainModelData: { mainModel1: { id: 'mainModel1-data-id' } },
        },
        null,
      );
    });

    it('should handle single file sync provider', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;

      await service.uploadToRemote(
        {
          revMap: {},
          lastUpdate: 1000,
          modelVersions: {},
          crossModelVersion: 1,
          mainModelData: {},
        },
        {
          revMap: { tasks: 'rev1' },
          lastUpdate: 2000,
          modelVersions: {},
          crossModelVersion: 1,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev',
        },
        'meta-rev',
      );

      expect(mockPfapi.getAllSyncModelData).toHaveBeenCalled();
      expect(mockMetaSyncService.upload).toHaveBeenCalled();
    });

    it('should upload multiple files when models need updating', async () => {
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: ['singleModel2'],
      });
      mockModelSyncService.upload.and.returnValue(
        Promise.resolve('new-single-model-rev'),
      );

      await service._uploadToRemoteMULTI(
        {
          revMap: {},
          lastUpdate: 1000,
          modelVersions: {},
          crossModelVersion: 1,
          mainModelData: {},
        },
        {
          revMap: {},
          lastUpdate: 2000,
          modelVersions: {},
          crossModelVersion: 1,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev',
        },
        'meta-rev',
      );

      expect(mockModelSyncService.upload).toHaveBeenCalledWith('singleModel1', {
        id: 'singleModel1-data-id',
      });
      expect(mockModelSyncService.remove).toHaveBeenCalledWith('singleModel2');
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith({
        lastUpdate: 2000,
        modelVersions: {},
        crossModelVersion: 1,
        lastSyncedUpdate: 2000,
        revMap: { singleModel1: 'new-single-model-rev' },
        metaRev: 'NEW-meta-rev-after-upload',
      });
    });
  });

  describe('download operations', () => {
    it('should download all data from remote', async () => {
      await service.downloadAll();
      expect(mockMetaSyncService.download).toHaveBeenCalled();
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalled();
    });

    it('should download only data in meta file for single file sync', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;
      await service.downloadToLocal(
        {
          revMap: {},
          lastUpdate: 2000,
          modelVersions: {},
          crossModelVersion: 1,
          mainModelData: {},
        },
        {
          revMap: {},
          lastUpdate: 1000,
          modelVersions: {},
          crossModelVersion: 1,
          lastSyncedUpdate: 1000,
          metaRev: 'local-meta-rev',
        },
        'expected-new-meta-rev',
      );

      expect(mockModelSyncService.updateLocalFromRemoteMetaFile).toHaveBeenCalledWith({
        revMap: {},
        lastUpdate: 2000,
        modelVersions: {},
        crossModelVersion: 1,
        mainModelData: {},
      });
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalledWith({
        lastUpdate: 2000,
        crossModelVersion: 1,
        modelVersions: {},
        revMap: {},
        lastSyncedUpdate: 2000,
        metaRev: 'expected-new-meta-rev',
      });
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
        {
          revMap: { tasks: 'tasks-rev' },
          lastUpdate: 2000,
          modelVersions: {},
          crossModelVersion: 1,
          mainModelData: {},
        },
        {
          revMap: {},
          lastUpdate: 1000,
          modelVersions: {},
          crossModelVersion: 1,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev',
        },
        'new-meta-rev',
      );

      expect(mockModelSyncService.download).toHaveBeenCalledWith('tasks', 'tasks-rev');
      expect(mockModelSyncService.updateLocalUpdated).toHaveBeenCalled();
      expect(mockMetaSyncService.saveLocal).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------
  // -----------------------------------------------------
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
      // Setup for version mismatch
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1, // Local version
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 2, // Remote version is newer
            mainModelData: {},
          },
          remoteMetaRev: 'meta-rev-2',
        }),
      );

      // Execute & Verify
      await expectAsync(service.sync()).toBeRejectedWithError(
        ModelVersionToImportNewerThanLocalError,
      );
    });

    it('should handle RevMismatchForModelError during download', async () => {
      // Setup for a rev mismatch error
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: [],
      });
      mockModelSyncService.download.and.throwError(
        new RevMismatchForModelError('singleModel1'),
      );

      // Execute & Verify
      await expectAsync(
        service._downloadToLocalMULTI(
          {
            revMap: { singleModel1: 'rev-wrong' },
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
          {
            revMap: {},
            lastUpdate: 1000,
            modelVersions: {},
            crossModelVersion: 1,
            lastSyncedUpdate: 1000,
            metaRev: 'meta-rev',
          },
          'meta-rev-2',
        ),
      ).toBeRejectedWithError();
    });

    it('should handle connection errors during sync', async () => {
      // Setup for network error
      const connectionError = new Error('Network error');
      mockMetaSyncService.getRev.and.throwError(connectionError);

      // Execute & Verify
      await expectAsync(service.sync()).toBeRejected();
    });

    it('should handle errors when sync provider is not set', async () => {
      // Setup missing sync provider
      mockSyncProvider$.next(null);

      // Execute & Verify
      await expectAsync(service.sync()).toBeRejected();
    });

    it('should handle errors when sync provider is not ready', async () => {
      // Setup provider not ready
      mockSyncProvider.isReady.and.returnValue(Promise.resolve(false));

      // Execute & Verify
      await expectAsync(service.sync()).toBeResolvedTo({
        status: SyncStatus.NotConfigured,
      });
    });

    it('should reject when trying to upload with no provider', async () => {
      // Setup
      mockSyncProvider$.next(null);

      // Execute & Verify
      await expectAsync(service.uploadAll()).toBeRejectedWithError();
    });

    it('should return conflict for conflict', async () => {
      // Setup conflict
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          revMap: { singleModel1: 'local-rev' },
          metaRev: 'meta-rev-1',
          modelVersions: { singleModel1: 1 },
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: { singleModel1: 'remote-rev' },
            lastUpdate: 1500,
            modelVersions: { singleModel1: 1 },
            crossModelVersion: 1,
            mainModelData: { mainModel1: { id: 'remote-data' } },
          },
          remoteMetaRev: 'meta-rev-2',
        }),
      );

      // First detect conflict
      const syncResult = await service.sync();
      expect(syncResult.status).toBe(SyncStatus.Conflict);

      // Then resolve with local
      spyOn(service, 'uploadToRemote').and.returnValue(Promise.resolve());
    });

    it('should return conflict for conflict 2', async () => {
      // Setup conflict
      mockMetaModelCtrl.load.and.returnValue(
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          revMap: { singleModel1: 'local-rev' },
          metaRev: 'meta-rev-1',
          modelVersions: { singleModel1: 1 },
          crossModelVersion: 1,
        }),
      );
      mockMetaSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: { singleModel1: 'remote-rev' },
            lastUpdate: 1500,
            modelVersions: { singleModel1: 1 },
            crossModelVersion: 1,
            mainModelData: { mainModel1: { id: 'remote-data' } },
          },
          remoteMetaRev: 'meta-rev-2',
        }),
      );

      // First detect conflict
      const syncResult = await service.sync();
      expect(syncResult.status).toBe(SyncStatus.Conflict);
    });
  });

  describe('upload error handling', () => {
    it('should handle errors during upload by rolling back', async () => {
      // Setup for error during upload
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: [],
      });
      const uploadError = new Error('Upload failed');
      mockModelSyncService.upload.and.throwError(uploadError);

      // Execute & Verify
      await expectAsync(
        service._uploadToRemoteMULTI(
          {
            revMap: {},
            lastUpdate: 1000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
          {
            revMap: {},
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            lastSyncedUpdate: 1000,
            metaRev: 'meta-rev',
          },
          'meta-rev',
        ),
      ).toBeRejected();

      // Verify metadata wasn't updated
      expect(mockMetaSyncService.saveLocal).not.toHaveBeenCalled();
    });

    it('should handle meta file upload failures', async () => {
      // Setup error on meta file upload
      mockMetaSyncService.upload.and.throwError(new Error('Meta upload failed'));

      // Execute & Verify
      await expectAsync(service.uploadAll()).toBeRejected();
    });
  });

  describe('download error handling', () => {
    it('should handle errors during download of individual models', async () => {
      // Setup for download error
      mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
        toUpdate: ['singleModel1'],
        toDelete: [],
      });
      mockModelSyncService.download.and.throwError(new Error('Download failed'));

      // Execute & Verify
      await expectAsync(
        service._downloadToLocalMULTI(
          {
            revMap: { singleModel1: 'rev1' },
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
          {
            revMap: {},
            lastUpdate: 1000,
            modelVersions: {},
            crossModelVersion: 1,
            lastSyncedUpdate: 1000,
            metaRev: 'meta-rev',
          },
          'meta-rev-2',
        ),
      ).toBeRejected();

      // Verify local state wasn't updated
      expect(mockMetaSyncService.saveLocal).not.toHaveBeenCalled();
    });

    it('should handle updateLocalFromRemoteMetaFile errors', async () => {
      mockSyncProvider.isLimitedToSingleFileSync = true;
      mockModelSyncService.updateLocalFromRemoteMetaFile.and.throwError(
        new Error('Update from meta failed'),
      );

      await expectAsync(
        service.downloadToLocal(
          {
            revMap: {},
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
          {
            revMap: {},
            lastUpdate: 1000,
            modelVersions: {},
            crossModelVersion: 1,
            lastSyncedUpdate: 1000,
            metaRev: 'meta-rev',
          },
          'meta-rev-2',
        ),
      ).toBeRejected();
    });
  });
});
