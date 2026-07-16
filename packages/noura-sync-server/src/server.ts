import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadConfigFromEnv, type PrivacyConfig, type ServerConfig } from './config';
import { Logger } from './logger';
import { disconnectDb, healthCheckDb } from './db';
import { HttpApp } from './http';
import { apiRoutes } from './api';
import { pageRoutes } from './pages';
import { initSyncService, startCleanupJobs, stopCleanupJobs, syncRoutes } from './sync';
import { registerWsRoutes } from './sync/websocket.routes';
import {
  getWsConnectionService,
  resetWsConnectionService,
} from './sync/services/websocket-connection.service';
import { testRoutes } from './test-routes';

export const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const SENSITIVE_QUERY_PARAMS = [
  'authorization',
  'jwt',
  'logintoken',
  'password',
  'passkeyrecoverytoken',
  'resetpasswordtoken',
  'token',
] as const;
const SENSITIVE_QUERY_PARAM_SET = new Set<string>(SENSITIVE_QUERY_PARAMS);
const SENSITIVE_QUERY_PARAM_PATTERN = new RegExp(
  `([?&](?:${SENSITIVE_QUERY_PARAMS.join('|')})=)[^&\\s]*`,
  'gi',
);

export const SERVER_HELMET_CONFIG = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
};

const CONTENT_SECURITY_POLICY = Object.entries(
  SERVER_HELMET_CONFIG.contentSecurityPolicy.directives,
)
  .map(([directive, values]) => {
    const kebab = directive.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    return `${kebab} ${values.join(' ')}`;
  })
  .join('; ');

export const pickErrorLogLevel = (
  url: string,
  statusCode: number,
): 'error' | 'warn' | 'debug' => {
  if (statusCode >= 500) return 'error';
  if (statusCode === 429 && url.split('?', 1)[0].replace(/\/+$/, '') === '/api/sync/ws') {
    return 'debug';
  }
  return 'warn';
};

export const sanitizeRequestUrlForLog = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl, 'http://localhost');
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAM_SET.has(key.toLowerCase())) {
        url.searchParams.set(key, 'redacted');
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl.replace(SENSITIVE_QUERY_PARAM_PATTERN, '$1redacted');
  }
};

export const createListenOptions = (
  config: Pick<ServerConfig, 'port' | 'host'>,
): { port: number; hostname: string } => ({
  port: config.port,
  hostname: config.host,
});

const generatePrivacyHtml = (publicDir: string, privacy?: PrivacyConfig): void => {
  const templatePath = path.join(publicDir, 'privacy.template.html');
  const outputPath = path.join(publicDir, 'privacy.html');
  if (!fs.existsSync(templatePath)) {
    Logger.warn('privacy.template.html not found, skipping generation');
    return;
  }
  const template = fs
    .readFileSync(templatePath, 'utf8')
    .replace(
      /\{\{\s*PRIVACY_CONTACT_NAME\s*\}\}/g,
      escapeHtml(privacy?.contactName || '[Contact Name]'),
    )
    .replace(
      /\{\{\s*PRIVACY_ADDRESS_STREET\s*\}\}/g,
      escapeHtml(privacy?.addressStreet || '[Street Address]'),
    )
    .replace(
      /\{\{\s*PRIVACY_ADDRESS_CITY\s*\}\}/g,
      escapeHtml(privacy?.addressCity || '[City]'),
    )
    .replace(
      /\{\{\s*PRIVACY_ADDRESS_COUNTRY\s*\}\}/g,
      escapeHtml(privacy?.addressCountry || '[Country]'),
    )
    .replace(
      /\{\{\s*PRIVACY_CONTACT_EMAIL\s*\}\}/g,
      escapeHtml(privacy?.contactEmail || '[Email]'),
    );
  fs.writeFileSync(outputPath, template);
};

const allowedOrigin = (
  origin: string,
  allowedOrigins: Array<string | RegExp> | undefined,
): string | undefined => {
  if (!origin) return undefined;
  if (allowedOrigins?.includes('*')) return origin;
  return allowedOrigins?.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin),
  )
    ? origin
    : undefined;
};

const securityHeaders = async (
  context: Parameters<Hono['use']>[1] extends (...args: infer Args) => unknown
    ? Args[0]
    : never,
  next: () => Promise<void>,
): Promise<void> => {
  await next();
  context.header('content-security-policy', CONTENT_SECURITY_POLICY);
  context.header('cross-origin-opener-policy', 'same-origin');
  context.header('cross-origin-resource-policy', 'same-origin');
  context.header('referrer-policy', 'no-referrer');
  context.header('strict-transport-security', 'max-age=15552000; includeSubDomains');
  context.header('x-content-type-options', 'nosniff');
  context.header('x-frame-options', 'DENY');
  context.header('x-permitted-cross-domain-policies', 'none');
};

