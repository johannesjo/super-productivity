import { ModelSyncService } from './model-sync.service';
import { MiniObservable } from '../util/mini-observable';
import { ModelCfg, RemoteMeta } from '../pfapi.model';
import { Pfapi } from '../pfapi';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import {
  NoRemoteModelFile,
  RevMapModelMismatchErrorOnUpload,
  RevMismatchForModelError,
} from '../errors/errors';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { SyncProviderId } from '../pfapi.const';

interface TestModel {
  data?: any;
}

type TestModelCfgs = {
  mainModel: ModelCfg<TestModel>;
  singleModel: ModelCfg<TestModel>;
};

describe('ModelSyncService', () => {
  let service: ModelSyncService<TestModelCfgs>;
  let mockModelControllers: any;
  let mockPfapi: Pfapi<TestModelCfgs>;
  let mockSyncProvider$: MiniObservable<SyncProviderServiceInterface<SyncProviderId> | null>;
  let mockEncryptAndCompressCfg$: MiniObservable<any>;
  let mockEncryptAndCompressHandler: jasmine.SpyObj<EncryptAndCompressHandlerService>;
  let mockSyncProvider: any;

  beforeEach(() => {
    // Setup mock model controllers
    mockModelControllers = {
      mainModel: {
        modelCfg: {
          isMainFileModel: true,
        },
        save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
      },
      singleModel: {
        modelCfg: {
          isMainFileModel: false,
        },
        save: jasmine.createSpy('save').and.returnValue(Promise.resolve()),
      },
    };

    // Setup mock PFAPI
    mockPfapi = {
      getAllSyncModelData: jasmine.createSpy('getAllSyncModelData').and.returnValue(
        Promise.resolve({
          mainModel: { data: 'main-data' },
          singleModel: { data: 'single-data' },
        }),
      ),
    } as unknown as Pfapi<TestModelCfgs>;

    // Setup sync provider
    mockSyncProvider = {
      uploadFile: jasmine
        .createSpy('uploadFile')
        .and.returnValue(Promise.resolve({ rev: 'new-rev-123' })),
      downloadFile: jasmine
        .createSpy('downloadFile')
        .and.returnValue(Promise.resolve('{"data":{"id":"downloaded-data"}}')),
      removeFile: jasmine.createSpy('removeFile').and.returnValue(Promise.resolve()),
      privateCfg: {
        load: jasmine.createSpy('load').and.returnValue(Promise.resolve({})),
      },
    };
    mockSyncProvider$ = new MiniObservable(mockSyncProvider);

    // Setup encrypt/compress config
    mockEncryptAndCompressCfg$ = new MiniObservable({
      isEncrypt: false,
      isCompress: true,
      encryptKey: 'test-key',
    });

    // Setup encryption handler
    mockEncryptAndCompressHandler = {
      compressAndEncryptData: jasmine
        .createSpy('compressAndEncryptData')
        .and.callFake((cfg, pwd, data) => Promise.resolve(JSON.stringify(data))),
      decompressAndDecryptData: jasmine
        .createSpy('decompressAndDecryptData')
        .and.callFake((cfg, pwd, dataStr) => Promise.resolve(JSON.parse(dataStr))),
      compressAndEncrypt: jasmine.createSpy('compressAndEncrypt'),
      decompressAndDecrypt: jasmine.createSpy('decompressAndDecrypt') as any,
    };

    // Create service
    service = new ModelSyncService(
      mockModelControllers,
      mockPfapi,
      mockSyncProvider$,
      mockEncryptAndCompressHandler,
      mockEncryptAndCompressCfg$,
    );

    // Mock console and alert
    spyOn(console, 'log').and.stub();
    // Alert is already mocked globally, just reset the spy
    if ((window.alert as jasmine.Spy).calls) {
      (window.alert as jasmine.Spy).calls.reset();
    }
  });

  describe('upload operations', () => {
    it('should upload model data to remote storage', async () => {
      const modelData = { data: 'test-model' };

      const result = await service.upload('singleModel', modelData);

      expect(result).toBe('new-rev-123');

      expect(mockEncryptAndCompressHandler.compressAndEncryptData).toHaveBeenCalledWith(
        mockEncryptAndCompressCfg$.value,
        undefined,
        modelData,
        0,
      );
      expect(mockSyncProvider.uploadFile).toHaveBeenCalledWith(
        'singleModel',
        jasmine.any(String),
        null,
        true,
      );
    });

    it('should upload model data with specified revision', async () => {
      const modelData = { data: 'test-model' };
      const localRev = 'local-rev-123';

      await service.upload('singleModel', modelData, localRev);

      expect(mockSyncProvider.uploadFile).toHaveBeenCalledWith(
        'singleModel',
        jasmine.any(String),
        localRev,
        true,
      );
    });

    it('should handle upload errors', async () => {
      const modelData = { data: 'test-model' };
      mockSyncProvider.uploadFile.and.throwError(new Error('Upload failed'));
      await expectAsync(service.upload('singleModel', modelData)).toBeRejected();
    });

    it('should handle RevMapModelMismatchErrorOnUpload', async () => {
      const modelData = { data: 'test-model' };
      mockSyncProvider.uploadFile.and.throwError(
        new RevMapModelMismatchErrorOnUpload('singleModel'),
      );
      await expectAsync(service.upload('singleModel', modelData)).toBeRejectedWithError(
        RevMapModelMismatchErrorOnUpload,
      );
    });
  });

  describe('download operations', () => {
    it('should download model data from remote storage', async () => {
      mockSyncProvider.downloadFile.and.returnValue(
        Promise.resolve({
          rev: 'rev-123',
          dataStr: JSON.stringify({ data: 'remote-model-data' }),
        } satisfies { rev: string; dataStr: string }),
      );

      const result = await service.download('singleModel', 'rev-123');

      expect(result.data).toEqual({
        data: 'remote-model-data',
      });
      expect(result.rev).toBe('rev-123');
      expect(mockSyncProvider.downloadFile).toHaveBeenCalledWith('singleModel');
    });

    it('should handle NoRemoteModelFile error', async () => {
      mockSyncProvider.downloadFile.and.throwError(new NoRemoteModelFile('singleModel'));

      await expectAsync(service.download('singleModel', 'rev-123')).toBeRejectedWithError(
        NoRemoteModelFile,
      );
    });

    it('should handle RevMismatchForModelError', async () => {
      mockSyncProvider.downloadFile.and.returnValue(
        Promise.resolve({
          rev: 'different-rev',
          dataStr: JSON.stringify({ data: 'remote-model-data' }),
        }),
      );

      await expectAsync(service.download('singleModel', 'rev-123')).toBeRejectedWithError(
        RevMismatchForModelError,
      );
    });

    it('should allow download when remote revision is newer than expected', async () => {
      const expectedRev = '2025-01-01T12:00:00.000Z';
      // Remote file is NEWER than what we expected
      const remoteRev = '2025-01-01T13:00:00.000Z';

      mockSyncProvider.downloadFile.and.returnValue(
        Promise.resolve({
          rev: remoteRev,
          dataStr: JSON.stringify({ data: 'remote-model-data' }),
        }),
      );

      const result = await service.download('singleModel', expectedRev);
      expect(result.rev).toBe(remoteRev);
      expect(result.data).toEqual({
        data: 'remote-model-data',
      });
    });
  });

  describe('updateLocalUpdated', () => {
    it('should update local models with downloaded data', async () => {
      const dataMap = {
        mainModel: { data: 'updated-main-data' },
        singleModel: { data: 'updated-single-data' },
      };

      await service.updateLocalUpdated(['mainModel', 'singleModel'], [], dataMap);

      expect(mockModelControllers.mainModel.save).toHaveBeenCalledWith(
        {
          data: 'updated-main-data',
        },
        {
          isUpdateRevAndLastUpdate: true,
          isIgnoreDBLock: true,
        },
      );
      expect(mockModelControllers.singleModel.save).toHaveBeenCalledWith(
        {
          data: 'updated-single-data',
        },
        {
          isUpdateRevAndLastUpdate: true,
          isIgnoreDBLock: true,
        },
      );
    });

    it('should handle errors during local update', async () => {
      const dataMap = { singleModel: { data: 'updated-single-data' } };
      mockModelControllers.singleModel.save.and.throwError(new Error('Save failed'));

      await expectAsync(
        service.updateLocalUpdated(['singleModel'], [], dataMap),
      ).toBeRejected();
    });
  });

  describe('updateLocalFromRemoteMetaFile', () => {
    it('should update local models from main model data in meta file', async () => {
      const remoteMeta = {
        revMap: {},
        lastUpdate: 1000,
        crossModelVersion: 1,
        mainModelData: {
          mainModel: { data: 'meta-main-model-data' },
        },
      };

      await service.updateLocalMainModelsFromRemoteMetaFile({
        ...remoteMeta,
      } as RemoteMeta);

      expect(mockModelControllers.mainModel.save).toHaveBeenCalledWith(
        {
          data: 'meta-main-model-data',
        },
        {
          isUpdateRevAndLastUpdate: false,
          isIgnoreDBLock: true,
        },
      );
      expect(mockModelControllers.singleModel.save).not.toHaveBeenCalled();
    });

    it('should do nothing if no main model data is present', async () => {
      const remoteMeta = {
        revMap: {},
        lastUpdate: 1000,
        crossModelVersion: 1,
        mainModelData: {},
      };

      await service.updateLocalMainModelsFromRemoteMetaFile({
        ...remoteMeta,
      } as RemoteMeta);

      expect(mockModelControllers.mainModel.save).not.toHaveBeenCalled();
      expect(mockModelControllers.singleModel.save).not.toHaveBeenCalled();
    });

    it('should throw error for unregistered models to prevent data loss', async () => {
      const remoteMeta = {
        revMap: {},
        lastUpdate: 1000,
        crossModelVersion: 1,
        mainModelData: {
          unknownModel: { data: 'unknown-model-data' },
        },
      };

      // Should throw ModelIdWithoutCtrlError
      await expectAsync(
        service.updateLocalMainModelsFromRemoteMetaFile({
          ...remoteMeta,
        } as RemoteMeta),
      ).toBeRejectedWithError(/Remote metadata contains models not registered locally/);

      // No saves should have been called due to early error
      expect(mockModelControllers.mainModel.save).not.toHaveBeenCalled();
      expect(mockModelControllers.singleModel.save).not.toHaveBeenCalled();
    });

    it('should throw error listing all unregistered models', async () => {
      const remoteMeta = {
        revMap: {},
        lastUpdate: 1000,
        crossModelVersion: 1,
        mainModelData: {
          unknownModel1: { data: 'unknown-1' },
          unknownModel2: { data: 'unknown-2' },
          unknownModel3: { data: 'unknown-3' },
        },
      };

      // Should throw with all model IDs listed
      await expectAsync(
        service.updateLocalMainModelsFromRemoteMetaFile({
          ...remoteMeta,
        } as RemoteMeta),
      ).toBeRejectedWithError(/unknownModel1, unknownModel2, unknownModel3/);

      // No saves should have been called
      expect(mockModelControllers.mainModel.save).not.toHaveBeenCalled();
      expect(mockModelControllers.singleModel.save).not.toHaveBeenCalled();
    });

    it('should throw error when mix of valid and invalid models to prevent partial sync', async () => {
      const remoteMeta = {
        revMap: {},
        lastUpdate: 1000,
        crossModelVersion: 1,
        mainModelData: {
          mainModel: { data: 'valid-main-model' },
          unknownModel: { data: 'unknown-model-data' },
          singleModel: { data: 'valid-single-model' },
        },
      };

      // Should throw error even with valid models present
      await expectAsync(
        service.updateLocalMainModelsFromRemoteMetaFile({
          ...remoteMeta,
        } as RemoteMeta),
      ).toBeRejectedWithError(/unknownModel/);

      // No saves should have been called to prevent partial data sync
      expect(mockModelControllers.mainModel.save).not.toHaveBeenCalled();
      expect(mockModelControllers.singleModel.save).not.toHaveBeenCalled();
    });
  });

  describe('getMainFileModelDataForUpload', () => {
    it('should collect all main model data', async () => {
      const allData = {
        mainModel: { data: 'main-data-for-upload' },
        singleModel: { data: 'single-data-for-upload' },
      };

      const result = await service.getMainFileModelDataForUpload(allData);

      expect(result).toEqual({
        mainModel: { data: 'main-data-for-upload' },
      });
      expect(result.singleModel).toBeUndefined();
    });

    it('should fetch all sync model data when not provided', async () => {
      await service.getMainFileModelDataForUpload();

      expect(mockPfapi.getAllSyncModelData).toHaveBeenCalled();
    });
  });

  describe('getModelIdsToUpdateFromRevMaps', () => {
    it('should not include main models', () => {
      const revMapNewer = {
        mainModel: 'rev-1-new',
        singleModel: 'rev-2-new',
      };
      const revMapToOverwrite = {
        mainModel: 'rev-1',
        singleModel: 'rev-2',
      };
      const result = service.getModelIdsToUpdateFromRevMaps({
        revMapNewer,
        revMapToOverwrite,
        errorContext: 'UPLOAD',
      });

      expect(result.toUpdate).toEqual(['singleModel']);
      expect(result.toDelete).toEqual([]);
    });

    it('should filter out non existing models (maybe local data is not up to date)', () => {
      const revMapNewer = {
        mainModel: 'rev-1-new',
        singleModel: 'rev-2-new',
        nonExistingModel: 'rev-3-new',
        nonExistingModel2: 'rev-3-new',
      };
      const revMapToOverwrite = {
        mainModel: 'rev-1',
        singleModel: 'rev-2',
      };
      const result = service.getModelIdsToUpdateFromRevMaps({
        revMapNewer,
        revMapToOverwrite,
        errorContext: 'UPLOAD',
      });

      expect(result.toUpdate).toEqual(['singleModel']);
      expect(result.toDelete).toEqual([]);
    });

    it('should identify models that need to be deleted', () => {
      const revMapNewer = {
        mainModel: 'rev-1',
      };
      const revMapToOverwrite = {
        mainModel: 'rev-1',
        singleModel: 'rev-2',
      };
      const result = service.getModelIdsToUpdateFromRevMaps({
        revMapNewer,
        revMapToOverwrite,
        errorContext: 'UPLOAD',
      });

      expect(result.toUpdate).toEqual([]);
      expect(result.toDelete).toEqual(['singleModel']);
    });
  });

  describe('remove', () => {
    it('should remove a model from remote storage', async () => {
      await service.remove('singleModel');

      expect(mockSyncProvider.removeFile).toHaveBeenCalledWith('singleModel');
    });

    it('should handle errors during model removal', async () => {
      mockSyncProvider.removeFile.and.throwError(new Error('Remove failed'));

      await expectAsync(service.remove('singleModel')).toBeRejected();
    });
  });

  describe('error handling', () => {
    it('should handle invalid model IDs', async () => {
      // @ts-ignore - Testing runtime error with invalid type
      await expectAsync(service.upload(123, {})).toBeRejected();
    });

    it('should handle missing sync provider', async () => {
      mockSyncProvider$.next(null);

      await expectAsync(service.upload('singleModel', { data: 'test' })).toBeRejected();
    });
  });
});
