import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  isPrismaStatementTimeout,
  reportMonitoringError,
} from '../scripts/monitoring-db';

describe('monitoring errors', () => {
  it('recognizes Prisma raw queries canceled by the PostgreSQL statement timeout', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Raw query failed', {
      code: 'P2010',
      clientVersion: '5.22.0',
      meta: {
        code: '57014',
        message: 'ERROR: canceling statement due to statement timeout',
      },
    });

    expect(isPrismaStatementTimeout(error)).toBe(true);
  });

  it('does not recognize other Prisma raw query failures as statement timeouts', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Raw query failed', {
      code: 'P2010',
      clientVersion: '5.22.0',
      meta: {
        code: '42P01',
        message: 'relation "operations" does not exist',
      },
    });

    expect(isPrismaStatementTimeout(error)).toBe(false);
  });

  it('does not ignore PostgreSQL queries canceled for another reason', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Raw query failed', {
      code: 'P2010',
      clientVersion: '5.22.0',
      meta: {
        code: '57014',
        message: 'ERROR: canceling statement due to user request',
      },
    });

    expect(isPrismaStatementTimeout(error)).toBe(false);
  });

  it('reports statement timeouts without dumping the raw Prisma error', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Raw query failed', {
      code: 'P2010',
      clientVersion: '5.22.0',
      meta: {
        code: '57014',
        message: 'ERROR: canceling statement due to statement timeout',
      },
    });
    const logger = vi.fn();

    reportMonitoringError('Error:', error, logger);
    expect(logger).toHaveBeenCalledWith(
      'Error: PostgreSQL canceled this query because it exceeded statement_timeout.',
    );
    expect(logger).toHaveBeenCalledOnce();
  });

  it('continues to report genuine errors', () => {
    const error = new Error('permission denied');
    const logger = vi.fn();

    reportMonitoringError('Error:', error, logger);
    expect(logger).toHaveBeenCalledWith('Error:', error);
  });
});
