import {
  SuperSyncServerOperationSchema,
  type SuperSyncServerOperation,
} from '@sp/shared-schema';
import {
  clearSessionKeyCache,
  encryptBatch,
  setArgon2ParamsForTesting,
} from '@sp/sync-core';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createReproductionPages,
  diagnoseDiagnosticBundle,
  diagnoseEncryptedOperations,
  fetchEncryptedOpsBundle,
  runCli,
  validateDiagnosticBundle,
} from '../scripts/diagnose-encrypted-ops';

const PASSWORD = 'issue-9256-test-password';

const corruptAuthenticationTag = (ciphertext: string): string => {
  const bytes = Buffer.from(ciphertext, 'base64');
  bytes[bytes.length - 1] ^= 1;
  return bytes.toString('base64');
};

const createEncryptedServerOps = async (
  count: number,
): Promise<SuperSyncServerOperation[]> => {
  const plaintexts = Array.from({ length: count }, (_, index) =>
    JSON.stringify({
      actionPayload: {
        id: `task-${index + 1}`,
        changes: { isDone: false },
      },
      entityChanges: [
        {
          entityType: 'TASK',
          entityId: `task-${index + 1}`,
          changeType: 'update',
        },
      ],
    }),
  );
  const ciphertexts = await encryptBatch(plaintexts, PASSWORD);

  return ciphertexts.map((payload, index) =>
    SuperSyncServerOperationSchema.parse({
      serverSeq: index + 1,
      receivedAt: 1_700_000_000_000 + index,
      op: {
        id: `op-${index + 1}`,
        clientId: 'clientA',
        actionType: '[Task] Update Task',
        opType: 'UPD',
        entityType: 'TASK',
        entityId: `task-${index + 1}`,
        payload,
        vectorClock: { clientA: index + 1 },
        timestamp: 1_700_000_000_000 + index,
        schemaVersion: 5,
        isPayloadEncrypted: true,
      },
    }),
  );
};

const createServerOp = (
  serverSeq: number,
  overrides: {
    clientId?: string;
    opType?: 'UPD' | 'SYNC_IMPORT';
  } = {},
): SuperSyncServerOperation =>
  SuperSyncServerOperationSchema.parse({
    serverSeq,
    receivedAt: 1_700_000_000_000 + serverSeq,
    op: {
      id: `op-${serverSeq}`,
      clientId: overrides.clientId ?? 'clientA',
      actionType:
        overrides.opType === 'SYNC_IMPORT' ? 'LOAD_ALL_DATA' : '[Task] Update Task',
      opType: overrides.opType ?? 'UPD',
      entityType: 'TASK',
      entityId: `task-${serverSeq}`,
      payload: `ciphertext-${serverSeq}`,
      vectorClock: { clientA: serverSeq },
      timestamp: 1_700_000_000_000 + serverSeq,
      schemaVersion: 5,
      isPayloadEncrypted: true,
    },
  });

