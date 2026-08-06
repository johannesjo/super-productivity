import { Prisma, PrismaClient } from '@prisma/client';

// Monitoring commands report query failures themselves, so Prisma's duplicate
// client-level error logging would only add noise.
export const prisma = new PrismaClient({ log: [] });

export const disconnectDb = async (): Promise<void> => {
  await prisma.$disconnect();
};

export const isPrismaStatementTimeout = (error: unknown): boolean => {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2010'
  ) {
    return false;
  }

  const meta = error.meta;
  return (
    meta?.code === '57014' &&
    typeof meta.message === 'string' &&
    meta.message.includes('canceling statement due to statement timeout')
  );
};

export const reportMonitoringError = (
  message: string,
  error: unknown,
  logger: (message: string, error?: unknown) => void = console.error,
): void => {
  if (isPrismaStatementTimeout(error)) {
    logger(
      `${message} PostgreSQL canceled this query because it exceeded statement_timeout.`,
    );
    return;
  }

  logger(message, error);
};
