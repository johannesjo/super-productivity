import { v2 as webdav } from 'webdav-server';
import * as fs from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import { loadConfigFromEnv, ServerConfig } from './config';
import { Logger } from './logger';
import { initDb } from './db';
import { apiRoutes } from './api';
import { pageRoutes } from './pages';
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
  askForAuthentication(_ctx: webdav.HTTPRequestContext): Record<string, string> {
    const headerKey = 'WWW-Authenticate';
    return {
      [headerKey]: 'Bearer realm="SuperSync"',
    };
  }

  getUser(
    ctx: webdav.HTTPRequestContext,
    callback: (error: Error, user?: webdav.IUser) => void,
  ): void {
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

  // Dedicated storage root to keep user files separate from DB and other artifacts
  const storageRoot = path.join(fullConfig.dataDir, 'storage');
  if (!fs.existsSync(storageRoot)) {
    fs.mkdirSync(storageRoot, { recursive: true });
    Logger.info(`Created storage root: ${storageRoot}`);
  }

  // Create WebDAV server with JWT Auth
  // Note: port is not needed as Fastify handles HTTP listening
  const webdavServer = new webdav.WebDAVServer({
    requireAuthentification: true,
    httpAuthentication: new JWTAuthentication(),
  });

  // Map of mounted user file systems to avoid re-registering
  const userFileSystems = new Map<string, webdav.PhysicalFileSystem>();

  const ensureUserFileSystem = (userId: number): string => {
    const userSegment = `user-${userId}`;
    if (!userFileSystems.has(userSegment)) {
      const userPath = path.join(storageRoot, userSegment);
      if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true });
      }

      const fsInstance = new webdav.PhysicalFileSystem(userPath);
      webdavServer.setFileSystem(`/${userSegment}`, fsInstance, (success) => {
        if (!success) {
          Logger.error(`Failed to mount file system for user ${userSegment}`);
        } else {
          Logger.info(`Mounted file system for ${userSegment} at ${userPath}`);
        }
      });
      userFileSystems.set(userSegment, fsInstance);
    }

    return userSegment;
  };

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

      // Rate Limiting (prevent brute force)
      // 100 requests per 15 minutes globally is a safe default
      // We can tighten this for specific routes if needed
      await fastifyServer.register(rateLimit, {
        max: 100,
        timeWindow: '15 minutes',
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

      // Serve static files
      await fastifyServer.register(fastifyStatic, {
        root: path.join(__dirname, '../public'),
        prefix: '/',
      });

      // API Routes
      await fastifyServer.register(apiRoutes, { prefix: '/api' });

      // Page Routes
      await fastifyServer.register(pageRoutes, { prefix: '/' });

      // WebDAV Handler (Catch-all via hook)
      // We use a hook because Fastify's router validates HTTP methods and might not support all WebDAV methods
      fastifyServer.addHook('onRequest', (req, reply, done) => {
        if (req.url.startsWith('/api')) {
          done();
          return;
        }

        // Allow static files and verify-email route to be handled by Fastify
        const staticFiles = ['/', '/index.html', '/style.css', '/app.js', '/favicon.ico'];
        const urlPath = req.url.split('?')[0];
        if (
          (req.method === 'GET' && staticFiles.includes(urlPath)) ||
          urlPath === '/verify-email'
        ) {
          done();
          return;
        }

        const authHeader = req.headers.authorization as string | undefined;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          reply.status(401).send({ error: 'Missing or invalid Authorization header' });
          return;
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);

        if (!payload) {
          reply.status(401).send({ error: 'Invalid token' });
          return;
        }

        // Ensure user-specific file system exists and scope requests to it
        const userSegment = ensureUserFileSystem(payload.userId);
        const originalUrl = req.raw.url || req.url || '/';
        const normalizedUrl = originalUrl.startsWith('/')
          ? originalUrl
          : `/${originalUrl}`;

        // Path Traversal Protection
        // Ensure path does not contain ".." segments
        if (
          normalizedUrl.includes('/../') ||
          normalizedUrl.endsWith('/..') ||
          normalizedUrl.includes('\\..\\')
        ) {
          reply.status(400).send({ error: 'Invalid path: Path traversal not allowed' });
          return;
        }

        const userScopedUrl = `/${userSegment}${normalizedUrl}`.replace(/\/{2,}/g, '/');

        req.raw.url = userScopedUrl;
        (req as unknown as { url: string }).url = userScopedUrl;

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
