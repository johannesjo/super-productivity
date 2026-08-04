import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma = {
    $queryRaw: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    $disconnect: vi.fn<() => Promise<void>>(),
  };
  return {
    prisma,
    existsSync: vi.fn<(path: string) => boolean>(),
    readFileSync: vi.fn<(path: string, encoding: string) => string>(),
    PrismaClient: vi.fn(function () {
      return prisma;
    }),
  };
});

vi.mock('@prisma/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@prisma/client')>()),
  PrismaClient: mocks.PrismaClient,
}));

vi.mock('fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('fs')>()),
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
}));

const statementTimeout = (): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('Raw query failed', {
    code: 'P2010',
    clientVersion: '5.22.0',
    meta: {
      code: '57014',
      message: 'ERROR: canceling statement due to statement timeout',
    },
  });

const renderSqlValue = (value: unknown): string => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'strings' in value &&
    'values' in value
  ) {
    const sql = value as { strings: string[]; values: unknown[] };
    return sql.strings.reduce(
      (rendered, part, index) =>
        rendered +
        part +
        (index < sql.values.length ? renderSqlValue(sql.values[index]) : ''),
      '',
    );
  }
  return String(value ?? 'NULL');
};

const renderQueryCall = (call: unknown[]): string => {
  const strings = call[0] as TemplateStringsArray;
  return strings.reduce(
    (rendered, part, index) =>
      rendered + part + (index + 1 < call.length ? renderSqlValue(call[index + 1]) : ''),
    '',
  );
};