describe('diagnoseEncryptedOperations', () => {
  beforeAll(() => {
    setArgon2ParamsForTesting({ parallelism: 1, memorySize: 8, iterations: 1 });
  });

  afterAll(() => {
    setArgon2ParamsForTesting();
  });

  afterEach(() => {
    clearSessionKeyCache();
  });

  it('limits a successful result to decryption and JSON parsing', async () => {
    const operations = await createEncryptedServerOps(2);

    const result = await diagnoseEncryptedOperations(operations, PASSWORD);

    expect(result).toEqual({
      batchStatus: 'passed',
      classification: 'decrypts-and-parses-only',
      decryptedCount: 2,
      parsedCount: 2,
      failures: [],
    });
  });

  it('attributes one corrupted ciphertext after reproducing the batch failure', async () => {
    const operations = await createEncryptedServerOps(50);
    operations[37] = {
      ...operations[37],
      op: {
        ...operations[37].op,
        payload: corruptAuthenticationTag(operations[37].op.payload as string),
      },
    };

    const result = await diagnoseEncryptedOperations(operations, PASSWORD);

    expect(result).toEqual({
      batchStatus: 'failed',
      classification: 'operation-failures',
      decryptedCount: 49,
      parsedCount: 49,
      failures: [
        {
          serverSeq: 38,
          opId: 'op-38',
          stage: 'decrypt',
        },
      ],
    });
  });

  it('attributes invalid decrypted JSON to the parse stage', async () => {
    const operations = await createEncryptedServerOps(2);
    const [, invalidJsonCiphertext] = await encryptBatch(
      [JSON.stringify({ valid: true }), 'not-json'],
      PASSWORD,
    );
    operations[1] = {
      ...operations[1],
      op: { ...operations[1].op, payload: invalidJsonCiphertext },
    };

    const result = await diagnoseEncryptedOperations(operations, PASSWORD);

    expect(result).toEqual({
      batchStatus: 'passed',
      classification: 'operation-failures',
      decryptedCount: 2,
      parsedCount: 1,
      failures: [{ serverSeq: 2, opId: 'op-2', stage: 'parse' }],
    });
  });

  it('reports only that zero operations decrypted with a different password', async () => {
    const operations = await createEncryptedServerOps(3);

    const result = await diagnoseEncryptedOperations(operations, 'different-password');

    expect(result.batchStatus).toBe('failed');
    expect(result.classification).toBe('no-operation-decrypted');
    expect(result.decryptedCount).toBe(0);
    expect(result.parsedCount).toBe(0);
    expect(result.failures).toEqual([
      { serverSeq: 1, opId: 'op-1', stage: 'decrypt' },
      { serverSeq: 2, opId: 'op-2', stage: 'decrypt' },
      { serverSeq: 3, opId: 'op-3', stage: 'decrypt' },
    ]);
  });

  it('flags a plaintext operation before attempting crypto', async () => {
    const plaintextOperation = createServerOp(1);
    plaintextOperation.op.payload = { id: 'task-1', title: 'must-not-be-logged' };
    plaintextOperation.op.isPayloadEncrypted = false;

    const result = await diagnoseEncryptedOperations([plaintextOperation], PASSWORD);

    expect(result).toEqual({
      batchStatus: 'passed',
      classification: 'operation-failures',
      decryptedCount: 0,
      parsedCount: 0,
      failures: [{ serverSeq: 1, opId: 'op-1', stage: 'envelope' }],
    });
  });
});

