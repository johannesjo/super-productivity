import * as fs from 'fs';
import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import { loadConfigFromEnv, ServerConfig, PrivacyConfig } from './config';
import { Logger } from './logger';
import { prisma, disconnectDb } from './db';
import websocket from '@fastify/websocket';
import { apiRoutes } from './api';
import { pageRoutes } from './pages';
import {
  syncRoutes,
  startCleanupJobs,
  stopCleanupJobs,
  initSyncService,
  getSyncService,
} from './sync';
import { wsRoutes } from './sync/websocket.routes';
import {
  getWsConnectionService,
  resetWsConnectionService,
} from './sync/services/websocket-connection.service';
import { testRoutes } from './test-routes';
import { setLegalPagesPublished } from './legal-pages';

// HTML escape to prevent XSS in generated HTML
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const SERVER_HELMET_CONFIG = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles for HTML pages
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
};

/**
 * Picks the log level for a Fastify-handled error. 5xx → error (with stack);
 * WS-upgrade 429s → debug (storm tail from pre-18.6.0 clients that reconnect
 * on any close; the cooldown WARN+summary in WebSocketConnectionService is
 * the actionable signal, the rate-limit 429s only add flood). Everything
 * else → warn. Exact-matches /api/sync/ws (strips ?query + trailing slashes)
 * so future siblings like /api/sync/ws-status do not silently inherit
 * debug-only behavior. statusCode gate short-circuits the path-normalize on
 * the ~99% of error responses that aren't 429.
 */
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
  const queryStart = rawUrl.indexOf('?');
  return queryStart === -1 ? rawUrl : `${rawUrl.slice(0, queryStart)}?redacted`;
};

export const createListenOptions = (
  config: Pick<ServerConfig, 'port' | 'host'>,
): { port: number; host: string } => ({
  port: config.port,
  host: config.host,
});

/**
 * Locates the served `public/` directory.
 *
 * `__dirname` is `dist/src` in the built image but `src` under ts-node/vitest, so a single
 * relative path is wrong for one of them — `../../public` silently resolved to a
 * nonexistent `packages/public` in dev, which meant the generated pages were never
 * written there at all. Probing both keeps dev, tests and the image on the same directory.
 */
const resolvePublicDir = (): string => {
  const candidates = [
    path.join(__dirname, '../../public'), // dist/src/ -> <pkg>/public
    path.join(__dirname, '../public'), // src/      -> <pkg>/public
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
};

/**
 * Drops `<!-- OPTIONAL:NAME -->…<!-- /OPTIONAL:NAME -->` sections whose name is not in
 * `keep`, and unwraps the markers of the ones that are. Lets one shipped template serve
 * operators who have a hosting provider or a named supervisory authority and operators
 * who have neither, without emitting a claim that is false for the other.
 */
const applyOptionalBlocks = (html: string, keep: ReadonlySet<string>): string =>
  html.replace(
    /[^\S\n]*<!-- OPTIONAL:([A-Z_]+) -->\n?([\s\S]*?)[^\S\n]*<!-- \/OPTIONAL:\1 -->\n?/g,
    (_match, name: string, body: string) => (keep.has(name) ? body : ''),
  );

/**
 * Renders `privacy.html` from the shipped template.
 *
 * Returns whether a policy was written. When the operator has not identified themselves
 * as the controller we deliberately generate nothing: a policy naming "[Contact Name]" —
 * or worse, inherited boilerplate about someone else's hosting provider — is a false
 * legal statement published in the operator's name. A 404 is the honest failure.
 */
const generatePrivacyHtml = (privacy?: PrivacyConfig): boolean => {
  const publicDir = resolvePublicDir();
  const templatePath = path.join(publicDir, 'privacy.template.html');
  const outputPath = path.join(publicDir, 'privacy.html');

  // Stale output from an earlier, configured boot must not survive a reconfiguration.
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath);
  }

  if (!fs.existsSync(templatePath)) {
    Logger.warn('privacy.template.html not found, skipping generation');
    return false;
  }

  if (!privacy) {
    Logger.warn(
      'No PRIVACY_* configuration set: /privacy.html and the registration consent ' +
        'notice are disabled. Set PRIVACY_CONTACT_NAME, PRIVACY_ADDRESS_STREET, ' +
        'PRIVACY_ADDRESS_CITY, PRIVACY_ADDRESS_COUNTRY and PRIVACY_CONTACT_EMAIL to ' +
        'publish a privacy policy naming you as the controller.',
    );
    return false;
  }

  const keep = new Set<string>([
    privacy.hostingProvider ? 'HOSTING' : 'NO_HOSTING',
    ...(privacy.supervisoryAuthority ? ['AUTHORITY'] : []),
  ]);

  // Replace placeholders with HTML-escaped values from config (prevent XSS)
  const html = applyOptionalBlocks(fs.readFileSync(templatePath, 'utf-8'), keep)
    .replace(/\{\{\s*PRIVACY_CONTACT_NAME\s*\}\}/g, escapeHtml(privacy.contactName))
    .replace(/\{\{\s*PRIVACY_ADDRESS_STREET\s*\}\}/g, escapeHtml(privacy.addressStreet))
    .replace(/\{\{\s*PRIVACY_ADDRESS_CITY\s*\}\}/g, escapeHtml(privacy.addressCity))
    .replace(/\{\{\s*PRIVACY_ADDRESS_COUNTRY\s*\}\}/g, escapeHtml(privacy.addressCountry))
    .replace(/\{\{\s*PRIVACY_CONTACT_EMAIL\s*\}\}/g, escapeHtml(privacy.contactEmail))
    .replace(
      /\{\{\s*PRIVACY_HOSTING_PROVIDER\s*\}\}/g,
      escapeHtml(privacy.hostingProvider ?? '').replace(/\n/g, '<br />'),
    )
    .replace(
      /\{\{\s*PRIVACY_SUPERVISORY_AUTHORITY\s*\}\}/g,
      escapeHtml(privacy.supervisoryAuthority ?? '').replace(/\n/g, '<br />'),
    );

  fs.writeFileSync(outputPath, html);
  Logger.info('Generated privacy.html from template');
  return true;
};

