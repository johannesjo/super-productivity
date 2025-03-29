import { SyncService } from './sync.service';
import { SyncProviderId, SyncStatus } from '../pfapi.const';
import { MiniObservable } from '../util/mini-observable';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { ModelSyncService } from './model-sync.service';
import { MetaFileSyncService } from './meta-file-sync.service';
import { ModelCfg } from '../pfapi.model';
import { Pfapi } from '../pfapi';

interface FakeModel {
  id: string;
  data: any;
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
  let mockEncryptAndCompressHandler: any;
  let mockSyncProvider: any;
  let mockMetaFileSyncService: jasmine.SpyObj<MetaFileSyncService>;
  let mockModelSyncService: jasmine.SpyObj<ModelSyncService<any>>;

  beforeEach(() => {
    // Setup mock model controllers
    mockModelControllers = {
      tasks: {
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
      settings: {
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
    };

    // Setup mock PFAPI
    mockPfapi = {
      getAllSyncModelData: jasmine.createSpy('getAllSyncModelData').and.returnValue(
        Promise.resolve({
          mainModel1: { id: 'mainModel1-data-id' },
          mainModel2: { id: 'mainModel2-data-id' },
          singleModel1: { id: 'singleModel1-data-id' },
          singleModel2: { id: 'singleModel2-data-id' },
        }),
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
    mockMetaModelCtrl = jasmine.createSpyObj('MetaModelCtrl', [
      'loadMetaModel',
      'saveMetaModel',
    ]);
    mockMetaModelCtrl.loadMetaModel.and.returnValue(
      Promise.resolve({
        clientId: 'test-client-id',
        revMap: {},
        lastSyncedRemoteRev: 'meta-rev-1',
        lastUpdate: 1000,
        lastSyncedUpdate: 1000,
        metaRev: 'meta-rev-1',
        modelVersions: {},
        crossModelVersion: 1,
      }),
    );

    // Setup encryption handler
    mockEncryptAndCompressHandler = {
      compressAndEncrypt: jasmine
        .createSpy('compressAndEncrypt')
        .and.callFake(({ data }) => Promise.resolve(JSON.stringify(data))),
      decompressAndDecrypt: jasmine
        .createSpy('decompressAndDecrypt')
        .and.callFake(({ dataStr }) =>
          Promise.resolve({ data: JSON.parse(dataStr), version: 1 }),
        ),
    };

    // Setup MetaFileSyncService mock
    mockMetaFileSyncService = jasmine.createSpyObj('MetaFileSyncService', [
      'download',
      'upload',
      'getRev',
      'lock',
      'saveLocal',
    ]);
    mockMetaFileSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1'));
    mockMetaFileSyncService.download.and.returnValue(
      Promise.resolve({
        remoteMeta: {
          revMap: {},
          lastUpdate: 1000,
          modelVersions: {},
          crossModelVersion: 1,
          mainModelData: { settings: { id: 'settings-data' } },
        },
        remoteMetaRev: 'meta-rev-1',
      }),
    );

    mockMetaFileSyncService.upload.and.returnValue(Promise.resolve('new-meta-rev'));

    // Setup ModelSyncService mock
    mockModelSyncService = jasmine.createSpyObj('ModelSyncService', [
      'upload',
      'download',
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
        settings: { id: 'settings-data' },
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
    service['_metaFileSyncService'] = mockMetaFileSyncService;
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
      mockMetaModelCtrl.loadMetaModel.and.returnValue(
        Promise.resolve({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaFileSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1'));

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.InSync);
      expect(mockMetaFileSyncService.download).not.toHaveBeenCalled();
    });

    it('should return inSync if revs match', async () => {
      // Setup for remote newer
      mockMetaModelCtrl.loadMetaModel.and.returnValue(
        Promise.resolve({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaFileSyncService.download.and.returnValue(
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
      mockMetaFileSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-1'));

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.InSync);
      expect(mockMetaFileSyncService.saveLocal).not.toHaveBeenCalled();
    });

    it('should update local data when remote is newer', async () => {
      // Setup for remote newer
      mockMetaModelCtrl.loadMetaModel.and.returnValue(
        Promise.resolve({
          lastUpdate: 1000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaFileSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 2000,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
          remoteMetaRev: 'meta-rev-2',
        }),
      );
      mockMetaFileSyncService.getRev.and.returnValue(Promise.resolve('meta-rev-2'));

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.UpdateLocal);
      expect(mockMetaFileSyncService.saveLocal).toHaveBeenCalled();
    });

    it('should update remote when local is newer even if rev is equal', async () => {
      // Setup for local newer
      mockMetaModelCtrl.loadMetaModel.and.returnValue(
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          metaRev: 'meta-rev-1',
          revMap: {},
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaFileSyncService.download.and.returnValue(
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
      expect(mockMetaFileSyncService.upload).toHaveBeenCalled();
    });

    it('should handle conflicts', async () => {
      // Setup for conflict
      mockMetaModelCtrl.loadMetaModel.and.returnValue(
        Promise.resolve({
          lastUpdate: 2000,
          lastSyncedUpdate: 1000,
          revMap: {},
          metaRev: 'meta-rev-1',
          modelVersions: {},
          crossModelVersion: 1,
        }),
      );
      mockMetaFileSyncService.download.and.returnValue(
        Promise.resolve({
          remoteMeta: {
            revMap: {},
            lastUpdate: 1500,
            modelVersions: {},
            crossModelVersion: 1,
            mainModelData: {},
          },
          remoteMetaRev: 'meta-rev-1',
        }),
      );

      const result = await service.sync();

      expect(result.status).toBe(SyncStatus.Conflict);
      expect(result.conflictData).toBeDefined();
    });
  });
  //
  // describe('upload operations', () => {
  //   beforeEach(() => {
  //     mockMetaFileSyncService.upload.and.returnValue(Promise.resolve('new-meta-rev'));
  //   });
  //
  //   it('should upload all data with force flag', async () => {
  //     await service.uploadAll(true);
  //
  //     expect(mockMetaModelCtrl.saveMetaModel).toHaveBeenCalled();
  //     expect(mockMetaFileSyncService.upload).toHaveBeenCalled();
  //   });
  //
  //   it('should handle single file sync provider', async () => {
  //     mockSyncProvider.isLimitedToSingleFileSync = true;
  //
  //     await service.uploadToRemote(
  //       {
  //         revMap: {},
  //         lastUpdate: 1000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         mainModelData: {},
  //       },
  //       {
  //         revMap: { tasks: 'rev1' },
  //         lastUpdate: 2000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         lastSyncedUpdate: 1000,
  //         metaRev: 'meta-rev',
  //       },
  //       'meta-rev',
  //     );
  //
  //     expect(mockPfapi.getAllSyncModelData).toHaveBeenCalled();
  //     expect(mockMetaFileSyncService.upload).toHaveBeenCalled();
  //   });
  //
  //   it('should upload multiple files when models need updating', async () => {
  //     mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
  //       toUpdate: ['tasks'],
  //       toDelete: [],
  //     });
  //     mockModelSyncService.upload.and.returnValue(Promise.resolve('new-rev'));
  //
  //     await service._uploadToRemoteMULTI(
  //       {
  //         revMap: {},
  //         lastUpdate: 1000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         mainModelData: {},
  //       },
  //       {
  //         revMap: { tasks: 'rev1' },
  //         lastUpdate: 2000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         lastSyncedUpdate: 1000,
  //         metaRev: 'meta-rev',
  //       },
  //       'meta-rev',
  //     );
  //
  //     expect(mockMetaFileSyncService.lock).toHaveBeenCalled();
  //     expect(mockModelSyncService.upload).toHaveBeenCalledWith('tasks', {
  //       id: 'tasks-data',
  //     });
  //     expect(mockMetaFileSyncService.upload).toHaveBeenCalled();
  //     expect(mockMetaFileSyncService.saveLocal).toHaveBeenCalled();
  //   });
  // });
  //
  // describe('download operations', () => {
  //   it('should download all data from remote', async () => {
  //     await service.downloadAll();
  //
  //     expect(mockMetaFileSyncService.download).toHaveBeenCalled();
  //     expect(mockMetaFileSyncService.saveLocal).toHaveBeenCalled();
  //   });
  //
  //   it('should download only data in meta file for single file sync', async () => {
  //     mockSyncProvider.isLimitedToSingleFileSync = true;
  //
  //     await service.downloadToLocal(
  //       {
  //         revMap: { tasks: 'rev1-remote' },
  //         lastUpdate: 2000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         mainModelData: { tasks: { id: 'remote-tasks' } },
  //       },
  //       {
  //         revMap: {},
  //         lastUpdate: 1000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         lastSyncedUpdate: 1000,
  //         metaRev: 'meta-rev',
  //       },
  //       'new-meta-rev',
  //     );
  //
  //     expect(mockModelSyncService.updateLocalFromRemoteMetaFile).toHaveBeenCalled();
  //     expect(mockMetaFileSyncService.saveLocal).toHaveBeenCalled();
  //   });
  //
  //   it('should download multiple files when needed', async () => {
  //     mockModelSyncService.getModelIdsToUpdateFromRevMaps.and.returnValue({
  //       toUpdate: ['tasks'],
  //       toDelete: [],
  //     });
  //     mockModelSyncService.download.and.returnValue(
  //       Promise.resolve({
  //         data: { id: 'tasks-remote' },
  //         rev: 'tasks-rev-remote',
  //       }),
  //     );
  //
  //     await service._downloadToLocalMULTI(
  //       {
  //         revMap: { tasks: 'tasks-rev' },
  //         lastUpdate: 2000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         mainModelData: {},
  //       },
  //       {
  //         revMap: {},
  //         lastUpdate: 1000,
  //         modelVersions: {},
  //         crossModelVersion: 1,
  //         lastSyncedUpdate: 1000,
  //         metaRev: 'meta-rev',
  //       },
  //       'new-meta-rev',
  //     );
  //
  //     expect(mockModelSyncService.download).toHaveBeenCalledWith('tasks', 'tasks-rev');
  //     expect(mockModelSyncService.updateLocalUpdated).toHaveBeenCalled();
  //     expect(mockMetaFileSyncService.saveLocal).toHaveBeenCalled();
  //   });
  // });

  // describe('error handling', () => {
  //   it('should handle NoRemoteMetaFile errors by uploading all', async () => {
  //     mockMetaFileSyncService.download.and.throwError(new NoRemoteMetaFile());
  //     spyOn(service, 'uploadAll').and.returnValue(Promise.resolve());
  //     spyOn(window, 'alert').and.stub();
  //
  //     const result = await service.sync();
  //
  //     expect(result.status).toBe(SyncStatus.UpdateRemoteAll);
  //     expect(service.uploadAll).toHaveBeenCalledWith(true);
  //   });
  //
  //   it('should handle lock from local client errors', async () => {
  //     mockMetaFileSyncService.download.and.throwError(new LockFromLocalClientPresentError());
  //     spyOn(service, 'uploadAll').and.returnValue(Promise.resolve());
  //     spyOn(window, 'alert').and.stub();
  //
  //     const result = await service.sync();
  //
  //     expect(result.status).toBe(
});
