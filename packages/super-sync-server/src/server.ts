import * as fs from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import { loadConfigFromEnv, ServerConfig } from './config';
import { Logger } from './logger';
import { prisma, disconnectDb } from './db';
import { apiRoutes } from './api';
import { pageRoutes } from './pages';
import { syncRoutes, startCleanupJobs, stopCleanupJobs } from './sync';
import { testRoutes } from './test-routes';

export { ServerConfig, loadConfigFromEnv };

export const createServer = (
  config: Partial<ServerConfig> = {},
): {
  fastifyServer?: FastifyInstance;
  start: () => Promise<string>;
  stop: () => Promise<void>;
} => {
  const fullConfig = loadConfigFromEnv(config);

  // Ensure data directory exists
  if (!fs.existsSync(fullConfig.dataDir)) {
    fs.mkdirSync(fullConfig.dataDir, { recursive: true });
    Logger.info(`Created data directory: ${fullConfig.dataDir}`);
  }

  let fastifyServer: FastifyInstance | undefined;

  return {
    get fastifyServer() {
      return fastifyServer;
    },
    start: async (): Promise<string> => {
      fastifyServer = Fastify({
        logger: false, // We use our own logger
        bodyLimit: 20 * 1024 * 1024, // 20MB - needed for large imports
      });

      // Security Headers
      await fastifyServer.register(helmet, {
        contentSecurityPolicy: false,
      });

      // Rate Limiting (prevent brute force)
      if (!fullConfig.testMode?.enabled) {
        await fastifyServer.register(rateLimit, {
          max: 100,
          timeWindow: '15 minutes',
        });
      }

      // CORS Configuration
      // Supports both string origins and RegExp patterns
      if (fullConfig.cors.enabled) {
        const hasWildcard = fullConfig.cors.allowedOrigins?.some((o) => o === '*');
        await fastifyServer.register(cors, {
          origin: hasWildcard ? true : fullConfig.cors.allowedOrigins,
          methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
          allowedHeaders: [
            'Authorization',
            'Content-Type',
            'Content-Encoding',
            'X-Expected-Rev',
            'X-Force-Overwrite',
            'X-Requested-With',
          ],
          exposedHeaders: ['X-Rev', 'X-Updated-At'],
          credentials: true,
          maxAge: 86400,
          preflight: true,
        });
      }

      // Serve static files
      await fastifyServer.register(fastifyStatic, {
        root: path.join(__dirname, '../../public'),
        prefix: '/',
      });

      // Health Check - verifies database connectivity
      fastifyServer.get('/health', async (_, reply) => {
        try {
          // Simple query to verify DB is responsive
          await prisma.$queryRaw`SELECT 1`;
          return { status: 'ok', db: 'connected' };
        } catch (err) {
          Logger.error('Health check failed: DB not responsive', err);
          return reply.status(503).send({
            status: 'error',
            db: 'disconnected',
            message: 'Database not responsive',
          });
        }
      });

      // API Routes
      await fastifyServer.register(apiRoutes, { prefix: '/api' });

      // Sync Routes (operation-based sync)
      await fastifyServer.register(syncRoutes, { prefix: '/api/sync' });

      // Test Routes (only in test mode)
      if (fullConfig.testMode?.enabled) {
        await fastifyServer.register(testRoutes, { prefix: '/api/test' });
        Logger.warn('TEST MODE ENABLED - Test routes available at /api/test/*');
      }

      // Page Routes
      await fastifyServer.register(pageRoutes, { prefix: '/' });

      // Start cleanup jobs
      startCleanupJobs();

      try {
        const address = await fastifyServer.listen({
          port: fullConfig.port,
          host: '0.0.0.0',
        });
        Logger.info(`Server started on ${address}`);
        return address;
      } catch (err) {
        Logger.error('Failed to start server:', err);
        throw err;
      }
    },
    stop: async (): Promise<void> => {
      stopCleanupJobs();
      if (fastifyServer) {
        await fastifyServer.close();
        fastifyServer = undefined;
      }
      await disconnectDb();
    },
  };
};
