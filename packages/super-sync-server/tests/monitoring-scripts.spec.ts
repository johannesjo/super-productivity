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

/**
 * True when a query names `payload` or `vector_clock` outside the size expression.
 * Projecting either one copies the JSON through an extra materialisation pass —
 * and spills it to temp files when it is stored inline — to produce one integer.
 */
const projectsJsonColumns = (query: string): boolean =>
  /\b(payload|vector_clock)\b/.test(
    query
      .replace(/OCTET_LENGTH\((?:payload|vector_clock)::text\)/g, '')
      .replace(/payload_bytes/g, ''),
  );

/** The per-user tail subquery, where a pushed-down time window would undo the bound. */
const lateralTail = (query: string): string =>
  query.slice(query.indexOf('CROSS JOIN LATERAL'), query.indexOf('AS scoped_ops'));

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

  // Every report here timed out against production on 2026-08-07, and every report
  // that avoids `operations` survived. Each was already bounded in rows returned but
  // not in work done: a 1% TABLESAMPLE still reads 1% of a table that keeps growing,
  // and a per-user tail driven by `user_sync_state` still visits every account that
  // ever registered. Both drivers are now the capped most-recently-active list, so a
  // report's cost is `--users x per-user tail` whatever the table and account count do.
  const ALL_USER_OPERATION_REPORTS = [
    { name: 'monitor ops', script: 'monitor', argv: ['ops'], queries: 1 },
    {
      name: 'operation-sizes',
      script: 'analyze-storage',
      argv: ['operation-sizes'],
      queries: 2,
      // Percentile row: the report reads stats[0] before any table is printed.
      rows: [{}],
    },
    {
      name: 'operation-types',
      script: 'analyze-storage',
      argv: ['operation-types'],
      queries: 3,
    },
    { name: 'large-ops', script: 'analyze-storage', argv: ['large-ops'], queries: 1 },
    { name: 'rapid-fire', script: 'analyze-storage', argv: ['rapid-fire'], queries: 1 },
    {
      name: 'operation-timeline',
      script: 'analyze-storage',
      argv: ['operation-timeline'],
      queries: 2,
    },
  ] as const;

  const SCRIPTS = {
    monitor: () => import('../scripts/monitor'),
    'analyze-storage': () => import('../scripts/analyze-storage'),
  };

  for (const report of ALL_USER_OPERATION_REPORTS) {
    it(`bounds ${report.name} by the capped active-user scope`, async () => {
      mocks.prisma.$queryRaw.mockResolvedValue(('rows' in report && report.rows) || []);
      process.argv = ['node', `${report.script}.ts`, ...report.argv];

      await SCRIPTS[report.script]();
      await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());
      expect(consoleError).not.toHaveBeenCalled();

      const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
      expect(queries).toHaveLength(report.queries);
      for (const query of queries) {
        expect(query).not.toContain('TABLESAMPLE');
        expect(query).not.toContain('user_sync_state');
        expect(query).toMatch(
          /FROM sync_devices[\s\S]*ORDER BY MAX\(last_seen_at\) DESC\s+LIMIT 200/,
        );
        expect(query).toContain('CROSS JOIN LATERAL');
        expect(query).toMatch(/ORDER BY operations\.server_seq DESC\s+LIMIT \d+/);
        expect(projectsJsonColumns(query)).toBe(false);
        // A window inside the tail turns the bounded index read back into a scan of
        // the user's whole history; it belongs outside, on the materialised sample.
        expect(lateralTail(query)).not.toContain('received_at >');
      }
    });
  }

  it('measures sampled operation size without projecting the payload', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([{}]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-sizes'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries.every((query) => !query.includes('pg_column_size(payload)'))).toBe(
      true,
    );
    // Unbackfilled rows (payload_bytes = 0) must still be measured, not filtered out.
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
    // A user-scoped report reads one index tail; it must not fan out over the fleet.
    expect(queries.every((query) => !query.includes('sync_devices'))).toBe(true);
    expect(queries.every((query) => query.includes('WHERE user_id = 42'))).toBe(true);
    expect(queries.every((query) => query.includes('ORDER BY server_seq DESC'))).toBe(
      true,
    );
    expect(queries.every((query) => query.includes('LIMIT 10000'))).toBe(true);
    expect(queries.every((query) => !query.includes('WHERE payload_bytes > 0'))).toBe(
      true,
    );
    expect(queries.every((query) => !projectsJsonColumns(query))).toBe(true);
  });

  it('names the sampled user scope in the recent-operations header', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'monitor.ts', 'ops'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = renderQueryCall(mocks.prisma.$queryRaw.mock.calls[0]);
    expect(query).toMatch(/ORDER BY operations\.server_seq DESC\s+LIMIT 5/);
    expect(consoleLog).toHaveBeenCalledWith(
      'Scope: up to 5 newest operations for each of the up to 200 most recently active users, then the newest 50 candidates overall.',
    );
  });

  it('honours a lowered --users cap', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'rapid-fire', '--users', '25'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = renderQueryCall(mocks.prisma.$queryRaw.mock.calls[0]);
    expect(query).toMatch(/ORDER BY MAX\(last_seen_at\) DESC\s+LIMIT 25/);
    expect(consoleLog).toHaveBeenCalledWith(
      'Based on the newest 100 operations of each of the up to 25 most recently active users (change with --users <n>).',
    );
  });

  it('uses a bounded per-user index tail for user-focused type analysis', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-types', '--user', '42'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries.every((query) => !query.includes('TABLESAMPLE'))).toBe(true);
    expect(queries.every((query) => !query.includes('sync_devices'))).toBe(true);
    expect(queries.every((query) => query.includes('WHERE user_id = 42'))).toBe(true);
    expect(queries.every((query) => query.includes('ORDER BY server_seq DESC'))).toBe(
      true,
    );
    expect(queries.every((query) => query.includes('LIMIT 10000'))).toBe(true);
    expect(queries.every((query) => !query.includes('WHERE payload_bytes > 0'))).toBe(
      true,
    );
    expect(queries.every((query) => !projectsJsonColumns(query))).toBe(true);
  });

  it('includes unbackfilled rows in sampled largest-operation analysis', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'large-ops'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = renderQueryCall(mocks.prisma.$queryRaw.mock.calls[0]);
    expect(query).not.toContain('WHERE payload_bytes > 0');
    expect(query).toContain('ELSE OCTET_LENGTH(payload::text)::bigint +');
    expect(query).toContain('OCTET_LENGTH(vector_clock::text)::bigint');
  });

  it('applies the rapid-fire time window outside the per-user tail', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'rapid-fire'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const query = renderQueryCall(mocks.prisma.$queryRaw.mock.calls[0]);
    expect(query).toMatch(/FROM recent_ops\s+WHERE received_at >/);
    expect(lateralTail(query)).not.toContain('received_at >');
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

  it('applies the timeline time window outside the per-user tail', async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([]);
    process.argv = ['node', 'analyze-storage.ts', 'operation-timeline'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    const queries = mocks.prisma.$queryRaw.mock.calls.map(renderQueryCall);
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => !lateralTail(query).includes('received_at >'))).toBe(
      true,
    );
    expect(
      queries.every((query) => /FROM recent_ops\s+WHERE received_at >/.test(query)),
    ).toBe(true);
  });
});