describe('fetchEncryptedOpsBundle', () => {
  it('captures validated unfiltered pages under one immutable latestSeq', async () => {
    const responses = [
      {
        ops: [createServerOp(10, { opType: 'SYNC_IMPORT' }), createServerOp(11)],
        hasMore: true,
        latestSeq: 12,
      },
      {
        ops: [createServerOp(12)],
        hasMore: false,
        latestSeq: 12,
      },
    ];
    const fetchImpl = vi.fn(async () => {
      const body = responses.shift();
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: 'https://sync.example.test/',
      accessToken: 'secret-access-token',
      fetchImpl,
      capturedAt: new Date('2026-07-27T10:00:00.000Z'),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0].toString()).toBe(
      'https://sync.example.test/api/sync/ops?sinceSeq=0&limit=500',
    );
    expect(fetchImpl.mock.calls[1][0].toString()).toBe(
      'https://sync.example.test/api/sync/ops?sinceSeq=11&limit=500',
    );
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      redirect: 'error',
      headers: {
        Authorization: 'Bearer secret-access-token',
        Accept: 'application/json',
      },
    });
    expect(bundle).toMatchObject({
      format: 'super-productivity-encrypted-ops-diagnostic',
      version: 1,
      capturedAt: '2026-07-27T10:00:00.000Z',
      sourceBaseUrl: 'https://sync.example.test',
      pageSize: 500,
      latestSeq: 12,
    });
    expect(bundle.pages.map((page) => page.requestSinceSeq)).toEqual([0, 11]);
    expect(JSON.stringify(bundle)).not.toContain('secret-access-token');
    expect(validateDiagnosticBundle(JSON.parse(JSON.stringify(bundle)))).toEqual(bundle);
  });

  it('captures raw history beyond the client post-filter memory limit', async () => {
    const latestSeq = 50_001;
    let nextServerSeq = 1;
    const fetchImpl = vi.fn(async () => {
      const count = Math.min(500, latestSeq - nextServerSeq + 1);
      const ops = Array.from({ length: count }, (_, index) =>
        createServerOp(nextServerSeq + index),
      );
      nextServerSeq += count;
      return new Response(
        JSON.stringify({
          ops,
          hasMore: nextServerSeq <= latestSeq,
          latestSeq,
        }),
        { status: 200 },
      );
    });

    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: 'https://sync.example.test',
      accessToken: 'secret-access-token',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(101);
    expect(bundle.pages.flatMap((page) => page.ops)).toHaveLength(latestSeq);
  });

  it('aborts instead of combining pages from different latestSeq snapshots', async () => {
    const responses = [
      {
        ops: [createServerOp(1)],
        hasMore: true,
        latestSeq: 2,
      },
      {
        ops: [createServerOp(2)],
        hasMore: false,
        latestSeq: 3,
      },
    ];
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify(responses.shift()), { status: 200 });
    });

    await expect(
      fetchEncryptedOpsBundle({
        baseUrl: 'https://sync.example.test',
        accessToken: 'secret-access-token',
        fetchImpl,
      }),
    ).rejects.toThrow('latestSeq changed');
  });

  it('fails closed when an operation envelope contains unknown fields', async () => {
    const operation = {
      ...createServerOp(1),
      futurePrivateField: 'must-not-be-persisted',
    };
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ops: [operation],
          hasMore: false,
          latestSeq: 1,
        }),
        { status: 200 },
      );
    });

    await expect(
      fetchEncryptedOpsBundle({
        baseUrl: 'https://sync.example.test',
        accessToken: 'secret-access-token',
        fetchImpl,
      }),
    ).rejects.toThrow('unsupported or invalid fields');
  });

  it('rejects unsafe sequence boundaries and duplicate operation IDs', async () => {
    const duplicateIdOperation = createServerOp(2);
    duplicateIdOperation.op.id = 'op-1';
    const invalidResponses: Array<{
      ops: SuperSyncServerOperation[];
      latestSeq: number;
      expectedError: string;
    }> = [
      {
        ops: [createServerOp(2)],
        latestSeq: 2,
        expectedError: 'safe full-state boundary',
      },
      {
        ops: [createServerOp(1), createServerOp(3)],
        latestSeq: 3,
        expectedError: 'server-sequence gap',
      },
      {
        ops: [createServerOp(1), duplicateIdOperation],
        latestSeq: 2,
        expectedError: 'duplicate operation ID',
      },
    ];

    for (const invalidResponse of invalidResponses) {
      const fetchImpl = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            ops: invalidResponse.ops,
            hasMore: false,
            latestSeq: invalidResponse.latestSeq,
          }),
          { status: 200 },
        );
      });

      await expect(
        fetchEncryptedOpsBundle({
          baseUrl: 'https://sync.example.test',
          accessToken: 'secret-access-token',
          fetchImpl,
        }),
      ).rejects.toThrow(invalidResponse.expectedError);
    }
  });

  it('rejects a bundle whose encrypted content changed after capture', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ops: [createServerOp(1)],
          hasMore: false,
          latestSeq: 1,
        }),
        { status: 200 },
      );
    });
    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: 'https://sync.example.test',
      accessToken: 'secret-access-token',
      fetchImpl,
    });
    const tampered = structuredClone(bundle);
    tampered.pages[0].ops[0].op.payload = 'different-ciphertext';

    expect(() => validateDiagnosticBundle(tampered)).toThrow('checksum');
  });
});

describe('createReproductionPages', () => {
  it('excludes a client before paging and applied IDs inside each raw page', async () => {
    const allOperations = Array.from({ length: 502 }, (_, index) =>
      createServerOp(index + 1, {
        clientId: index + 1 === 250 || index + 1 === 501 ? 'currentClient' : 'clientA',
      }),
    );
    const responses = [
      {
        ops: allOperations.slice(0, 500),
        hasMore: true,
        latestSeq: 502,
      },
      {
        ops: allOperations.slice(500),
        hasMore: false,
        latestSeq: 502,
      },
    ];
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify(responses.shift()), { status: 200 });
    });
    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: 'https://sync.example.test',
      accessToken: 'secret-access-token',
      fetchImpl,
    });

    const pages = createReproductionPages(bundle, {
      excludeClient: 'currentClient',
      appliedOperationIds: new Set(['op-400']),
    });

    expect(pages).toHaveLength(1);
    expect(pages[0].requestSinceSeq).toBe(0);
    expect(pages[0].rawOperationCount).toBe(500);
    expect(pages[0].operations).toHaveLength(499);
    expect(pages[0].operations.some(({ op }) => op.id === 'op-400')).toBe(false);
    expect(pages[0].operations.at(-1)?.serverSeq).toBe(502);
  });

  it('starts paging after the client persisted cursor before applying stored IDs', async () => {
    const allOperations = Array.from({ length: 1_300 }, (_, index) =>
      createServerOp(index + 1),
    );
    const responses = [
      {
        ops: allOperations.slice(0, 500),
        hasMore: true,
        latestSeq: 1_300,
      },
      {
        ops: allOperations.slice(500, 1_000),
        hasMore: true,
        latestSeq: 1_300,
      },
      {
        ops: allOperations.slice(1_000),
        hasMore: false,
        latestSeq: 1_300,
      },
    ];
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify(responses.shift()), { status: 200 });
    });
    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: 'https://sync.example.test',
      accessToken: 'secret-access-token',
      fetchImpl,
    });

    const pages = createReproductionPages(bundle, {
      sinceSeq: 750,
      appliedOperationIds: new Set(['op-800']),
    });

    expect(pages).toHaveLength(2);
    expect(pages[0].requestSinceSeq).toBe(750);
    expect(pages[0].rawOperationCount).toBe(500);
    expect(pages[0].operations).toHaveLength(499);
    expect(pages[0].operations[0].serverSeq).toBe(751);
    expect(pages[0].operations.at(-1)?.serverSeq).toBe(1_250);
    expect(pages[1].requestSinceSeq).toBe(1_250);
    expect(pages[1].rawOperationCount).toBe(50);
    expect(pages[1].operations.at(-1)?.serverSeq).toBe(1_300);
    expect(() => createReproductionPages(bundle, { sinceSeq: 1_301 })).toThrow(
      'reset-to-zero',
    );
  });
});

