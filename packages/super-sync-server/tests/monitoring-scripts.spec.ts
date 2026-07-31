import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma = {
    $queryRaw: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    $disconnect: vi.fn<() => Promise<void>>(),
  };
  return {
    prisma,
    PrismaClient: vi.fn(function () {
      return prisma;
    }),
    exec: vi.fn<(...args: unknown[]) => unknown>(),
  };
});

vi.mock('@prisma/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@prisma/client')>()),
  PrismaClient: mocks.PrismaClient,
}));

vi.mock('child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('child_process')>()),
  exec: mocks.exec,
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

describe('monitoring script error handling', () => {
  let previousExitCode: typeof process.exitCode;
  let previousArgv: string[];
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    previousExitCode = process.exitCode;
    previousArgv = process.argv;
    process.exitCode = undefined;
    mocks.prisma.$queryRaw.mockReset();
    mocks.prisma.$disconnect.mockReset().mockResolvedValue();
    mocks.exec.mockReset();
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Unexpected process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    process.argv = previousArgv;
    vi.restoreAllMocks();
  });

  it('reports a monitor query timeout and exits unsuccessfully', async () => {
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

  it('reports an analysis query timeout and exits unsuccessfully', async () => {
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

  it('continues the monitoring suite after child failures and exits unsuccessfully', async () => {
    let invocation = 0;
    mocks.exec.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback !== 'function') {
        throw new Error('Expected exec callback');
      }
      invocation += 1;
      const isMaxBufferFailure = invocation === 1;
      const stderr = isMaxBufferFailure ? 'ExperimentalWarning' : 'query timed out';
      callback(
        Object.assign(
          new Error(
            isMaxBufferFailure
              ? 'stdout maxBuffer length exceeded'
              : 'Command failed: monitor\nquery timed out',
          ),
          {
            stdout: 'partial output',
            stderr,
          },
        ),
      );
    });
    process.argv = ['node', 'run-all-monitoring.ts', '--quick'];

    await import('../scripts/run-all-monitoring');
    await vi.waitFor(() => expect(mocks.exec).toHaveBeenCalledTimes(8));

    expect(consoleLog).toHaveBeenCalledWith('⚠️ Monitoring completed with errors.\n');
    expect(consoleLog).not.toHaveBeenCalledWith('✅ Monitoring complete!\n');
    expect(consoleError).toHaveBeenCalledTimes(8);
    expect(String(consoleError.mock.calls[0][0])).toContain(
      'stdout maxBuffer length exceeded',
    );
    expect(String(consoleError.mock.calls[0][0])).toContain('ExperimentalWarning');
    for (const [message] of consoleError.mock.calls.slice(1)) {
      expect(String(message).match(/query timed out/g)).toHaveLength(1);
    }
    expect(process.exitCode).toBe(1);
    expect(exit).not.toHaveBeenCalled();
  });
});
