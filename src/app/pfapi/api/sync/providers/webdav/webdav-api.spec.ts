/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav.model';
import { WebDavHttpAdapter } from './webdav-http-adapter';
import { WebdavXmlParser } from './webdav-xml-parser';
import {
  HttpNotOkAPIError,
  InvalidDataSPError,
  NoRevAPIError,
  RemoteFileChangedUnexpectedly,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';

describe('WebdavApi', () => {
  let api: WebdavApi;
  let mockGetCfg: jasmine.Spy;
  let mockHttpAdapter: jasmine.SpyObj<WebDavHttpAdapter>;
  let mockXmlParser: jasmine.SpyObj<WebdavXmlParser>;
  const mockCfg: WebdavPrivateCfg = {
    baseUrl: 'http://example.com/webdav',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
    encryptKey: '',
  };

  beforeEach(() => {
    mockGetCfg = jasmine
      .createSpy('getCfgOrError')
      .and.returnValue(Promise.resolve(mockCfg));
    api = new WebdavApi(mockGetCfg);

    // Access private properties for mocking
    mockHttpAdapter = jasmine.createSpyObj('WebDavHttpAdapter', ['request']);
    mockXmlParser = jasmine.createSpyObj('WebdavXmlParser', [
      'parseMultiplePropsFromXml',
      'validateResponseContent',
    ]);
    (api as any).httpAdapter = mockHttpAdapter;
    (api as any).xmlParser = mockXmlParser;
  });

  describe('getFileMeta', () => {
    it('should get file metadata successfully using PROPFIND', async () => {
      const mockResponse = {
        status: 207,
        headers: {},
        data: '<?xml version="1.0"?><multistatus/>',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      const mockFileMeta = {
        filename: 'test.txt',
        basename: 'test.txt',
        lastmod: 'Wed, 15 Jan 2025 10:00:00 GMT',
        size: 1234,
        type: 'file',
        etag: 'abc123',
        data: {},
      };
      mockXmlParser.parseMultiplePropsFromXml.and.returnValue([mockFileMeta]);

      const result = await api.getFileMeta('/test.txt', null);

      expect(mockHttpAdapter.request).toHaveBeenCalledWith({
        url: 'http://example.com/webdav/test.txt',
        method: 'PROPFIND',
        body: WebdavXmlParser.PROPFIND_XML,
        headers: jasmine.objectContaining({
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: '0',
        }),
      });

      expect(mockXmlParser.parseMultiplePropsFromXml).toHaveBeenCalledWith(
        '<?xml version="1.0"?><multistatus/>',
        '/test.txt',
      );

      expect(result).toEqual(mockFileMeta);
    });

    it('should throw RemoteFileNotFoundAPIError when PROPFIND returns non-207 status', async () => {
      const mockResponse = {
        status: 404,
        headers: {},
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.getFileMeta('/test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should throw RemoteFileNotFoundAPIError when no files parsed from response', async () => {
      const mockResponse = {
        status: 207,
        headers: {},
        data: '<?xml version="1.0"?><multistatus/>',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.parseMultiplePropsFromXml.and.returnValue([]);

      await expectAsync(api.getFileMeta('/test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle paths with special characters', async () => {
      const mockResponse = {
        status: 207,
        headers: {},
        data: '<?xml version="1.0"?><multistatus/>',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.parseMultiplePropsFromXml.and.returnValue([
        {
          filename: 'file with spaces.txt',
          basename: 'file with spaces.txt',
          lastmod: 'Wed, 15 Jan 2025 10:00:00 GMT',
          size: 100,
          type: 'file',
          etag: 'def456',
          data: {},
        },
      ]);

      await api.getFileMeta('/folder/file with spaces.txt', null);

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: 'http://example.com/webdav/folder/file%20with%20spaces.txt',
        }),
      );
    });

    it('should fall back to HEAD metadata when PROPFIND fails and fallback is enabled', async () => {
      const mockResponse = {
        status: 500,
        headers: {},
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      const headMeta = {
        filename: 'test.txt',
        basename: 'test.txt',
        lastmod: 'Wed, 15 Jan 2025 10:00:00 GMT',
        size: 42,
        type: 'file',
        etag: 'Wed, 15 Jan 2025 10:00:00 GMT',
        data: {},
      };
      const headSpy = spyOn<any>(api, '_getFileMetaViaHead').and.returnValue(
        Promise.resolve(headMeta),
      );

      const result = await api.getFileMeta('/test.txt', null, true);

      expect(headSpy).toHaveBeenCalledWith('http://example.com/webdav/test.txt');
      expect(result).toEqual(headMeta);
    });
  });

  describe('download', () => {
    it('should download file successfully', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 10:00:00 GMT',
        },
        data: 'file content',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.validateResponseContent.and.stub();

      const result = await api.download({
        path: '/test.txt',
      });

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: 'http://example.com/webdav/test.txt',
          method: 'GET',
        }),
      );

      expect(mockXmlParser.validateResponseContent).toHaveBeenCalledWith(
        'file content',
        '/test.txt',
        'download',
        'file content',
      );

      expect(result).toEqual(
        jasmine.objectContaining({
          rev: 'Wed, 15 Jan 2025 10:00:00 GMT',
          dataStr: 'file content',
          lastModified: 'Wed, 15 Jan 2025 10:00:00 GMT',
        }),
      );
      expect(result.legacyRev).toBeUndefined();
    });

    it('should return legacyRev when ETag is present', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 10:00:00 GMT',
          etag: '"abc123"',
        },
        data: 'file content',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.validateResponseContent.and.stub();

      const result = await api.download({
        path: '/test.txt',
      });

      expect(result).toEqual(
        jasmine.objectContaining({
          rev: 'Wed, 15 Jan 2025 10:00:00 GMT',
          legacyRev: 'abc123', // Cleaned ETag
          dataStr: 'file content',
          lastModified: 'Wed, 15 Jan 2025 10:00:00 GMT',
        }),
      );
    });

    it('should use last-modified as rev when no etag', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 10:00:00 GMT',
        },
        data: 'content',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.validateResponseContent.and.stub();

      const result = await api.download({
        path: '/test.txt',
      });

      expect(result.rev).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
    });

    it('should fetch metadata when Last-Modified header is missing but ETag is present', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          etag: '"abc123"',
        },
        data: 'file content',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.validateResponseContent.and.stub();

      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: 'Wed, 15 Jan 2025 10:00:00 GMT',
          size: 100,
          type: 'file',
          etag: 'Wed, 15 Jan 2025 10:00:00 GMT',
          data: {
            etag: '"meta-etag-should-not-override"',
          },
        }),
      );

      const result = await api.download({
        path: '/test.txt',
      });

      expect(api.getFileMeta).toHaveBeenCalledWith('/test.txt', null, true);
      expect(result.rev).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
      expect(result.legacyRev).toBe('abc123');
      expect(result.lastModified).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
    });

    it('should set legacyRev from metadata when GET response omits both headers', async () => {
      const mockResponse = {
        status: 200,
        headers: {},
        data: 'file content',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.validateResponseContent.and.stub();

      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: 'Wed, 15 Jan 2025 10:00:00 GMT',
          size: 100,
          type: 'file',
          etag: 'Wed, 15 Jan 2025 10:00:00 GMT',
          data: {
            etag: '"propfind-etag-456"',
          },
        }),
      );

      const result = await api.download({
        path: '/test.txt',
      });

      expect(result.rev).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
      expect(result.legacyRev).toBe('propfind-etag-456');
      expect(result.lastModified).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
    });

    it('should throw NoRevAPIError if metadata fallback cannot provide a revision', async () => {
      const mockResponse = {
        status: 200,
        headers: {},
        data: 'file content',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.validateResponseContent.and.stub();

      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: '',
          size: 0,
          type: 'file',
          etag: '',
          data: {},
        }),
      );

      await expectAsync(
        api.download({
          path: '/test.txt',
        }),
      ).toBeRejectedWith(jasmine.any(NoRevAPIError));
    });

    // Test removed: If-None-Match header functionality has been removed
    // Test removed: If-Modified-Since header functionality has been removed
    // Test removed: If-Modified-Since header functionality has been removed
    // Test removed: 304 Not Modified handling has been removed
    // Test removed: 304 Not Modified handling has been removed
    // Test removed: localRev parameter has been removed from download method
    // Test removed: localRev parameter has been removed from download method
  });

  describe('upload', () => {
    it('should upload file successfully', async () => {
      const mockResponse = {
        status: 201,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 11:00:00 GMT',
        },
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: 'http://example.com/webdav/test.txt',
          method: 'PUT',
          body: 'new content',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/octet-stream',
          }),
        }),
      );

      expect(result).toEqual(
        jasmine.objectContaining({
          rev: 'Wed, 15 Jan 2025 11:00:00 GMT',
          lastModified: 'Wed, 15 Jan 2025 11:00:00 GMT',
        }),
      );
      expect(result.legacyRev).toBeUndefined();
    });

    it('should return legacyRev when ETag is present in upload response', async () => {
      const mockResponse = {
        status: 201,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 11:00:00 GMT',
          etag: '"newrev123"',
        },
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(result).toEqual(
        jasmine.objectContaining({
          rev: 'Wed, 15 Jan 2025 11:00:00 GMT',
          legacyRev: 'newrev123', // Cleaned ETag
          lastModified: 'Wed, 15 Jan 2025 11:00:00 GMT',
        }),
      );
    });

    it('should handle conditional upload with date string', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 11:00:00 GMT',
        },
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: 'Wed, 15 Jan 2025 10:00:00 GMT',
      });

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          headers: jasmine.objectContaining({
            'If-Unmodified-Since': jasmine.any(String),
          }),
        }),
      );
    });

    it('should handle conditional upload with ISO date string', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 11:00:00 GMT',
        },
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      const isoDate = '2022-01-15T12:00:00.000Z'; // ISO date string

      await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: isoDate,
      });

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          headers: jasmine.objectContaining({
            'If-Unmodified-Since': jasmine.any(String),
          }),
        }),
      );
    });

    it('should handle 412 Precondition Failed', async () => {
      const errorResponse = new Response(null, { status: 412 });
      const error = new HttpNotOkAPIError(errorResponse);
      mockHttpAdapter.request.and.returnValue(Promise.reject(error));

      await expectAsync(
        api.upload({
          path: '/test.txt',
          data: 'new content',
          expectedRev: 'oldrev',
        }),
      ).toBeRejectedWith(jasmine.any(RemoteFileChangedUnexpectedly));
    });

    it('should handle 409 Conflict by creating parent directory', async () => {
      const errorResponse = new Response(null, { status: 409 });
      const error = new HttpNotOkAPIError(errorResponse);

      // First call fails with 409
      // Second call to create directory succeeds
      // Third call to upload succeeds
      const mockResponses = [
        Promise.reject(error),
        Promise.resolve({ status: 201, headers: {}, data: '' }),
        Promise.resolve({
          status: 201,
          headers: { 'last-modified': 'Wed, 15 Jan 2025 11:00:00 GMT' },
          data: '',
        }),
      ];
      let callCount = 0;
      mockHttpAdapter.request.and.callFake(() => mockResponses[callCount++]);

      const result = await api.upload({
        path: '/folder/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(mockHttpAdapter.request).toHaveBeenCalledTimes(3);
      // Check MKCOL call
      expect(mockHttpAdapter.request.calls.argsFor(1)[0]).toEqual(
        jasmine.objectContaining({
          url: 'http://example.com/webdav/folder',
          method: 'MKCOL',
        }),
      );
      expect(result.rev).toBe('Wed, 15 Jan 2025 11:00:00 GMT');
    });

    it('should fetch metadata when no rev in response headers', async () => {
      const mockUploadResponse = {
        status: 201,
        headers: {}, // No etag or last-modified
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockUploadResponse));

      // Mock getFileMeta to be called after upload
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: 'Wed, 15 Jan 2025 12:00:00 GMT',
          size: 100,
          type: 'file',
          etag: 'Wed, 15 Jan 2025 12:00:00 GMT', // Using lastmod as etag
          data: {},
        }),
      );

      const result = await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(api.getFileMeta).toHaveBeenCalledWith('/test.txt', null, true);
      expect(result).toEqual(
        jasmine.objectContaining({
          rev: 'Wed, 15 Jan 2025 12:00:00 GMT',
          lastModified: 'Wed, 15 Jan 2025 12:00:00 GMT',
        }),
      );
      expect(result.legacyRev).toBeUndefined();
    });

    it('should return legacyRev from HEAD request when PUT returns no headers', async () => {
      // First request (PUT) returns no headers
      const putResponse = {
        status: 201,
        headers: {},
        data: '',
      };

      // HEAD request returns both Last-Modified and ETag
      const headResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 13:00:00 GMT',
          etag: '"head-etag-123"',
        },
        data: '',
      };

      mockHttpAdapter.request.and.callFake((params) => {
        if (params.method === 'PUT') {
          return Promise.resolve(putResponse);
        } else if (params.method === 'HEAD') {
          return Promise.resolve(headResponse);
        } else {
          return Promise.reject(new Error('Unexpected method'));
        }
      });

      const result = await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(result).toEqual({
        rev: 'Wed, 15 Jan 2025 13:00:00 GMT',
        legacyRev: 'head-etag-123',
        lastModified: 'Wed, 15 Jan 2025 13:00:00 GMT',
      });
    });

    it('should extract legacyRev from PROPFIND meta when HEAD fails', async () => {
      // PUT returns no headers
      const putResponse = {
        status: 201,
        headers: {},
        data: '',
      };

      mockHttpAdapter.request.and.callFake((params) => {
        if (params.method === 'PUT') {
          return Promise.resolve(putResponse);
        } else if (params.method === 'HEAD') {
          return Promise.reject(new Error('HEAD failed'));
        } else {
          return Promise.reject(new Error('Unexpected method'));
        }
      });

      // Mock getFileMeta to return data with etag
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: 'Wed, 15 Jan 2025 14:00:00 GMT',
          size: 100,
          type: 'file',
          etag: 'Wed, 15 Jan 2025 14:00:00 GMT',
          data: {
            etag: '"propfind-etag-456"', // Original ETag in data
          },
        }),
      );

      const result = await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(result).toEqual({
        rev: 'Wed, 15 Jan 2025 14:00:00 GMT',
        legacyRev: 'propfind-etag-456',
        lastModified: 'Wed, 15 Jan 2025 14:00:00 GMT',
      });
    });

    it('should handle upload with ETag in initial response', async () => {
      const mockResponse = {
        status: 201,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 15:00:00 GMT',
          ETag: '"W/\\"weak-etag-789\\""', // Weak ETag with nested quotes
        },
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'new content',
        expectedRev: null,
      });

      expect(result).toEqual({
        rev: 'Wed, 15 Jan 2025 15:00:00 GMT',
        legacyRev: 'W\\weak-etag-789\\', // Cleaned (removes / and " but not \)
        lastModified: 'Wed, 15 Jan 2025 15:00:00 GMT',
      });
    });
  });

  describe('remove', () => {
    it('should remove file successfully', async () => {
      const mockResponse = {
        status: 204,
        headers: {},
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      await api.remove('/test.txt');

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: 'http://example.com/webdav/test.txt',
          method: 'DELETE',
        }),
      );
    });

    it('should handle conditional delete with date string', async () => {
      const mockResponse = {
        status: 204,
        headers: {},
        data: '',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));

      await api.remove('/test.txt', 'Wed, 15 Jan 2025 10:00:00 GMT');

      expect(mockHttpAdapter.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: 'http://example.com/webdav/test.txt',
          method: 'DELETE',
          headers: jasmine.objectContaining({
            'If-Unmodified-Since': jasmine.any(String),
          }),
        }),
      );
    });
  });

  describe('_cleanRev', () => {
    it('should clean revision strings', () => {
      expect((api as any)._cleanRev('"abc123"')).toBe('abc123');
      expect((api as any)._cleanRev('abc/123')).toBe('abc123');
      expect((api as any)._cleanRev('"abc/123"')).toBe('abc123');
      expect((api as any)._cleanRev('&quot;abc123&quot;')).toBe('abc123');
      expect((api as any)._cleanRev('')).toBe('');
    });

    it('should handle various ETag formats', () => {
      // Standard ETag with quotes
      expect((api as any)._cleanRev('"12345"')).toBe('12345');

      // Weak ETag
      expect((api as any)._cleanRev('W/"weak-etag"')).toBe('Wweak-etag');

      // ETag with escaped quotes
      expect((api as any)._cleanRev('"escaped\\\\"quotes\\\\""')).toBe(
        'escaped\\\\quotes\\\\',
      );

      // ETag with HTML entities
      expect((api as any)._cleanRev('&quot;html-entity&quot;')).toBe('html-entity');

      // Complex ETag with multiple special characters
      expect((api as any)._cleanRev('"complex/etag/with/slashes"')).toBe(
        'complexetagwithslashes',
      );

      // Empty or null cases
      expect((api as any)._cleanRev(null)).toBe('');
      expect((api as any)._cleanRev(undefined)).toBe('');
      expect((api as any)._cleanRev('   ')).toBe('');

      // ETag with surrounding whitespace
      expect((api as any)._cleanRev('  "whitespace"  ')).toBe('whitespace');
    });
  });

  describe('_getFileMetaViaHead', () => {
    it('should parse HEAD response into FileMeta data', async () => {
      const mockHeadResponse = {
        status: 200,
        headers: {
          'last-modified': 'Wed, 15 Jan 2025 15:00:00 GMT',
          'content-length': '128',
          'content-type': 'application/json',
        },
        data: '',
      };
      const requestSpy = spyOn<any>(api, '_makeRequest').and.returnValue(
        Promise.resolve(mockHeadResponse),
      );

      const result = await (api as any)._getFileMetaViaHead(
        'http://example.com/webdav/test.json',
      );

      expect(requestSpy).toHaveBeenCalledWith({
        url: 'http://example.com/webdav/test.json',
        method: 'HEAD',
      });
      expect(result).toEqual({
        filename: 'test.json',
        basename: 'test.json',
        lastmod: 'Wed, 15 Jan 2025 15:00:00 GMT',
        size: 128,
        type: 'application/json',
        etag: 'Wed, 15 Jan 2025 15:00:00 GMT',
        data: {
          'content-type': 'application/json',
          'content-length': '128',
          'last-modified': 'Wed, 15 Jan 2025 15:00:00 GMT',
          etag: '',
          href: 'http://example.com/webdav/test.json',
        },
      });
    });

    it('should throw InvalidDataSPError when Last-Modified header missing', async () => {
      spyOn<any>(api, '_makeRequest').and.returnValue(
        Promise.resolve({
          status: 200,
          headers: {},
          data: '',
        }),
      );

      await expectAsync(
        (api as any)._getFileMetaViaHead('http://example.com/webdav/test.json'),
      ).toBeRejectedWith(jasmine.any(InvalidDataSPError));
    });
  });

  describe('_buildFullPath', () => {
    it('should build correct full paths', () => {
      expect((api as any)._buildFullPath('http://example.com/', '/file.txt')).toBe(
        'http://example.com/file.txt',
      );
      expect((api as any)._buildFullPath('http://example.com', 'file.txt')).toBe(
        'http://example.com/file.txt',
      );
      expect((api as any)._buildFullPath('http://example.com/', 'file.txt')).toBe(
        'http://example.com/file.txt',
      );
    });

    it('should throw error for invalid path sequences', () => {
      expect(() =>
        (api as any)._buildFullPath('http://example.com/', '../secret'),
      ).toThrowError(/Invalid path/);
      expect(() =>
        (api as any)._buildFullPath('http://example.com/', '//secret'),
      ).toThrowError(/Invalid path/);
    });

    it('should encode path segments with spaces', () => {
      expect(
        (api as any)._buildFullPath('http://example.com/base', '/file with spaces.txt'),
      ).toBe('http://example.com/base/file%20with%20spaces.txt');
    });

    it('should not double-encode already encoded paths', () => {
      expect(
        (api as any)._buildFullPath(
          'http://example.com/base',
          '/file%20with%20spaces.txt',
        ),
      ).toBe('http://example.com/base/file%20with%20spaces.txt');
    });

    it('should handle base URLs with spaces', () => {
      expect(
        (api as any)._buildFullPath('http://example.com/User Name', '/file.txt'),
      ).toBe('http://example.com/User%20Name/file.txt');
    });

    it('should fallback gracefully for invalid URLs', () => {
      // Fallback behavior verification
      const invalidBase = 'not-a-valid-url';
      const path = '/file.txt';
      // The fallback just concatenates and tries to encode
      expect((api as any)._buildFullPath(invalidBase, path)).toBe(
        'not-a-valid-url/file.txt',
      );
    });
  });

  describe('error handling', () => {
    it('should call getCfgOrError for each operation', async () => {
      const mockResponse = {
        status: 207,
        headers: {},
        data: '<?xml version="1.0"?><multistatus/>',
      };
      mockHttpAdapter.request.and.returnValue(Promise.resolve(mockResponse));
      mockXmlParser.parseMultiplePropsFromXml.and.returnValue([
        {
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: '',
          size: 0,
          type: 'file',
          etag: 'Wed, 15 Jan 2025 10:00:00 GMT', // Using lastmod as etag
          data: {},
        },
      ]);

      await api.getFileMeta('/test.txt', null);

      expect(mockGetCfg).toHaveBeenCalled();
    });

    it('should propagate errors from getCfgOrError', async () => {
      const error = new Error('Config error');
      mockGetCfg.and.returnValue(Promise.reject(error));

      await expectAsync(api.getFileMeta('/test.txt', null)).toBeRejectedWith(error);
    });
  });
});
