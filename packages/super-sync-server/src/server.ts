import { v2 as webdav } from 'webdav-server';
import * as fs from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { loadConfigFromEnv, ServerConfig } from './config';
import { Logger } from './logger';
import { initDb } from './db';
import { apiRoutes } from './api';
import { verifyToken } from './auth';

export { ServerConfig, loadConfigFromEnv };

// Helper to extract authorization header from WebDAV context
const getAuthHeader = (ctx: webdav.HTTPRequestContext): string | undefined => {
  // webdav-server may wrap headers in different structures depending on version
  const headers = ctx.headers as unknown as Record<string, unknown>;
  const actualHeaders =
    (headers.headers as Record<string, string> | undefined) ||
    (headers as Record<string, string>);
  return (actualHeaders.authorization || actualHeaders.Authorization) as
    | string
    | undefined;
};

// Custom JWT Authentication for WebDAV
class JWTAuthentication implements webdav.HTTPAuthentication {
  askForAuthentication(_ctx: webdav.HTTPRequestContext) {
    return {
      'WWW-Authenticate': 'Bearer realm="SuperSync"',
    };
  }

  getUser(
    ctx: webdav.HTTPRequestContext,
    callback: (error: Error, user?: webdav.IUser) => void,
  ) {
    const authHeader = getAuthHeader(ctx);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return callback(new Error('Missing or invalid Authorization header'));
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return callback(new Error('Invalid token'));
    }

    // webdav-server callback signature expects Error but we pass null on success
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback(null as any, {
      uid: payload.userId.toString(),
      username: payload.email,
      isAdministrator: false,
    });
  }
}

export const createServer = (
  config: Partial<ServerConfig> = {},
): {
  webdavServer: webdav.WebDAVServer;
  fastifyServer?: FastifyInstance;
  start: () => Promise<string>;
  stop: () => Promise<void>;
} => {
  const fullConfig = loadConfigFromEnv(config);

  // Initialize Database
  initDb(fullConfig.dataDir);

  // Ensure data directory exists
  if (!fs.existsSync(fullConfig.dataDir)) {
    fs.mkdirSync(fullConfig.dataDir, { recursive: true });
    Logger.info(`Created data directory: ${fullConfig.dataDir}`);
  }

  // Create WebDAV server with JWT Auth
  // Note: port is not needed as Fastify handles HTTP listening
  const webdavServer = new webdav.WebDAVServer({
    requireAuthentification: true,
    httpAuthentication: new JWTAuthentication(),
  });

  // Mount physical file system
  webdavServer.setFileSystem(
    '/',
    new webdav.PhysicalFileSystem(fullConfig.dataDir),
    (success) => {
      if (!success) {
        Logger.error(`Failed to mount physical file system at ${fullConfig.dataDir}`);
      }
    },
  );

  let fastifyServer: FastifyInstance | undefined;

  return {
    webdavServer,
    get fastifyServer() {
      return fastifyServer;
    },
    start: async (): Promise<string> => {
      fastifyServer = Fastify({
        logger: false, // We use our own logger
      });

      // CORS Configuration
      if (fullConfig.cors.enabled) {
        await fastifyServer.register(cors, {
          origin: fullConfig.cors.allowedOrigins?.includes('*')
            ? true
            : fullConfig.cors.allowedOrigins,
          methods: [
            'GET',
            'PUT',
            'POST',
            'DELETE',
            'OPTIONS',
            'PROPFIND',
            'PROPPATCH',
            'MKCOL',
            'COPY',
            'MOVE',
            'LOCK',
            'UNLOCK',
          ],
          allowedHeaders: [
            'Authorization',
            'Content-Type',
            'Depth',
            'If-Modified-Since',
            'If-Unmodified-Since',
            'Lock-Token',
            'Timeout',
            'Destination',
            'Overwrite',
            'X-Requested-With',
          ],
          exposedHeaders: [
            'ETag',
            'Last-Modified',
            'Content-Length',
            'Content-Type',
            'DAV',
          ],
          credentials: true,
          maxAge: 86400,
          preflight: false, // Let WebDAV server handle OPTIONS
        });
      }

      // API Routes
      await fastifyServer.register(apiRoutes, { prefix: '/api' });

      // WebDAV Handler (Catch-all via hook)
      // We use a hook because Fastify's router validates HTTP methods and might not support all WebDAV methods
      fastifyServer.addHook('onRequest', (req, reply, done) => {
        if (req.url.startsWith('/api')) {
          done();
          return;
        }

        // Bypass Fastify and let WebDAV server handle the raw request
        reply.hijack();

        try {
          webdavServer.executeRequest(req.raw, reply.raw);
        } catch (e: any) {
          Logger.error('WebDAV execution error:', e);
          reply.raw.statusCode = 500;
          reply.raw.end();
        }
        // We don't call done() because we've hijacked the request and will handle the response
      });

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
      if (fastifyServer) {
        await fastifyServer.close();
        fastifyServer = undefined;
      }
    },
  };
};