/**
 * Renders `index.html` from its template, keeping the legal-consent block only when legal
 * pages actually exist to link to. The generic image ships no Terms of Service, so an
 * unconfigured instance must not ask its users to accept one.
 */
const generateIndexHtml = (hasLegalPages: boolean): void => {
  const publicDir = resolvePublicDir();
  const templatePath = path.join(publicDir, 'index.template.html');
  const outputPath = path.join(publicDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    Logger.warn('index.template.html not found, skipping generation');
    return;
  }

  const keep = new Set<string>(hasLegalPages ? ['LEGAL_CONSENT'] : []);
  fs.writeFileSync(
    outputPath,
    applyOptionalBlocks(fs.readFileSync(templatePath, 'utf-8'), keep),
  );
  Logger.info('Generated index.html from template');
};

/**
 * Copies operator-supplied legal pages from `<dataDir>/legal/` into the served directory.
 * This is how an operator publishes their own Terms of Service: the image deliberately
 * ships none, because ours name German law, a Leipzig venue and our own contact address.
 */
const installOperatorLegalPages = (dataDir: string): boolean => {
  const publicDir = resolvePublicDir();
  const sourcePath = path.join(dataDir, 'legal', 'terms.html');
  const outputPath = path.join(publicDir, 'terms.html');

  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath);
  }
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  fs.copyFileSync(sourcePath, outputPath);
  Logger.info('Installed operator-supplied terms.html');
  return true;
};

export { ServerConfig, loadConfigFromEnv };

