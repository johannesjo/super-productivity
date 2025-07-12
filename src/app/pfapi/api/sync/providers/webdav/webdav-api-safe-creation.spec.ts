import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { createMockResponse } from './webdav-api-test-utils';
import { FileExistsAPIError } from '../../../errors/errors';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Safe Creation Methods', () => {
  let mockFetch: jasmine.Spy;

  const mockConfig: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  beforeEach(() => {
    mockFetch = spyOn(globalThis, 'fetch');
  });

  describe('Safe creation with If header', () => {
    it('should use If header with Not token for safe creation when supported', async () => {
      const testData = 'new file content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server to support If header but not ETags
      const configWithIfHeader: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: true,
          supportsLocking: false,
        },
      };

      const apiWithIfHeader = new WebdavApi(async () => configWithIfHeader);

      const uploadResponse = createMockResponse(201, {
        'last-modified': lastModified,
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await apiWithIfHeader.upload({
        path: '/newfile.txt',
        data: testData,
        isOverwrite: false,
      });

      expect(result).toBe(lastModified);

      // Verify the PUT request used If header
      expect(mockFetch).toHaveBeenCalled();
      const putCall = mockFetch.calls.mostRecent();
      const headers = putCall.args[1].headers;

      // The If header should use the Not token to ensure file doesn't exist
      // Format: If: <Not> <(etag or state-token)>
      // For safe creation without ETags: If: <Not> <*>
      if (headers instanceof Headers) {
        expect(headers.get('If')).toBe('<Not> <*>');
      } else {
        expect(headers['If']).toBe('<Not> <*>');
      }
    });

    it('should handle 412 Precondition Failed when file exists', async () => {
      const testData = 'new file content';

      // Configure server to support If header
      const configWithIfHeader: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: true,
          supportsLocking: false,
        },
      };

      const apiWithIfHeader = new WebdavApi(async () => configWithIfHeader);

      // Server returns 412 because file already exists
      const conflictResponse = createMockResponse(412, {});

      mockFetch.and.returnValue(Promise.resolve(conflictResponse));

      await expectAsync(
        apiWithIfHeader.upload({
          path: '/existing.txt',
          data: testData,
          isOverwrite: false,
        }),
      ).toBeRejectedWith(jasmine.any(FileExistsAPIError));
    });
  });

  describe('Safe creation with LOCK/UNLOCK', () => {
    it('should use LOCK for safe creation when supported', async () => {
      const testData = 'new file content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';
      const lockToken = 'opaquelocktoken:abc123';

      // Configure server to support locking but not ETags
      const configWithLocking: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: true,
        },
      };

      const apiWithLocking = new WebdavApi(async () => configWithLocking);

      // Mock LOCK request
      const lockResponse = createMockResponse(
        200,
        {
          'lock-token': `<${lockToken}>`,
        },
        `<?xml version="1.0" encoding="utf-8"?>
        <d:prop xmlns:d="DAV:">
          <d:lockdiscovery>
            <d:activelock>
              <d:locktype><d:write/></d:locktype>
              <d:lockscope><d:exclusive/></d:lockscope>
              <d:depth>0</d:depth>
              <d:owner>testuser</d:owner>
              <d:timeout>Second-600</d:timeout>
              <d:locktoken>
                <d:href>${lockToken}</d:href>
              </d:locktoken>
            </d:activelock>
          </d:lockdiscovery>
        </d:prop>`,
      );

      // Mock PUT request
      const uploadResponse = createMockResponse(201, {
        'last-modified': lastModified,
      });

      // Mock UNLOCK request
      const unlockResponse = createMockResponse(204, {});

      let callCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'LOCK' && callCount === 1) {
          return Promise.resolve(lockResponse);
        } else if (method === 'PUT' && callCount === 2) {
          // Verify lock token is included
          const headers = options.headers;
          if (headers instanceof Headers) {
            expect(headers.get('If')).toContain(lockToken);
          } else {
            expect(headers['If']).toContain(lockToken);
          }
          return Promise.resolve(uploadResponse);
        } else if (method === 'UNLOCK' && callCount === 3) {
          // Verify lock token is included
          const headers = options.headers;
          if (headers instanceof Headers) {
            expect(headers.get('Lock-Token')).toBe(`<${lockToken}>`);
          } else {
            expect(headers['Lock-Token']).toBe(`<${lockToken}>`);
          }
          return Promise.resolve(unlockResponse);
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      const result = await apiWithLocking.upload({
        path: '/newfile.txt',
        data: testData,
        isOverwrite: false,
      });

      expect(result).toBe(lastModified);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle lock conflicts when file is already locked', async () => {
      const testData = 'new file content';

      // Configure server to support locking
      const configWithLocking: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: true,
        },
      };

      const apiWithLocking = new WebdavApi(async () => configWithLocking);

      // Server returns 423 Locked
      const lockedResponse = createMockResponse(423, {});

      mockFetch.and.returnValue(Promise.resolve(lockedResponse));

      await expectAsync(
        apiWithLocking.upload({
          path: '/locked.txt',
          data: testData,
          isOverwrite: false,
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/locked/i),
        }),
      );
    });
  });

  describe('Fallback when no safe creation is available', () => {
    it('should warn when no safe creation method is available', async () => {
      const testData = 'new file content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server with no safe creation support
      const configNoSafeCreation: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiNoSafeCreation = new WebdavApi(async () => configNoSafeCreation);

      // Spy on console.warn
      spyOn(console, 'warn');

      const uploadResponse = createMockResponse(201, {
        'last-modified': lastModified,
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await apiNoSafeCreation.upload({
        path: '/newfile.txt',
        data: testData,
        isOverwrite: false,
      });

      expect(result).toBe(lastModified);

      // Should warn about no safe creation
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/no safe creation method available/i),
        jasmine.any(Object),
      );
    });
  });
});
