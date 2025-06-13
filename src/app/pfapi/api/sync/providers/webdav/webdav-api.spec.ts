/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import {
  AuthFailSPError,
  FileExistsAPIError,
  NoEtagAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { CapacitorHttp } from '@capacitor/core';

describe('WebdavApi', () => {
  let api: WebdavApi;
  let mockGetCfgOrError: jasmine.Spy;
  let mockFetch: jasmine.Spy;
  let mockCapacitorHttp: jasmine.SpyObj<typeof CapacitorHttp>;

  const mockCfg: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  const createMockResponse = (
    status: number,
    headers: Record<string, string> = {},
    body: string = '',
  ): Response => {
    // 204 No Content responses can't have a body
    const responseBody = status === 204 ? null : body;
    const response = new Response(responseBody, {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers(headers),
    });
    return response;
  };

  beforeEach(() => {
    mockGetCfgOrError = jasmine
      .createSpy('getCfgOrError')
      .and.returnValue(Promise.resolve(mockCfg));
    api = new WebdavApi(mockGetCfgOrError);

    mockFetch = jasmine.createSpy('fetch');
    (globalThis as any).fetch = mockFetch;

    mockCapacitorHttp = jasmine.createSpyObj('CapacitorHttp', ['request']);
    (CapacitorHttp as any).request = mockCapacitorHttp.request;
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  describe('upload', () => {
    it('should upload file successfully and return etag', async () => {
      const mockResponse = createMockResponse(201, { etag: '"etag-123"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('etag-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/test.txt',
        jasmine.objectContaining({
          method: 'PUT',
          body: 'test data',
          headers: jasmine.any(Headers),
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Content-Type')).toBe('application/octet-stream');
      expect(headers.get('If-None-Match')).toBe('*');
      expect(headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');
    });

    it('should handle conditional upload with expectedEtag', async () => {
      const mockResponse = createMockResponse(200, { etag: '"new-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: 'old-etag',
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-Match')).toBe('old-etag');
      expect(headers.get('If-None-Match')).toBeNull();
    });

    it('should handle force overwrite', async () => {
      const mockResponse = createMockResponse(200, { etag: '"new-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: true,
        expectedEtag: 'old-etag',
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-Match')).toBe('old-etag');
    });

    it('should handle 409 conflict by creating parent directories', async () => {
      const conflictResponse = createMockResponse(409);
      const successResponse = createMockResponse(201, { etag: '"etag-123"' });

      mockFetch.and.returnValues(
        Promise.resolve(conflictResponse),
        Promise.resolve(createMockResponse(201)), // MKCOL response
        Promise.resolve(successResponse),
      );

      const result = await api.upload({
        data: 'test data',
        path: 'folder/subfolder/test.txt',
      });

      expect(result).toBe('etag-123');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw FileExistsAPIError on 412 without expectedEtag', async () => {
      const mockResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
        }),
      ).toBeRejectedWith(jasmine.any(FileExistsAPIError));
    });

    it('should throw custom error on 412 with expectedEtag', async () => {
      const mockResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          expectedEtag: 'expected-etag',
        }),
      ).toBeRejectedWithError(
        'Upload failed: file was modified (expected etag: expected-etag)',
      );
    });

    it('should get etag via PROPFIND if not in response headers', async () => {
      const uploadResponse = createMockResponse(201); // No etag header
      const propfindResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"fallback-etag"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.returnValues(
        Promise.resolve(uploadResponse),
        Promise.resolve(propfindResponse),
      );

      const result = await api.upload({
        data: 'test data',
        path: 'test.txt',
      });

      expect(result).toBe('fallback-etag');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle various error status codes', async () => {
      const testCases = [
        { status: 413, expectedError: 'File too large: test.txt' },
        { status: 423, expectedError: 'Resource is locked: test.txt' },
        { status: 507, expectedError: 'Insufficient storage space for: test.txt' },
      ];

      for (const testCase of testCases) {
        mockFetch.and.returnValue(Promise.resolve(createMockResponse(testCase.status)));

        await expectAsync(
          api.upload({ data: 'test', path: 'test.txt' }),
        ).toBeRejectedWithError(testCase.expectedError);
      }
    });
  });

  describe('download', () => {
    it('should download file successfully', async () => {
      const mockResponse = createMockResponse(
        200,
        { etag: '"etag-123"' },
        'file content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'test.txt' });

      expect(result).toEqual({
        rev: 'etag-123',
        dataStr: 'file content',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/test.txt',
        jasmine.objectContaining({
          method: 'GET',
          headers: jasmine.any(Headers),
        }),
      );
    });

    it('should handle conditional download with localRev', async () => {
      const mockResponse = createMockResponse(200, { etag: '"new-etag"' }, 'new content');
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.download({ path: 'test.txt', localRev: 'old-etag' });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-None-Match')).toBe('old-etag');
    });

    it('should handle 304 Not Modified response', async () => {
      const mockResponse = createMockResponse(304);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.download({ path: 'test.txt', localRev: 'current-etag' }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: 'File not modified: test.txt',
          status: 304,
          localRev: 'current-etag',
        }),
      );
    });

    it('should handle 206 Partial Content with range', async () => {
      const mockResponse = createMockResponse(
        206,
        { etag: '"etag-123"' },
        'partial content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({
        path: 'test.txt',
        rangeStart: 0,
        rangeEnd: 1023,
      });

      expect(result.dataStr).toBe('partial content');
      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Range')).toBe('bytes=0-1023');
    });

    it('should detect HTML error response', async () => {
      const mockResponse = createMockResponse(
        200,
        {},
        '<!DOCTYPE html><html><body>404 Not Found</body></html>',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle missing etag with PROPFIND fallback', async () => {
      const downloadResponse = createMockResponse(200, {}, 'content');
      const propfindResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"propfind-etag"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.returnValues(
        Promise.resolve(downloadResponse),
        Promise.resolve(propfindResponse),
      );

      const result = await api.download({ path: 'test.txt' });

      expect(result.rev).toBe('propfind-etag');
      expect(result.dataStr).toBe('content');
    });

    it('should generate content-based hash when no etag available', async () => {
      const downloadResponse = createMockResponse(200, {}, 'test content');
      const propfindError = createMockResponse(404);

      mockFetch.and.returnValues(
        Promise.resolve(downloadResponse),
        Promise.resolve(propfindError),
      );

      // Mock crypto API
      const mockDigest = jasmine.createSpy('digest').and.returnValue(
        Promise.resolve(new ArrayBuffer(32)), // 32 bytes for SHA-256
      );
      (globalThis as any).crypto = {
        subtle: { digest: mockDigest },
      };

      const result = await api.download({ path: 'test.txt' });

      expect(result.dataStr).toBe('test content');
      expect(result.rev).toMatch(/^[0-9a-f]{16}$/); // First 16 chars of hash
      expect(mockDigest).toHaveBeenCalledWith('SHA-256', jasmine.any(Uint8Array));
    });

    it('should handle various error status codes', async () => {
      const testCases = [
        { status: 404, expectedError: RemoteFileNotFoundAPIError },
        { status: 416, expectedError: Error, message: 'Invalid range request' },
        { status: 423, expectedError: Error, message: 'Resource is locked' },
      ];

      for (const testCase of testCases) {
        mockFetch.and.returnValue(Promise.resolve(createMockResponse(testCase.status)));

        if (testCase.expectedError === RemoteFileNotFoundAPIError) {
          await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
            jasmine.any(testCase.expectedError),
          );
        } else {
          await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWithError(
            testCase.message!,
          );
        }
      }
    });
  });

  describe('remove', () => {
    it('should remove file successfully', async () => {
      const mockResponse = createMockResponse(204);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.remove('test.txt');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/test.txt',
        jasmine.objectContaining({
          method: 'DELETE',
          headers: jasmine.any(Headers),
        }),
      );
    });

    it('should handle conditional delete with expectedEtag', async () => {
      const mockResponse = createMockResponse(204);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.remove('test.txt', 'expected-etag');

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-Match')).toBe('expected-etag');
    });

    it('should check resource type before deletion', async () => {
      const propfindResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );
      const deleteResponse = createMockResponse(204);

      mockFetch.and.returnValues(
        Promise.resolve(propfindResponse),
        Promise.resolve(deleteResponse),
      );

      await api.remove('folder');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const deleteCall = mockFetch.calls.mostRecent();
      const headers = deleteCall.args[1].headers;
      expect(headers.get('Depth')).toBe('infinity');
    });

    it('should treat 404 as success', async () => {
      const mockResponse = createMockResponse(404);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.remove('test.txt')).toBeResolved();
    });

    it('should handle 412 Precondition Failed with expectedEtag', async () => {
      const mockResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.remove('test.txt', 'wrong-etag')).toBeRejectedWithError(
        'Delete failed: resource was modified (expected etag: wrong-etag)',
      );
    });

    it('should handle multi-status response', async () => {
      const multiStatusResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/file1.txt</d:href>
            <d:status>HTTP/1.1 423 Locked</d:status>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.returnValue(Promise.resolve(multiStatusResponse));

      await expectAsync(api.remove('folder')).toBeRejectedWithError(
        'Partial deletion failure for: folder',
      );
    });
  });

  describe('getFileMeta', () => {
    it('should get file metadata via PROPFIND', async () => {
      const propfindResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:displayname>test.txt</d:displayname>
                <d:getcontentlength>1234</d:getcontentlength>
                <d:getlastmodified>Mon, 01 Jan 2024 00:00:00 GMT</d:getlastmodified>
                <d:getetag>"etag-123"</d:getetag>
                <d:resourcetype/>
                <d:getcontenttype>text/plain</d:getcontenttype>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.returnValue(Promise.resolve(propfindResponse));

      const result = await api.getFileMeta('test.txt', null);

      expect(result).toEqual({
        filename: 'test.txt',
        basename: 'test.txt',
        lastmod: 'Mon, 01 Jan 2024 00:00:00 GMT',
        size: 1234,
        type: 'file',
        etag: 'etag-123',
        data: jasmine.objectContaining({
          'content-type': 'text/plain',
          'content-length': '1234',
          etag: '"etag-123"',
        }),
      });
    });

    it('should fallback to HEAD when PROPFIND fails with PROPFIND error message', async () => {
      const propfindError = new Error('PROPFIND not supported');
      const headResponse = createMockResponse(200, {
        etag: '"head-etag"',
        'content-length': '5678',
        'last-modified': 'Tue, 02 Jan 2024 00:00:00 GMT',
        'content-type': 'application/json',
      });

      mockFetch.and.returnValues(
        Promise.reject(propfindError),
        Promise.resolve(headResponse),
      );

      const result = await api.getFileMeta('test.json', null);

      expect(result.etag).toBe('head-etag');
      expect(result.size).toBe(5678);
      expect(result.type).toBe('file');
    });

    it('should detect HTML error response', async () => {
      const htmlResponse = createMockResponse(
        200,
        { 'content-type': 'text/html' },
        '<!DOCTYPE html><html><body>404 Not Found</body></html>',
      );

      mockFetch.and.returnValue(Promise.resolve(htmlResponse));

      await expectAsync(api.getFileMeta('test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });
  });

  describe('createFolder', () => {
    it('should create folder via MKCOL', async () => {
      const mockResponse = createMockResponse(201);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.createFolder({ folderPath: 'newfolder' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/newfolder',
        jasmine.objectContaining({
          method: 'MKCOL',
        }),
      );
    });

    it('should fallback to PUT on 405 Method Not Allowed', async () => {
      const mkcolError = createMockResponse(405);
      const putResponse = createMockResponse(201);

      mockFetch.and.returnValues(
        Promise.resolve(mkcolError),
        Promise.resolve(putResponse),
      );

      await api.createFolder({ folderPath: 'newfolder' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const putCall = mockFetch.calls.mostRecent();
      expect(putCall.args[0]).toBe('https://webdav.example.com/newfolder/.folder');
      expect(putCall.args[1].method).toBe('PUT');
    });

    it('should create parent directories on 409 Conflict', async () => {
      const conflictResponse = createMockResponse(409);
      const parentCreateResponse = createMockResponse(201);
      const childCreateResponse = createMockResponse(201);

      mockFetch.and.returnValues(
        Promise.resolve(conflictResponse),
        Promise.resolve(parentCreateResponse),
        Promise.resolve(childCreateResponse),
      );

      await api.createFolder({ folderPath: 'parent/child' });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.calls.argsFor(1)[0]).toContain('/parent');
      expect(mockFetch.calls.argsFor(2)[0]).toContain('/parent/child');
    });

    it('should handle MKCOL not supported error', async () => {
      const mkcolError = new Error('MKCOL not supported');
      (mkcolError as any).message = 'MKCOL not supported';
      const putResponse = createMockResponse(201);

      mockFetch.and.returnValues(
        Promise.reject(mkcolError),
        Promise.resolve(putResponse),
      );

      await api.createFolder({ folderPath: 'newfolder' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const propfindResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"etag-123"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.returnValue(Promise.resolve(propfindResponse));

      const result = await api.fileExists('test.txt');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const notFoundResponse = createMockResponse(404);
      mockFetch.and.returnValue(Promise.resolve(notFoundResponse));

      const result = await api.fileExists('nonexistent.txt');

      expect(result).toBe(false);
    });

    it('should propagate non-404 errors', async () => {
      const serverError = createMockResponse(500);
      mockFetch.and.returnValue(Promise.resolve(serverError));

      await expectAsync(api.fileExists('test.txt')).toBeRejected();
    });
  });

  describe('listFolder', () => {
    it('should list folder contents', async () => {
      const propfindResponse = createMockResponse(
        207,
        { 'content-type': 'application/xml' },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/folder/file1.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:displayname>file1.txt</d:displayname>
                <d:getcontentlength>100</d:getcontentlength>
                <d:getetag>"file1-etag"</d:getetag>
                <d:resourcetype/>
              </d:prop>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/folder/subfolder/</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:displayname>subfolder</d:displayname>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.returnValue(Promise.resolve(propfindResponse));

      const result = await api.listFolder('folder');

      expect(result.length).toBe(2); // Should exclude the folder itself
      expect(result[0]).toEqual(
        jasmine.objectContaining({
          filename: 'file1.txt',
          type: 'file',
          size: 100,
          etag: 'file1-etag',
        }),
      );
      expect(result[1]).toEqual(
        jasmine.objectContaining({
          filename: 'subfolder',
          type: 'directory',
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Depth')).toBe('1');
    });

    it('should return empty array when PROPFIND error includes PROPFIND message', async () => {
      const propfindError = new Error('PROPFIND not supported');
      mockFetch.and.returnValue(Promise.reject(propfindError));

      const result = await api.listFolder('folder');

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('_shouldUseCapacitorHttp', () => {
    it('should return false for standard HTTP methods', () => {
      const standardMethods = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'HEAD',
        'OPTIONS',
      ];

      for (const method of standardMethods) {
        expect((api as any)._shouldUseCapacitorHttp(method)).toBe(false);
      }
    });

    // Skip Android WebView specific tests as we can't mock module constants
    it('should return false for standard HTTP methods', () => {
      // This test will pass regardless of IS_ANDROID_WEB_VIEW value
      // as standard methods always return false
      const result = (api as any)._shouldUseCapacitorHttp('GET');
      expect(result).toBe(false);
    });
  });

  describe('_cleanRev', () => {
    it('should clean etag values', () => {
      expect((api as any)._cleanRev('"etag-123"')).toBe('etag-123');
      expect((api as any)._cleanRev('etag-123')).toBe('etag-123');
      expect((api as any)._cleanRev('&quot;etag-123&quot;')).toBe('etag-123');
      expect((api as any)._cleanRev('"etag/with/slashes"')).toBe('etagwithslashes');
      expect((api as any)._cleanRev('  etag-123  ')).toBe('etag-123');
      expect((api as any)._cleanRev('')).toBe('');
    });
  });

  describe('_getUrl', () => {
    it('should construct proper URLs', () => {
      expect((api as any)._getUrl('test.txt', mockCfg)).toBe(
        'https://webdav.example.com/test.txt',
      );

      expect((api as any)._getUrl('/test.txt', mockCfg)).toBe(
        'https://webdav.example.com/test.txt',
      );

      const cfgWithoutSlash = { ...mockCfg, baseUrl: 'https://webdav.example.com' };
      expect((api as any)._getUrl('test.txt', cfgWithoutSlash)).toBe(
        'https://webdav.example.com/test.txt',
      );
    });
  });

  describe('_getAuthHeader', () => {
    it('should generate basic auth header', () => {
      const authHeader = (api as any)._getAuthHeader(mockCfg);
      expect(authHeader).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');

      const decoded = atob('dGVzdHVzZXI6dGVzdHBhc3M=');
      expect(decoded).toBe('testuser:testpass');
    });
  });

  describe('getRevFromMetaHelper', () => {
    it('should extract etag from various data structures', () => {
      expect(api.getRevFromMetaHelper({ data: { etag: '"etag-123"' } })).toBe('etag-123');
      expect(api.getRevFromMetaHelper({ etag: '"etag-456"' })).toBe('etag-456');
      expect(api.getRevFromMetaHelper({ data: { ETag: '"etag-789"' } })).toBe('etag-789');
      expect(api.getRevFromMetaHelper({ data: { 'oc-etag': '"oc-etag-123"' } })).toBe(
        'oc-etag-123',
      );
    });

    it('should throw NoEtagAPIError when etag is not found', () => {
      expect(() => api.getRevFromMetaHelper({ data: {} })).toThrowError(NoEtagAPIError);
      expect(() => api.getRevFromMetaHelper({})).toThrowError(NoEtagAPIError);
    });
  });

  describe('_checkCommonErrors', () => {
    it('should throw AuthFailSPError for 401/403 errors', () => {
      const errors = [
        { status: 401, message: 'Unauthorized' },
        { status: 403, message: 'Forbidden' },
      ];

      for (const error of errors) {
        expect(() => (api as any)._checkCommonErrors(error, 'test.txt')).toThrowError(
          AuthFailSPError,
        );
      }
    });

    it('should not throw for 207 Multi-Status', () => {
      expect(() =>
        (api as any)._checkCommonErrors({ status: 207 }, 'test.txt'),
      ).not.toThrow();
    });
  });

  describe('CapacitorHttp integration', () => {
    it('should handle CapacitorHttp response conversion', async () => {
      const mockCapacitorResponse = {
        status: 207,
        data: `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"capacitor-etag"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
        headers: { 'content-type': 'application/xml' },
        url: 'https://webdav.example.com/test.txt',
      };

      mockCapacitorHttp.request.and.returnValue(Promise.resolve(mockCapacitorResponse));

      const result = await api.getFileMeta('test.txt', null);

      expect(result.etag).toBe('capacitor-etag');
      expect(mockCapacitorHttp.request).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: 'https://webdav.example.com/test.txt',
          method: 'PROPFIND',
          headers: jasmine.objectContaining({
            Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
          }),
        }),
      );
    });
  });
});