describe('diagnoseDiagnosticBundle', () => {
  it('reports password evidence and the exact failing page without plaintext', async () => {
    const operations = await createEncryptedServerOps(3);
    operations[2] = {
      ...operations[2],
      op: {
        ...operations[2].op,
        payload: corruptAuthenticationTag(operations[2].op.payload as string),
      },
    };
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ops: operations,
          hasMore: false,
          latestSeq: 3,
        }),
        { status: 200 },
      );
    });
    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: 'https://sync.example.test',
      accessToken: 'secret-access-token',
      fetchImpl,
    });

    const report = await diagnoseDiagnosticBundle(bundle, PASSWORD);

    expect(report).toMatchObject({
      bundleChecksumSha256: bundle.checksumSha256,
      latestSeq: 3,
      classification: 'operation-failures',
      passwordEvidence: 'confirmed-for-some-operations',
      rawOperationCount: 3,
      diagnosedOperationCount: 3,
      decryptedCount: 2,
      parsedCount: 2,
      failureCount: 1,
      pages: [
        {
          pageNumber: 1,
          requestSinceSeq: 0,
          firstServerSeq: 1,
          lastServerSeq: 3,
          rawOperationCount: 3,
          diagnosedOperationCount: 3,
          batchStatus: 'failed',
          classification: 'operation-failures',
          decryptedCount: 2,
          parsedCount: 2,
          failures: [{ serverSeq: 3, opId: 'op-3', stage: 'decrypt' }],
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain('isDone');
    expect(JSON.stringify(report)).not.toContain(PASSWORD);
  });
});

describe('diagnose-encrypted-ops CLI', () => {
  it('fetches to a private file without persisting the access token', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'sp-encrypted-ops-'));
    const tokenFile = join(directory, 'token.txt');
    const bundleFile = join(directory, 'bundle.json');
    writeFileSync(tokenFile, 'secret-access-token\n', { mode: 0o600 });
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ops: [createServerOp(1)],
          hasMore: false,
          latestSeq: 1,
        }),
        { status: 200 },
      );
    });
    const logs: string[] = [];

    try {
      await runCli(
        [
          'fetch',
          '--base-url',
          'https://sync.example.test',
          '--token-file',
          tokenFile,
          '--out',
          bundleFile,
        ],
        {
          fetchImpl,
          capturedAt: new Date('2026-07-27T10:00:00.000Z'),
          log: (message) => logs.push(message),
        },
      );

      const serialized = readFileSync(bundleFile, 'utf8');
      expect(serialized).not.toContain('secret-access-token');
      expect(validateDiagnosticBundle(JSON.parse(serialized))).toMatchObject({
        latestSeq: 1,
      });
      expect(statSync(bundleFile).mode & 0o077).toBe(0);
      expect(logs.join('\n')).toContain('latestSeq 1');
      await expect(
        runCli(
          [
            'fetch',
            '--base-url',
            'https://sync.example.test',
            '--token-file',
            tokenFile,
            '--out',
            bundleFile,
          ],
          { fetchImpl, log: () => undefined },
        ),
      ).rejects.toThrow('already exists');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
