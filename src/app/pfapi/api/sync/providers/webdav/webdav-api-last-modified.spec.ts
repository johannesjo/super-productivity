import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Last-Modified Support', () => {
  let api: WebdavApi;

  const mockConfig: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  beforeEach(() => {
    api = new WebdavApi(async () => mockConfig);
  });

  describe('_extractValidators method', () => {
    it('should extract ETag when available', async () => {
      // This test will fail until _extractValidators is implemented
      const headers = {
        etag: '"abc123"',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.etag).toBe('"abc123"');
      expect(result.lastModified).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
      expect(result.validator).toBe('"abc123"');
      expect(result.validatorType).toBe('etag');
    });

    it('should extract Last-Modified when ETag unavailable', async () => {
      const headers = {
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.etag).toBeUndefined();
      expect(result.lastModified).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
      expect(result.validator).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
      expect(result.validatorType).toBe('last-modified');
    });

    it('should handle case-insensitive header names', async () => {
      const headers = {
        ETag: '"abc123"',
        'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.etag).toBe('"abc123"');
      expect(result.lastModified).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
      expect(result.validator).toBe('"abc123"');
      expect(result.validatorType).toBe('etag');
    });

    it('should return undefined validator when neither ETag nor Last-Modified available', async () => {
      const headers = {
        'content-type': 'text/plain',
        'content-length': '123',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.etag).toBeUndefined();
      expect(result.lastModified).toBeUndefined();
      expect(result.validator).toBeUndefined();
      expect(result.validatorType).toBe('none');
    });

    it('should prefer ETag over Last-Modified when both available', async () => {
      const headers = {
        etag: '"abc123"',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.validator).toBe('"abc123"');
      expect(result.validatorType).toBe('etag');
    });

    it('should handle weak ETags', async () => {
      const headers = {
        etag: 'W/"abc123"',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.etag).toBe('W/"abc123"');
      expect(result.validator).toBe('W/"abc123"');
      expect(result.validatorType).toBe('etag');
    });

    it('should handle empty header values', async () => {
      const headers = {
        etag: '',
        'last-modified': '',
      };

      // @ts-expect-error - accessing private method for testing
      const result = api._extractValidators(headers);

      expect(result.etag).toBe('');
      expect(result.lastModified).toBe('');
      expect(result.validator).toBeUndefined();
      expect(result.validatorType).toBe('none');
    });
  });
});
