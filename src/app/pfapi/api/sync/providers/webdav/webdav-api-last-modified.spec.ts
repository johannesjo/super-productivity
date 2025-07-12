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

  describe('_createConditionalHeaders method', () => {
    it('should create ETag-based headers when ETag provided', async () => {
      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(
        false,
        '"abc123"',
        null,
        'etag',
      );

      expect(headers['If-Match']).toBe('"abc123"');
      expect(headers['If-Unmodified-Since']).toBeUndefined();
      expect(headers['If-None-Match']).toBeUndefined();
      expect(headers['If-Modified-Since']).toBeUndefined();
    });

    it('should create Last-Modified headers when Last-Modified provided', async () => {
      const timestamp = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(
        false,
        null,
        timestamp,
        'last-modified',
      );

      expect(headers['If-Unmodified-Since']).toBe(timestamp);
      expect(headers['If-Match']).toBeUndefined();
      expect(headers['If-None-Match']).toBeUndefined();
      expect(headers['If-Modified-Since']).toBeUndefined();
    });

    it('should create If-None-Match for new file creation with ETag', async () => {
      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(false, null, null, 'etag');

      expect(headers['If-None-Match']).toBe('*');
      expect(headers['If-Match']).toBeUndefined();
      expect(headers['If-Unmodified-Since']).toBeUndefined();
      expect(headers['If-Modified-Since']).toBeUndefined();
    });

    it('should not create conditional headers for new file creation with Last-Modified only', async () => {
      // Last-Modified cannot safely handle resource creation
      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(
        false,
        null,
        null,
        'last-modified',
      );

      expect(Object.keys(headers).length).toBe(0);
    });

    it('should handle overwrite mode with ETag', async () => {
      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(true, '"abc123"', null, 'etag');

      expect(headers['If-Match']).toBe('"abc123"');
      expect(headers['If-None-Match']).toBeUndefined();
    });

    it('should handle overwrite mode with Last-Modified', async () => {
      const timestamp = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(
        true,
        null,
        timestamp,
        'last-modified',
      );

      expect(headers['If-Unmodified-Since']).toBe(timestamp);
      expect(headers['If-Match']).toBeUndefined();
    });

    it('should prefer ETag when both ETag and Last-Modified provided', async () => {
      const timestamp = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(
        false,
        '"abc123"',
        timestamp,
        'etag',
      );

      expect(headers['If-Match']).toBe('"abc123"');
      expect(headers['If-Unmodified-Since']).toBeUndefined();
    });

    it('should handle missing validator type gracefully', async () => {
      // @ts-expect-error - accessing private method for testing
      const headers = await api._createConditionalHeaders(
        false,
        '"abc123"',
        null,
        'none',
      );

      // Should fall back to ETag behavior when validator is provided
      expect(headers['If-Match']).toBe('"abc123"');
    });
  });
});
