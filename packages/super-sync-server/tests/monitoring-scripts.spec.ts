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
  };
});

vi.mock('@prisma/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@prisma/client')>()),
  PrismaClient: mocks.PrismaClient,
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
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
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

  it('silently completes and disconnects when the monitor query times out', async () => {
    mocks.prisma.$queryRaw.mockRejectedValue(statementTimeout());
    process.argv = ['node', 'monitor.ts', 'usage', '--no-save'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(mocks.PrismaClient).toHaveBeenCalledWith({ log: [] });
    expect(consoleError).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
    expect(exit).not.toHaveBeenCalled();
  });

  it('continues to report genuine monitor errors', async () => {
    const error = new Error('permission denied');
    mocks.prisma.$queryRaw.mockRejectedValue(error);
    process.argv = ['node', 'monitor.ts', 'usage', '--no-save'];

    await import('../scripts/monitor');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(consoleError).toHaveBeenCalledWith('Error fetching usage data:', error);
    expect(process.exitCode).toBeUndefined();
    expect(exit).not.toHaveBeenCalled();
  });

  it('silently completes and disconnects when the analysis query times out', async () => {
    mocks.prisma.$queryRaw.mockRejectedValue(statementTimeout());
    process.argv = ['node', 'analyze-storage.ts', 'operation-sizes'];

    await import('../scripts/analyze-storage');
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalledOnce());

    expect(consoleError).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
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
});