export const createServer = (
  config: Partial<ServerConfig> = {},
): {
  fastifyServer?: FastifyInstance;
  start: () => Promise<string>;
  stop: () => Promise<void>;
} => {
  const fullConfig = loadConfigFromEnv(config);
  initSyncService({ batchUpload: fullConfig.batchUpload });

  // Ensure data directory exists
  if (!fs.existsSync(fullConfig.dataDir)) {
    fs.mkdirSync(fullConfig.dataDir, { recursive: true });
    Logger.info(`Created data directory: ${fullConfig.dataDir}`);
  }

  // Generate the legal pages, then tell the API whether consent can be required at all.
  // Order matters: index.html must reflect the pages that were actually written.
  const hasPrivacyPolicy = generatePrivacyHtml(fullConfig.privacy);
  const hasOperatorTerms = installOperatorLegalPages(fullConfig.dataDir);
  const hasLegalPages = hasPrivacyPolicy || hasOperatorTerms;
  generateIndexHtml(hasLegalPages);
  setLegalPagesPublished(hasLegalPages);

  let fastifyServer: FastifyInstance | undefined;

  return {
    get fastifyServer() {
      return fastifyServer;
    },
    start: async (): Promise<string> => {
      fastifyServer = Fastify({
        logger: false, // We use our own logger
        bodyLimit: 20 * 1024 * 1024, // 20MB - needed for large imports
        // Add explicit timeouts for long-running operations
        connectionTimeout: 90000, // 90s - match client timeout
        requestTimeout: 80000, // 80s - must exceed DB timeout (60s) but be less than Caddy (85s)
        // Trust exactly one reverse proxy hop (X-Forwarded-For) so req.ip reflects
        // the real client IP instead of the proxy's IP. Using 1 instead of true
        // prevents attackers from spoofing IPs when no proxy is present.
        trustProxy: 1,
      });

      // Sanitize 5xx responses so internal details (e.g. raw Prisma errors
      // exposing DB hostnames or ORM call shapes) never reach clients/log
      // exports. 4xx errors are passed through — those are typically Fastify
      // validation messages or auth failures that are safe and actionable.
      fastifyServer.setErrorHandler((error: FastifyError, req, reply) => {
        const statusCode = error.statusCode ?? 500;
        const sanitizedUrl = sanitizeRequestUrlForLog(req.url);
        const logMessage = `Request failed ${statusCode} ${req.method} ${sanitizedUrl}: ${error.name}: ${error.message}`;
        const level = pickErrorLogLevel(req.url, statusCode);
        if (level === 'error') {
          Logger.error(logMessage, error.stack);
        } else if (level === 'debug') {
          Logger.debug(logMessage);
        } else {
          Logger.warn(logMessage);
        }
        if (statusCode >= 500) {
          return reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
          });
        }
        return reply.send(error);
      });

      // Security Headers
      await fastifyServer.register(helmet, SERVER_HELMET_CONFIG);

      // Rate Limiting (prevent brute force)
      if (!fullConfig.testMode?.enabled) {
        await fastifyServer.register(rateLimit, {
          max: 500,
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
            'Content-Transfer-Encoding', // Used by some HTTP clients for binary/base64 payloads
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
        root: resolvePublicDir(),
        prefix: '/',
      });

      // WebSocket support for real-time sync notifications
      // maxPayload: only app-level pong messages expected from clients (~20 bytes)
      await fastifyServer.register(websocket, {
        options: { maxPayload: 1024 },
      });

      // Backfill self-check: paired with the env-flag enforcement in
      // loadConfigFromEnv. The env flag (SUPERSYNC_PAYLOAD_BYTES_BACKFILL_COMPLETE)
      // is operator-set; if it is flipped to true before the migrate-payload-bytes
      // script finishes, batch-upload deltas are still correct but the SUM-based
      // reconcile in calculateStorageUsage would mix exact bytes with the
      // CASE-WHEN fallback for legacy rows. One indexed probe at startup closes
      // the trust hole: refuse to boot if any row still has payload_bytes = 0.
      if (fullConfig.batchUpload) {
        try {
          await getSyncService().assertPayloadBytesBackfillComplete();
        } catch (err) {
          Logger.error('Startup self-check failed', err);
          throw err;
        }
      }

      // Health Check - verifies database connectivity
      // Exempt from rate limiting (Kubernetes probes hit this every 5-15s)
      fastifyServer.get('/health', { config: { rateLimit: false } }, async (_, reply) => {
        try {
          // Simple query to verify DB is responsive
          await prisma.$queryRaw`SELECT 1`;
          const wsConnections = getWsConnectionService().getConnectionCount();
          return { status: 'ok', db: 'connected', wsConnections };
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

      // WebSocket routes for real-time sync notifications
      await fastifyServer.register(wsRoutes, { prefix: '/api/sync' });

      // Test Routes (only in test mode)
      if (fullConfig.testMode?.enabled) {
        await fastifyServer.register(testRoutes, { prefix: '/api/test' });
        Logger.warn('TEST MODE ENABLED - Test routes available at /api/test/*');
      }

      // Page Routes
      await fastifyServer.register(pageRoutes, { prefix: '/' });

      // Start cleanup jobs
      startCleanupJobs();

      // Start WebSocket heartbeat
      getWsConnectionService().startHeartbeat();

      try {
        const address = await fastifyServer.listen(createListenOptions(fullConfig));
        Logger.info(`Server started on ${address}`);
        return address;
      } catch (err) {
        Logger.error('Failed to start server:', err);
        throw err;
      }
    },
    stop: async (): Promise<void> => {
      // Stop WebSocket connections
      resetWsConnectionService();
      stopCleanupJobs();
      if (fastifyServer) {
        await fastifyServer.close();
        fastifyServer = undefined;
      }
      await disconnectDb();
    },
  };
};
