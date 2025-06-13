import { Webdav, WebdavPrivateCfg } from './webdav';
import { WebdavApi } from './webdav-api';
import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import {
  InvalidDataSPError,
  MissingCredentialsSPError,
  NoRevAPIError,
} from '../../../errors/errors';

describe('Webdav', () => {
  let webdav: Webdav;
  let mockWebdavApi: jasmine.SpyObj<WebdavApi>;
  let mockPrivateCfgStore: jasmine.SpyObj<
    SyncProviderPrivateCfgStore<SyncProviderId.WebDAV>
  >;

  const mockCfg: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  beforeEach(() => {
    mockWebdavApi = jasmine.createSpyObj('WebdavApi', [
      'getFileMeta',
      'upload',
      'download',
      'remove',
    ]);

    mockPrivateCfgStore = jasmine.createSpyObj('SyncProviderPrivateCfgStore', [
      'load',
      'save',
    ]);

    webdav = new Webdav();
    webdav.privateCfg = mockPrivateCfgStore;

    // Replace the private _api with our mock
    (webdav as any)._api = mockWebdavApi;
  });

  describe('constructor', () => {
    it('should initialize with correct id and properties', () => {
      expect(webdav.id).toBe(SyncProviderId.WebDAV);
      expect(webdav.isUploadForcePossible).toBe(false);
      expect(webdav.maxConcurrentRequests).toBe(10);
    });

    it('should accept optional extraPath parameter', () => {
      const webdavWithExtraPath = new Webdav('extra/path');
      expect(webdavWithExtraPath).toBeDefined();
    });
  });

  describe('isReady', () => {
    it('should return true when all required config fields are present', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(mockCfg));

      const result = await webdav.isReady();

      expect(result).toBe(true);
      expect(mockPrivateCfgStore.load).toHaveBeenCalled();
    });

    it('should return false when config is null', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));

      const result = await webdav.isReady();

      expect(result).toBe(false);
    });

    it('should return false when userName is missing', async () => {
      const incompleteCfg = { ...mockCfg, userName: '' };
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(incompleteCfg));

      const result = await webdav.isReady();

      expect(result).toBe(false);
    });

    it('should return false when baseUrl is missing', async () => {
      const incompleteCfg = { ...mockCfg, baseUrl: '' };
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(incompleteCfg));

      const result = await webdav.isReady();

      expect(result).toBe(false);
    });

    it('should return false when syncFolderPath is missing', async () => {
      const incompleteCfg = { ...mockCfg, syncFolderPath: '' };
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(incompleteCfg));

      const result = await webdav.isReady();

      expect(result).toBe(false);
    });

    it('should return false when password is missing', async () => {
      const incompleteCfg = { ...mockCfg, password: '' };
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(incompleteCfg));

      const result = await webdav.isReady();

      expect(result).toBe(false);
    });
  });

  describe('setPrivateCfg', () => {
    it('should save the config to the store', async () => {
      mockPrivateCfgStore.save.and.returnValue(Promise.resolve());

      await webdav.setPrivateCfg(mockCfg);

      expect(mockPrivateCfgStore.save).toHaveBeenCalledWith(mockCfg);
    });
  });

  describe('getFileRev', () => {
    beforeEach(() => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(mockCfg));
    });

    it('should return file revision from metadata', async () => {
      const expectedEtag = 'etag-123';
      mockWebdavApi.getFileMeta.and.returnValue(
        Promise.resolve({ etag: expectedEtag } as any),
      );

      const result = await webdav.getFileRev('test.txt', 'local-rev');

      expect(result).toEqual({ rev: expectedEtag });
      expect(mockWebdavApi.getFileMeta).toHaveBeenCalledWith(
        '/sync/test.txt',
        'local-rev',
      );
    });

    it('should build correct file path with extraPath', async () => {
      const webdavWithExtraPath = new Webdav('extra/path');
      webdavWithExtraPath.privateCfg = mockPrivateCfgStore;
      (webdavWithExtraPath as any)._api = mockWebdavApi;

      mockWebdavApi.getFileMeta.and.returnValue(
        Promise.resolve({ etag: 'etag-123' } as any),
      );

      await webdavWithExtraPath.getFileRev('test.txt', null);

      expect(mockWebdavApi.getFileMeta).toHaveBeenCalledWith(
        '/sync/extra/path/test.txt',
        null,
      );
    });

    it('should throw MissingCredentialsSPError when config is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));

      await expectAsync(webdav.getFileRev('test.txt', null)).toBeRejectedWith(
        jasmine.any(MissingCredentialsSPError),
      );
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(mockCfg));
    });

    it('should upload file and return revision', async () => {
      const expectedEtag = 'new-etag-123';
      mockWebdavApi.upload.and.returnValue(Promise.resolve(expectedEtag));

      const result = await webdav.uploadFile('test.txt', 'file content', 'local-rev');

      expect(result).toEqual({ rev: expectedEtag });
      expect(mockWebdavApi.upload).toHaveBeenCalledWith({
        path: '/sync/test.txt',
        data: 'file content',
        isOverwrite: false,
        expectedEtag: 'local-rev',
      });
    });

    it('should handle force overwrite correctly', async () => {
      mockWebdavApi.upload.and.returnValue(Promise.resolve('etag-123'));

      await webdav.uploadFile('test.txt', 'content', 'local-rev', true);

      expect(mockWebdavApi.upload).toHaveBeenCalledWith({
        path: '/sync/test.txt',
        data: 'content',
        isOverwrite: true,
        expectedEtag: null,
      });
    });

    it('should throw NoRevAPIError when upload returns no etag', async () => {
      mockWebdavApi.upload.and.returnValue(Promise.resolve(undefined));

      await expectAsync(
        webdav.uploadFile('test.txt', 'content', 'local-rev'),
      ).toBeRejectedWith(jasmine.any(NoRevAPIError));
    });

    it('should handle empty file content', async () => {
      mockWebdavApi.upload.and.returnValue(Promise.resolve('etag-123'));

      const result = await webdav.uploadFile('test.txt', '', 'local-rev');

      expect(result).toEqual({ rev: 'etag-123' });
      expect(mockWebdavApi.upload).toHaveBeenCalledWith({
        path: '/sync/test.txt',
        data: '',
        isOverwrite: false,
        expectedEtag: 'local-rev',
      });
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(mockCfg));
    });

    it('should download file and return data with revision', async () => {
      const mockResponse = {
        rev: 'etag-123',
        dataStr: 'file content',
      };
      mockWebdavApi.download.and.returnValue(Promise.resolve(mockResponse));

      const result = await webdav.downloadFile('test.txt', 'local-rev');

      expect(result).toEqual(mockResponse);
      expect(mockWebdavApi.download).toHaveBeenCalledWith({
        path: '/sync/test.txt',
        localRev: 'local-rev',
      });
    });

    it('should handle __meta_ file specially by not sending localRev', async () => {
      const mockResponse = {
        rev: 'meta-etag',
        dataStr: '{"meta": "data"}',
      };
      mockWebdavApi.download.and.returnValue(Promise.resolve(mockResponse));

      const result = await webdav.downloadFile('__meta_', 'local-rev');

      expect(result).toEqual(mockResponse);
      expect(mockWebdavApi.download).toHaveBeenCalledWith({
        path: '/sync/__meta_',
        localRev: null,
      });
    });

    it('should handle 304 Not Modified response', async () => {
      const notModifiedError = new Error('Not Modified');
      (notModifiedError as any).status = 304;

      const mockResponse = {
        rev: 'etag-123',
        dataStr: 'file content',
      };

      mockWebdavApi.download.and
        .returnValue(Promise.reject(notModifiedError))
        .withArgs({ path: '/sync/test.txt', localRev: null })
        .and.returnValue(Promise.resolve(mockResponse));

      const result = await webdav.downloadFile('test.txt', 'local-rev');

      expect(result).toEqual(mockResponse);
      expect(mockWebdavApi.download).toHaveBeenCalledTimes(2);
      expect(mockWebdavApi.download).toHaveBeenCalledWith({
        path: '/sync/test.txt',
        localRev: 'local-rev',
      });
      expect(mockWebdavApi.download).toHaveBeenCalledWith({
        path: '/sync/test.txt',
        localRev: null,
      });
    });

    it('should throw InvalidDataSPError for null data', async () => {
      mockWebdavApi.download.and.returnValue(
        Promise.resolve({ rev: 'etag-123', dataStr: null as any }),
      );

      await expectAsync(webdav.downloadFile('test.txt', 'local-rev')).toBeRejectedWith(
        jasmine.any(InvalidDataSPError),
      );
    });

    it('should throw NoRevAPIError when rev is not a string', async () => {
      mockWebdavApi.download.and.returnValue(
        Promise.resolve({ rev: undefined as any, dataStr: 'content' }),
      );

      await expectAsync(webdav.downloadFile('test.txt', 'local-rev')).toBeRejectedWith(
        jasmine.any(NoRevAPIError),
      );
    });

    it('should handle empty string data as valid', async () => {
      const mockResponse = {
        rev: 'etag-123',
        dataStr: '',
      };
      mockWebdavApi.download.and.returnValue(Promise.resolve(mockResponse));

      const result = await webdav.downloadFile('test.txt', 'local-rev');

      expect(result).toEqual(mockResponse);
    });

    it('should rethrow non-304 errors', async () => {
      const genericError = new Error('Network error');
      mockWebdavApi.download.and.returnValue(Promise.reject(genericError));

      await expectAsync(webdav.downloadFile('test.txt', 'local-rev')).toBeRejectedWith(
        genericError,
      );
    });
  });

  describe('removeFile', () => {
    beforeEach(() => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(mockCfg));
    });

    it('should remove file successfully', async () => {
      mockWebdavApi.remove.and.returnValue(Promise.resolve());

      await webdav.removeFile('test.txt');

      expect(mockWebdavApi.remove).toHaveBeenCalledWith('/sync/test.txt');
    });

    it('should build correct path with extraPath', async () => {
      const webdavWithExtraPath = new Webdav('extra/path');
      webdavWithExtraPath.privateCfg = mockPrivateCfgStore;
      (webdavWithExtraPath as any)._api = mockWebdavApi;

      mockWebdavApi.remove.and.returnValue(Promise.resolve());

      await webdavWithExtraPath.removeFile('test.txt');

      expect(mockWebdavApi.remove).toHaveBeenCalledWith('/sync/extra/path/test.txt');
    });

    it('should propagate errors from API', async () => {
      const error = new Error('Delete failed');
      mockWebdavApi.remove.and.returnValue(Promise.reject(error));

      await expectAsync(webdav.removeFile('test.txt')).toBeRejectedWith(error);
    });
  });

  describe('_getFilePath', () => {
    it('should normalize multiple slashes', () => {
      const path = (webdav as any)._getFilePath('test.txt', {
        ...mockCfg,
        syncFolderPath: '/sync//folder/',
      });

      expect(path).toBe('/sync/folder/test.txt');
    });

    it('should handle paths without leading slashes', () => {
      const path = (webdav as any)._getFilePath('test.txt', {
        ...mockCfg,
        syncFolderPath: 'sync/folder',
      });

      expect(path).toBe('sync/folder/test.txt');
    });

    it('should include extraPath when present', () => {
      const webdavWithExtraPath = new Webdav('extra/path');
      const path = (webdavWithExtraPath as any)._getFilePath('test.txt', mockCfg);

      expect(path).toBe('/sync/extra/path/test.txt');
    });

    it('should handle empty syncFolderPath', () => {
      const path = (webdav as any)._getFilePath('test.txt', {
        ...mockCfg,
        syncFolderPath: '',
      });

      expect(path).toBe('/test.txt');
    });
  });
});