const STATIC_CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const registerStaticFiles = (app: Hono, publicDir: string): void => {
  app.get('*', (context) => {
    const pathname = decodeURIComponent(new URL(context.req.url).pathname);
    const requestedPath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const normalizedPath = path.normalize(requestedPath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return context.notFound();
    }

    const filePath = path.join(publicDir, normalizedPath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return context.notFound();
    }

    const contentType = STATIC_CONTENT_TYPES[path.extname(filePath).toLowerCase()];
    if (contentType) context.header('content-type', contentType);
    return context.body(new Uint8Array(fs.readFileSync(filePath)));
  });
};

export { type ServerConfig, loadConfigFromEnv };

export const createServer = (config: Partial<ServerConfig> = {}) => {
  const fullConfig = loadConfigFromEnv(config);
  initSyncService({
    batchUpload: fullConfig.batchUpload,
    retentionMs: fullConfig.retentionMs,
  });

  const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
  generatePrivacyHtml(publicDir, fullConfig.privacy);

  const hono = new Hono();
  const httpApp = new HttpApp(hono);
  let bunServer: ReturnType<typeof Bun.serve> | undefined;
  let bunWebsocket: Awaited<ReturnType<typeof registerWsRoutes>>;

  hono.use('*', securityHeaders);
  if (fullConfig.cors.enabled) {
    hono.use(
      '*',
      cors({
        origin: (origin) => allowedOrigin(origin, fullConfig.cors.allowedOrigins),
        allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Authorization',
          'Content-Type',
          'Content-Encoding',
          'Content-Transfer-Encoding',
          'X-Expected-Rev',
          'X-Force-Overwrite',
          'X-Requested-With',
        ],
        exposeHeaders: ['X-Rev', 'X-Updated-At'],
        credentials: true,
        maxAge: 86_400,
      }),
    );
  }

  hono.onError((error, context) => {
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as unknown as { statusCode: number }).statusCode
        : 500;
    const url = sanitizeRequestUrlForLog(context.req.url);
    const message = `Request failed ${statusCode} ${context.req.method} ${url}: ${error.name}: ${error.message}`;
    const level = pickErrorLogLevel(url, statusCode);
    if (level === 'error') Logger.error(message, error.stack);
    else if (level === 'debug') Logger.debug(message);
    else Logger.warn(message);
    return context.json(
      statusCode >= 500
        ? { statusCode: 500, error: 'Internal Server Error' }
        : { error: error.message },
      (statusCode >= 400 && statusCode <= 599 ? statusCode : 500) as 500,
    );
  });

  httpApp.get('/health', async (_request, reply) => {
    try {
      await healthCheckDb();
      return reply.send({
        status: 'ok',
        service: 'NouraSync',
        db: 'connected',
        wsConnections: getWsConnectionService().getConnectionCount(),
      });
    } catch (error) {
      Logger.error('Health check failed: database not responsive', error);
      return reply.status(503).send({
        status: 'error',
        service: 'NouraSync',
        db: 'disconnected',
        message: 'Database not responsive',
      });
    }
  });

  const ready = (async () => {
    await httpApp.register(apiRoutes, { prefix: '/api' });
    await httpApp.register(syncRoutes, { prefix: '/api/sync' });
    bunWebsocket = await registerWsRoutes(hono);
    if (fullConfig.testMode?.enabled) {
      await httpApp.register(testRoutes, { prefix: '/api/test' });
      Logger.warn('TEST MODE ENABLED - test routes available at /api/test/*');
    }
    await httpApp.register(pageRoutes);
    registerStaticFiles(hono, publicDir);
  })();

  return {
    app: httpApp,
    hono,
    get websocket() {
      return bunWebsocket;
    },
    start: async (): Promise<string> => {
      await ready;
      if (!bunWebsocket) {
        throw new Error('NouraSync must be started with Bun to enable WebSockets');
      }
      startCleanupJobs();
      getWsConnectionService().startHeartbeat();
      bunServer = Bun.serve({
        ...createListenOptions(fullConfig),
        fetch: hono.fetch,
        websocket: bunWebsocket,
        maxRequestBodySize: 64 * 1024 * 1024,
        idleTimeout: 90,
      });
      const address = `http://${fullConfig.host}:${bunServer.port}`;
      Logger.info(`NouraSync started on ${address}`);
      return address;
    },
    stop: async (): Promise<void> => {
      resetWsConnectionService();
      stopCleanupJobs();
      bunServer?.stop(true);
      bunServer = undefined;
      await disconnectDb();
    },
    ready: () => ready,
  };
};
