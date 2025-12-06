import { SuperSyncProvider } from './super-sync';
import { SuperSyncPrivateCfg } from './super-sync.model';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SyncProviderId } from '../../../pfapi.const';
import { MissingCredentialsSPError } from '../../../errors/errors';
import { SyncOperation } from '../../sync-provider.interface';

describe('SuperSyncProvider', () => {
  let provider: SuperSyncProvider;
  let mockPrivateCfgStore: jasmine.SpyObj<
    SyncProviderPrivateCfgStore<SyncProviderId.SuperSync>
  >;
  let fetchSpy: jasmine.Spy;
  let localStorageSpy: {
    getItem: jasmine.Spy;
    setItem: jasmine.Spy;
  };

  const testConfig: SuperSyncPrivateCfg = {
    baseUrl: 'https://sync.example.com',
    accessToken: 'test-access-token',
  };

  const createMockOperation = (
    overrides: Partial<SyncOperation> = {},
  ): SyncOperation => ({
    id: 'op-123',
    clientId: 'client-1',
    actionType: 'ADD_TASK',
    opType: 'CRT',
    entityType: 'TASK',
    entityId: 'task-1',
    payload: { title: 'Test Task' },
    vectorClock: { client1: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockPrivateCfgStore = jasmine.createSpyObj('SyncProviderPrivateCfgStore', [
      'load',
      'setComplete',
    ]);

    provider = new SuperSyncProvider();
    provider.privateCfg = mockPrivateCfgStore;

    // Mock fetch
    fetchSpy = jasmine.createSpy('fetch');
    (globalThis as any).fetch = fetchSpy;

    // Mock localStorage
    localStorageSpy = {
      getItem: jasmine.createSpy('getItem'),
      setItem: jasmine.createSpy('setItem'),
    };
    spyOn(localStorage, 'getItem').and.callFake(localStorageSpy.getItem);
    spyOn(localStorage, 'setItem').and.callFake(localStorageSpy.setItem);
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.calls.reset();
    }
  });

  describe('properties', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe(SyncProviderId.SuperSync);
    });

    it('should not support force upload', () => {
      expect(provider.isUploadForcePossible).toBe(false);
    });

    it('should support operation sync', () => {
      expect(provider.supportsOperationSync).toBe(true);
    });

    it('should have max concurrent requests set to 10', () => {
      expect(provider.maxConcurrentRequests).toBe(10);
    });
  });

  describe('isReady', () => {
    it('should return true when baseUrl and accessToken are configured', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      const result = await provider.isReady();

      expect(result).toBe(true);
    });

    it('should return false when config is null', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));

      const result = await provider.isReady();

      expect(result).toBe(false);
    });

    it('should return false when baseUrl is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(
        Promise.resolve({ accessToken: 'token' } as SuperSyncPrivateCfg),
      );

      const result = await provider.isReady();

      expect(result).toBe(false);
    });

    it('should return false when accessToken is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(
        Promise.resolve({ baseUrl: 'https://sync.example.com' } as SuperSyncPrivateCfg),
      );

      const result = await provider.isReady();

      expect(result).toBe(false);
    });
  });

  describe('setPrivateCfg', () => {
    it('should call privateCfg.setComplete with the config', async () => {
      mockPrivateCfgStore.setComplete.and.returnValue(Promise.resolve());

      await provider.setPrivateCfg(testConfig);

      expect(mockPrivateCfgStore.setComplete).toHaveBeenCalledWith(testConfig);
    });
  });

  describe('file operations (not supported)', () => {
    it('should throw error for getFileRev', async () => {
      await expectAsync(provider.getFileRev('/path', null)).toBeRejectedWithError(
        'SuperSync uses operation-based sync only. File operations not supported.',
      );
    });

    it('should throw error for downloadFile', async () => {
      await expectAsync(provider.downloadFile('/path')).toBeRejectedWithError(
        'SuperSync uses operation-based sync only. File operations not supported.',
      );
    });

    it('should throw error for uploadFile', async () => {
      await expectAsync(provider.uploadFile('/path', 'data', null)).toBeRejectedWithError(
        'SuperSync uses operation-based sync only. File operations not supported.',
      );
    });

    it('should throw error for removeFile', async () => {
      await expectAsync(provider.removeFile('/path')).toBeRejectedWithError(
        'SuperSync uses operation-based sync only. File operations not supported.',
      );
    });

    it('should throw error for listFiles', async () => {
      await expectAsync(provider.listFiles('/path')).toBeRejectedWithError(
        'SuperSync uses operation-based sync only. File operations not supported.',
      );
    });
  });

  describe('uploadOps', () => {
    it('should upload operations successfully', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      const mockResponse = {
        results: [{ opId: 'op-123', accepted: true, serverSeq: 1 }],
        latestSeq: 1,
      };

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      );

      const ops = [createMockOperation()];
      const result = await provider.uploadOps(ops, 'client-1');

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, options] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://sync.example.com/api/sync/ops');
      expect(options.method).toBe('POST');
      expect(options.headers.get('Authorization')).toBe('Bearer test-access-token');
      expect(options.headers.get('Content-Type')).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.ops).toEqual(ops);
      expect(body.clientId).toBe('client-1');
    });

    it('should include lastKnownServerSeq when provided', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [],
              latestSeq: 5,
              newOps: [
                { serverSeq: 3, op: createMockOperation(), receivedAt: Date.now() },
              ],
            }),
        } as Response),
      );

      await provider.uploadOps([createMockOperation()], 'client-1', 2);

      const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
      expect(body.lastKnownServerSeq).toBe(2);
    });

    it('should throw MissingCredentialsSPError when config is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));

      await expectAsync(
        provider.uploadOps([createMockOperation()], 'client-1'),
      ).toBeRejectedWith(jasmine.any(MissingCredentialsSPError));
    });

    it('should throw error on API failure', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server error'),
        } as Response),
      );

      await expectAsync(
        provider.uploadOps([createMockOperation()], 'client-1'),
      ).toBeRejectedWithError(/SuperSync API error: 500/);
    });

    it('should strip trailing slash from baseUrl', async () => {
      mockPrivateCfgStore.load.and.returnValue(
        Promise.resolve({
          ...testConfig,
          baseUrl: 'https://sync.example.com/',
        }),
      );

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [], latestSeq: 0 }),
        } as Response),
      );

      await provider.uploadOps([createMockOperation()], 'client-1');

      const url = fetchSpy.calls.mostRecent().args[0];
      expect(url).toBe('https://sync.example.com/api/sync/ops');
    });
  });

  describe('downloadOps', () => {
    it('should download operations successfully', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      const mockResponse = {
        ops: [{ serverSeq: 1, op: createMockOperation(), receivedAt: Date.now() }],
        hasMore: false,
        latestSeq: 1,
      };

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      );

      const result = await provider.downloadOps(0);

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const url = fetchSpy.calls.mostRecent().args[0];
      expect(url).toBe('https://sync.example.com/api/sync/ops?sinceSeq=0');
    });

    it('should include excludeClient parameter when provided', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ops: [], hasMore: false, latestSeq: 0 }),
        } as Response),
      );

      await provider.downloadOps(0, 'client-1');

      const url = fetchSpy.calls.mostRecent().args[0];
      expect(url).toContain('excludeClient=client-1');
    });

    it('should include limit parameter when provided', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ops: [], hasMore: false, latestSeq: 0 }),
        } as Response),
      );

      await provider.downloadOps(0, undefined, 100);

      const url = fetchSpy.calls.mostRecent().args[0];
      expect(url).toContain('limit=100');
    });

    it('should include all query parameters when provided', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ops: [], hasMore: false, latestSeq: 0 }),
        } as Response),
      );

      await provider.downloadOps(5, 'client-1', 50);

      const url = fetchSpy.calls.mostRecent().args[0];
      expect(url).toContain('sinceSeq=5');
      expect(url).toContain('excludeClient=client-1');
      expect(url).toContain('limit=50');
    });

    it('should throw MissingCredentialsSPError when config is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));

      await expectAsync(provider.downloadOps(0)).toBeRejectedWith(
        jasmine.any(MissingCredentialsSPError),
      );
    });
  });

  describe('getLastServerSeq', () => {
    it('should return 0 when no value is stored', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));
      localStorageSpy.getItem.and.returnValue(null);

      const result = await provider.getLastServerSeq();

      expect(result).toBe(0);
    });

    it('should return stored value when present', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));
      localStorageSpy.getItem.and.returnValue('42');

      const result = await provider.getLastServerSeq();

      expect(result).toBe(42);
    });

    it('should use unique key per server URL', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));
      localStorageSpy.getItem.and.returnValue('10');

      await provider.getLastServerSeq();

      expect(localStorage.getItem).toHaveBeenCalledWith(
        jasmine.stringMatching(/^super_sync_last_server_seq_/),
      );
    });
  });

  describe('setLastServerSeq', () => {
    it('should store the sequence value', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      await provider.setLastServerSeq(100);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        jasmine.stringMatching(/^super_sync_last_server_seq_/),
        '100',
      );
    });
  });

  describe('error handling', () => {
    it('should include error text in API error message', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve('Invalid token'),
        } as Response),
      );

      await expectAsync(provider.downloadOps(0)).toBeRejectedWithError(
        'SuperSync API error: 401 Unauthorized - Invalid token',
      );
    });

    it('should handle text() failure gracefully', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.reject(new Error('Cannot read body')),
        } as Response),
      );

      await expectAsync(provider.downloadOps(0)).toBeRejectedWithError(
        'SuperSync API error: 500 Internal Server Error - Unknown error',
      );
    });
  });

  describe('server URL key generation', () => {
    it('should generate different keys for different URLs', async () => {
      const capturedKeys: string[] = [];
      localStorageSpy.getItem.and.callFake((key: string) => {
        capturedKeys.push(key);
        return null;
      });

      // First URL
      mockPrivateCfgStore.load.and.returnValue(
        Promise.resolve({ ...testConfig, baseUrl: 'https://server1.com' }),
      );
      await provider.getLastServerSeq();

      // Second URL
      mockPrivateCfgStore.load.and.returnValue(
        Promise.resolve({ ...testConfig, baseUrl: 'https://server2.com' }),
      );
      await provider.getLastServerSeq();

      expect(capturedKeys[0]).not.toBe(capturedKeys[1]);
    });

    it('should use default key when config is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));
      localStorageSpy.getItem.and.returnValue(null);

      await provider.getLastServerSeq();

      expect(localStorage.getItem).toHaveBeenCalledWith(
        jasmine.stringMatching(/^super_sync_last_server_seq_/),
      );
    });
  });

  describe('uploadSnapshot', () => {
    it('should upload snapshot with gzip compression', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      const mockResponse = {
        accepted: true,
        serverSeq: 5,
      };

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      );

      const state = { tasks: [{ id: 'task-1', title: 'Test' }] };
      const vectorClock: Record<string, number> = {};
      vectorClock['client-1'] = 3;
      const result = await provider.uploadSnapshot(
        state,
        'client-1',
        'recovery',
        vectorClock,
        1,
      );

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, options] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://sync.example.com/api/sync/snapshot');
      expect(options.method).toBe('POST');
      expect(options.headers.get('Authorization')).toBe('Bearer test-access-token');
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(options.headers.get('Content-Encoding')).toBe('gzip');
    });

    it('should send gzip-compressed body', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accepted: true }),
        } as Response),
      );

      await provider.uploadSnapshot({ data: 'test' }, 'client-1', 'initial', {}, 1);

      const body = fetchSpy.calls.mostRecent().args[1].body;
      expect(body).toBeInstanceOf(Uint8Array);
      // Verify gzip magic number
      expect(body[0]).toBe(0x1f);
      expect(body[1]).toBe(0x8b);
    });

    it('should include all required fields in payload', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      let capturedBody: Uint8Array | null = null;
      fetchSpy.and.callFake(async (_url: string, options: RequestInit) => {
        capturedBody = options.body as Uint8Array;
        return {
          ok: true,
          json: () => Promise.resolve({ accepted: true }),
        } as Response;
      });

      const state = { tasks: [] };
      const vectorClock: Record<string, number> = {};
      vectorClock['client-1'] = 5;
      await provider.uploadSnapshot(state, 'client-1', 'migration', vectorClock, 2);

      // Decompress and verify payload
      expect(capturedBody).not.toBeNull();
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(capturedBody!);
      writer.close();
      const decompressed = await new Response(stream.readable).arrayBuffer();
      const payload = JSON.parse(new TextDecoder().decode(decompressed));

      expect(payload.state).toEqual(state);
      expect(payload.clientId).toBe('client-1');
      expect(payload.reason).toBe('migration');
      expect(payload.vectorClock).toEqual(vectorClock);
      expect(payload.schemaVersion).toBe(2);
    });

    it('should throw MissingCredentialsSPError when config is missing', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(null));

      await expectAsync(
        provider.uploadSnapshot({}, 'client-1', 'recovery', {}, 1),
      ).toBeRejectedWith(jasmine.any(MissingCredentialsSPError));
    });

    it('should throw error on API failure', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 413,
          statusText: 'Payload Too Large',
          text: () => Promise.resolve('Body too large'),
        } as Response),
      );

      await expectAsync(
        provider.uploadSnapshot(
          { largeData: 'x'.repeat(1000) },
          'client-1',
          'recovery',
          {},
          1,
        ),
      ).toBeRejectedWithError(/SuperSync API error: 413/);
    });

    it('should handle different snapshot reasons', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      const reasons: Array<'initial' | 'recovery' | 'migration'> = [
        'initial',
        'recovery',
        'migration',
      ];

      for (const reason of reasons) {
        fetchSpy.and.returnValue(
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ accepted: true }),
          } as Response),
        );

        await provider.uploadSnapshot({}, 'client-1', reason, {}, 1);

        // Verify the reason was included in the compressed payload
        const body = fetchSpy.calls.mostRecent().args[1].body as Uint8Array;
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        writer.write(body);
        writer.close();
        const decompressed = await new Response(stream.readable).arrayBuffer();
        const payload = JSON.parse(new TextDecoder().decode(decompressed));

        expect(payload.reason).toBe(reason);
      }
    });

    it('should compress large payloads effectively', async () => {
      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(testConfig));

      let capturedBody: Uint8Array | null = null;
      fetchSpy.and.callFake(async (_url: string, options: RequestInit) => {
        capturedBody = options.body as Uint8Array;
        return {
          ok: true,
          json: () => Promise.resolve({ accepted: true }),
        } as Response;
      });

      // Create a large repetitive payload (compresses well)
      const largeState = {
        tasks: Array.from({ length: 100 }, (_, i) => ({
          id: `task-${i}`,
          title: `Task number ${i} with description`,
          done: false,
        })),
      };

      await provider.uploadSnapshot(largeState, 'client-1', 'recovery', {}, 1);

      const originalSize = JSON.stringify({
        state: largeState,
        clientId: 'client-1',
        reason: 'recovery',
        vectorClock: {},
        schemaVersion: 1,
      }).length;

      expect(capturedBody).not.toBeNull();
      // Compressed should be significantly smaller
      expect(capturedBody!.length).toBeLessThan(originalSize * 0.5);
    });
  });
});