describe('monitoring script error handling', () => {
  let previousExitCode: typeof process.exitCode;
  let previousArgv: string[];
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleTable: ReturnType<typeof vi.spyOn>;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    previousExitCode = process.exitCode;
    previousArgv = process.argv;
    process.exitCode = undefined;
    mocks.prisma.$queryRaw.mockReset();
    mocks.prisma.$disconnect.mockReset().mockResolvedValue();
    mocks.existsSync.mockReset().mockReturnValue(false);
    mocks.readFileSync.mockReset();
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleTable = vi.spyOn(console, 'table').mockImplementation(() => undefined);
    exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Unexpected process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    process.argv = previousArgv;
    vi.restoreAllMocks();
  });

  it('reports a monitor timeout, fails, and disconnects', async () => {
    mocks.prisma.$queryRaw.mockRejectedValue(statementTimeout());
    process.argv = ['node', 'monitor.ts', 'usage', '--no-save'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(mocks.PrismaClient).toHaveBeenCalledWith({ log: [] });
    expect(consoleError).toHaveBeenCalledWith(
      'Error fetching usage data: PostgreSQL canceled this query because it exceeded statement_timeout.',
    );
    expect(process.exitCode).toBe(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it('continues to report genuine monitor errors', async () => {
    const error = new Error('permission denied');
    mocks.prisma.$queryRaw.mockRejectedValue(error);
    process.argv = ['node', 'monitor.ts', 'usage', '--no-save'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(consoleError).toHaveBeenCalledWith('Error fetching usage data:', error);
    expect(process.exitCode).toBe(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it('reports an analysis timeout, fails, and disconnects', async () => {
    mocks.prisma.$queryRaw.mockRejectedValue(statementTimeout());
    process.argv = ['node', 'analyze-storage.ts', 'operation-sizes'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(consoleError).toHaveBeenCalledWith(
      'Error: PostgreSQL canceled this query because it exceeded statement_timeout.',
    );
    expect(process.exitCode).toBe(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it('reports genuine analysis errors, disconnects, and sets a failing exit code', async () => {
    const error = new Error('permission denied');
    mocks.prisma.$queryRaw.mockRejectedValue(error);
    process.argv = ['node', 'analyze-storage.ts', 'operation-sizes'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(consoleError).toHaveBeenCalledWith('Error:', error);
    expect(process.exitCode).toBe(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it('reads user storage from the cached counter without scanning operations', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        email: 'user@example.com',
        ops_bytes: BigInt(800),
        last_seq: 12,
        snapshot_bytes: BigInt(200),
        total_bytes: BigInt(1000),
      },
    ]);
    process.argv = ['node', 'monitor.ts', 'usage', '--no-save'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = (mocks.prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join(
      ' ',
    );
    expect(query).toContain('storage_used_bytes');
    expect(query).not.toContain('FROM operations');
    expect(consoleTable).toHaveBeenCalledOnce();
  });

  it('samples all-user operation-size analysis instead of scanning full payloads', async () => {
    mocks.prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          p10: 100,
          p25: 100,
          p50: 100,
          p75: 100,
          p90: 100,
          p95: 100,
          p99: 100,
          min_size: BigInt(100),
          max_size: BigInt(100),
          avg_size: 100,
          total_ops: BigInt(1),
        },
      ])
      .mockResolvedValueOnce([
        { size_bucket: '0-512B', count: BigInt(1), total_bytes: BigInt(100) },
      ]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-sizes'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => query.includes('TABLESAMPLE SYSTEM (1)'))).toBe(true);
    expect(queries.every((query) => !query.includes('pg_column_size(payload)'))).toBe(
      true,
    );
    expect(queries.every((query) => !query.includes('WHERE payload_bytes > 0'))).toBe(
      true,
    );
    expect(
      queries.every(
        (query) =>
          query.includes('ELSE OCTET_LENGTH(payload::text)::bigint +') &&
          query.includes('OCTET_LENGTH(vector_clock::text)::bigint'),
      ),
    ).toBe(true);
    const sampleSeeds = queries.map((query) => query.match(/REPEATABLE \((\d+)\)/)?.[1]);
    expect(sampleSeeds[0]).toBeDefined();
    expect(new Set(sampleSeeds).size).toBe(1);
  });

  it('uses a bounded per-user index tail for user-focused size analysis', async () => {
    mocks.prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          p10: 100,
          p25: 100,
          p50: 100,
          p75: 100,
          p90: 100,
          p95: 100,
          p99: 100,
          min_size: BigInt(100),
          max_size: BigInt(100),
          avg_size: 100,
          total_ops: BigInt(1),
        },
      ])
      .mockResolvedValueOnce([]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-sizes', '--user', '42'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries.every((query) => !query.includes('TABLESAMPLE'))).toBe(true);
    expect(queries.every((query) => query.includes('WHERE user_id = 42'))).toBe(true);
    expect(queries.every((query) => query.includes('ORDER BY server_seq DESC'))).toBe(
      true,
    );
    expect(queries.every((query) => query.includes('LIMIT 10000'))).toBe(true);
    expect(queries.every((query) => !query.includes('WHERE payload_bytes > 0'))).toBe(
      true,
    );
    expect(
      queries.every((query) => query.indexOf('LIMIT 10000') < query.indexOf('CASE')),
    ).toBe(true);
  });

  it('bounds recent operation analysis through each user index', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'monitor.ts', 'ops'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = renderQueryCall(mocks.prisma.$queryRaw.mock.calls[0]);
    expect(query).toContain('CROSS JOIN LATERAL');
    expect(query).toContain('ORDER BY o.server_seq DESC');
    expect(query).toContain('LIMIT 5');
    expect(consoleLog).toHaveBeenCalledWith(
      'Scope: up to 5 newest operations per user, then the newest 50 candidates overall.',
    );
  });

  it('samples operation-type analysis using stored byte counters', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-types'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries).toHaveLength(3);
    expect(queries.every((query) => query.includes('TABLESAMPLE SYSTEM (1)'))).toBe(true);
    expect(queries.every((query) => query.includes('payload_bytes'))).toBe(true);
    expect(queries.every((query) => !query.includes('WHERE payload_bytes > 0'))).toBe(
      true,
    );
    expect(
      queries.every(
        (query) =>
          query.includes('ELSE OCTET_LENGTH(payload::text)::bigint +') &&
          query.includes('OCTET_LENGTH(vector_clock::text)::bigint'),
      ),
    ).toBe(true);
    const sampleSeeds = queries.map((query) => query.match(/REPEATABLE \((\d+)\)/)?.[1]);
    expect(sampleSeeds[0]).toBeDefined();
    expect(new Set(sampleSeeds).size).toBe(1);
  });

  it('uses a bounded per-user index tail for user-focused type analysis', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-types', '--user', '42'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries.every((query) => !query.includes('TABLESAMPLE'))).toBe(true);
    expect(queries.every((query) => query.includes('WHERE user_id = 42'))).toBe(true);
    expect(queries.every((query) => query.includes('ORDER BY server_seq DESC'))).toBe(
      true,
    );
    expect(queries.every((query) => query.includes('LIMIT 10000'))).toBe(true);
    expect(queries.every((query) => !query.includes('WHERE payload_bytes > 0'))).toBe(
      true,
    );
    expect(
      queries.every((query) => query.indexOf('LIMIT 10000') < query.indexOf('CASE')),
    ).toBe(true);
  });

  it('includes unbackfilled rows in sampled largest-operation analysis', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'large-ops'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = renderQueryCall(mocks.prisma.$queryRaw.mock.calls[0]);
    expect(query).not.toContain('WHERE o.payload_bytes > 0');
    expect(query).toContain('ELSE OCTET_LENGTH(o.payload::text)::bigint +');
    expect(query).toContain('OCTET_LENGTH(o.vector_clock::text)::bigint');
  });

  it('bounds rapid-fire analysis to recent operations per active user', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'rapid-fire'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = (mocks.prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join(
      ' ',
    );
    expect(query).toContain('CROSS JOIN LATERAL');
    expect(query).toContain('ORDER BY o.server_seq DESC');
    expect(query).toContain('LIMIT 100');
    expect(query).toContain('FROM recent_ops');
    expect(query).toMatch(/FROM recent_ops\s+WHERE received_at >/);
  });

  it('uses sync-state counters for snapshot analysis without scanning operations', async () => {
    mocks.prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          users_with_snapshot: BigInt(1),
          users_without_snapshot: BigInt(0),
          avg_snapshot_size: 100,
          max_snapshot_size: 100,
          total_snapshot_size: BigInt(100),
        },
      ])
      .mockResolvedValueOnce([]);
    process.argv = ['node', 'analyze-storage.ts', 'snapshot-analysis'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = (mocks.prisma.$queryRaw.mock.calls[1][0] as TemplateStringsArray).join(
      ' ',
    );
    expect(query).toContain('s.last_seq');
    expect(query).not.toContain('FROM operations');
  });

  it('keeps usage-history growth within the current metric version', async () => {
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(
      [
        JSON.stringify({
          timestamp: '2026-08-01T00:00:00.000Z',
          totalBytes: 100,
          userCount: 1,
          users: [],
        }),
        JSON.stringify({
          metricVersion: 2,
          timestamp: '2026-08-02T00:00:00.000Z',
          totalBytes: 200,
          userCount: 1,
          users: [],
        }),
        JSON.stringify({
          metricVersion: 2,
          timestamp: '2026-08-03T00:00:00.000Z',
          totalBytes: 250,
          userCount: 1,
          users: [],
        }),
      ].join('\n'),
    );
    process.argv = ['node', 'monitor.ts', 'usage-history'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(consoleTable.mock.calls[0][0]).toHaveLength(2);
    expect(consoleLog).toHaveBeenCalledWith(
      'Ignoring 1 older snapshot because its storage metric is not comparable.',
    );
    expect(consoleLog).toHaveBeenCalledWith('\nGrowth over 1.0 days: +50 Bytes');
  });

  it('bounds timeline analysis to recent operations per active user', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-timeline'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map((call) =>
      (call[0] as TemplateStringsArray).join(' '),
    );
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => query.includes('CROSS JOIN LATERAL'))).toBe(true);
    expect(queries.every((query) => query.includes('LIMIT 100'))).toBe(true);
    expect(queries.every((query) => !query.includes('AND o.received_at >'))).toBe(true);
    expect(
      queries.every((query) => /FROM recent_ops\s+WHERE received_at >/.test(query)),
    ).toBe(true);
  });
});
