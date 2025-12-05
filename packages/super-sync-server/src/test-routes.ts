/**
 * Test-only routes for E2E testing.
 * These routes are only available when TEST_MODE=true.
 *
 * NEVER enable in production!
 */
import { FastifyInstance } from 'fastify';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { getDb } from './db';
import { Logger } from './logger';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

interface CreateUserBody {
  email: string;
  password: string;
}

export const testRoutes = async (fastify: FastifyInstance): Promise<void> => {
  /**
   * Create a test user with auto-verification.
   * Returns a JWT token immediately without email verification.
   */
  fastify.post<{ Body: CreateUserBody }>(
    '/create-user',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const db = getDb();
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      try {
        // Check if user already exists
        const existingUser = db
          .prepare('SELECT id, email FROM users WHERE email = ?')
          .get(email) as { id: number; email: string } | undefined;

        let userId: number;

        if (existingUser) {
          // User exists, just return a token for them
          userId = existingUser.id;
          Logger.info(`[TEST] Returning existing user: ${email} (ID: ${userId})`);
        } else {
          // Create user with is_verified=1 (skip email verification)
          const info = db
            .prepare(
              `
              INSERT INTO users (email, password_hash, is_verified, verification_token, verification_token_expires_at)
              VALUES (?, ?, 1, NULL, NULL)
            `,
            )
            .run(email, passwordHash);

          userId = info.lastInsertRowid as number;
          Logger.info(`[TEST] Created test user: ${email} (ID: ${userId})`);
        }

        // Generate JWT token
        const token = jwt.sign({ userId, email }, getJwtSecret(), {
          expiresIn: JWT_EXPIRY,
        });

        return reply.status(201).send({
          token,
          userId,
          email,
        });
      } catch (err: unknown) {
        Logger.error('[TEST] Failed to create test user:', err);
        return reply.status(500).send({
          error: 'Failed to create test user',
          message: (err as Error).message,
        });
      }
    },
  );

  /**
   * Clean up all test data.
   * Wipes users, operations, sync state, and devices.
   */
  fastify.post('/cleanup', async (_request, reply) => {
    const db = getDb();

    try {
      // Delete in correct order due to foreign key constraints
      db.exec('DELETE FROM operations');
      db.exec('DELETE FROM sync_devices');
      db.exec('DELETE FROM user_sync_state');
      db.exec('DELETE FROM tombstones');
      db.exec('DELETE FROM users');

      Logger.info('[TEST] All test data cleaned up');

      return reply.send({ cleaned: true });
    } catch (err: unknown) {
      Logger.error('[TEST] Cleanup failed:', err);
      return reply.status(500).send({
        error: 'Cleanup failed',
        message: (err as Error).message,
      });
    }
  });

  Logger.info('[TEST] Test routes registered at /api/test/*');
};
