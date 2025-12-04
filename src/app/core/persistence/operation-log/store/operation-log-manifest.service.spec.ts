import { TestBed } from '@angular/core/testing';
import { OperationLogManifestService, OPS_DIR } from './operation-log-manifest.service';
import { SyncProviderServiceInterface } from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { RemoteFileNotFoundAPIError } from '../../../../pfapi/api/errors/errors';
import { OperationLogManifest } from '../operation.types';

describe('OperationLogManifestService', () => {
  let service: OperationLogManifestService;
  let mockSyncProvider: jasmine.SpyObj<SyncProviderServiceInterface<SyncProviderId>>;

  beforeEach(() => {
    mockSyncProvider = jasmine.createSpyObj('SyncProviderServiceInterface', [
      'downloadFile',
      'uploadFile',
    ]);

    TestBed.configureTestingModule({
      providers: [OperationLogManifestService],
    });
    service = TestBed.inject(OperationLogManifestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getManifestFileName', () => {
    it('should return the correct manifest file name', () => {
      expect(service.getManifestFileName()).toBe(OPS_DIR + 'manifest.json');
    });
  });

  describe('getManifestVersion', () => {
    it('should return version 1', () => {
      expect(service.getManifestVersion()).toBe(1);
    });
  });

  describe('createEmptyManifest', () => {
    it('should create an empty manifest with version 1', () => {
      const manifest = service.createEmptyManifest();
      expect(manifest).toEqual({
        version: 1,
        operationFiles: [],
      });
    });
  });

  describe('loadRemoteManifest', () => {
    it('should download and parse an existing manifest', async () => {
      const mockManifest: OperationLogManifest = {
        version: 1,
        operationFiles: ['op1.json', 'op2.json'],
      };
      const mockResponse = {
        dataStr: JSON.stringify(mockManifest),
      };
      mockSyncProvider.downloadFile.and.resolveTo(mockResponse as any);

      const result = await service.loadRemoteManifest(mockSyncProvider);
      expect(result).toEqual(mockManifest);
      expect(mockSyncProvider.downloadFile).toHaveBeenCalledWith(
        service.getManifestFileName(),
      );
    });

    it('should return an empty manifest if remote file is not found', async () => {
      mockSyncProvider.downloadFile.and.rejectWith(new RemoteFileNotFoundAPIError());

      const result = await service.loadRemoteManifest(mockSyncProvider);
      expect(result).toEqual(service.createEmptyManifest());
      expect(mockSyncProvider.downloadFile).toHaveBeenCalledWith(
        service.getManifestFileName(),
      );
    });

    it('should throw error for other download failures', async () => {
      const error = new Error('Network Error');
      mockSyncProvider.downloadFile.and.rejectWith(error);

      await expectAsync(service.loadRemoteManifest(mockSyncProvider)).toBeRejectedWith(
        error,
      );
    });
  });

  describe('uploadRemoteManifest', () => {
    it('should upload the manifest as a JSON string', async () => {
      const mockManifest: OperationLogManifest = {
        version: 1,
        operationFiles: ['op1.json'],
      };
      mockSyncProvider.uploadFile.and.resolveTo({} as any);

      await service.uploadRemoteManifest(mockSyncProvider, mockManifest);

      expect(mockSyncProvider.uploadFile).toHaveBeenCalledWith(
        service.getManifestFileName(),
        JSON.stringify(mockManifest),
        null,
        true,
      );
    });
  });
});
