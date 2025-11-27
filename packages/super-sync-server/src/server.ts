import { v2 as webdav } from 'webdav-server';
import * as fs from 'fs';
import * as http from 'http';

export interface ServerConfig {
  port: number;
  dataDir: string;
  users: Array<{ username: string; password: string; isAdmin?: boolean }>;
  cors?: {
    enabled: boolean;
    allowedOrigins?: string[];
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 1900,
  dataDir: './data',
  users: [],
  cors: {
    enabled: true,
    allowedOrigins: ['*'],
  },
};

/**
 * Create CORS middleware for handling cross-origin requests.
 * This is required for web browser clients to access the WebDAV server.
 */
function createCorsMiddleware(
  config: ServerConfig['cors'],
): (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void {
  return (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => void,
  ): void => {
    if (!config?.enabled) {
      next();
      return;
    }

    const origin = req.headers.origin || '*';
    const allowedOrigins = config.allowedOrigins || ['*'];

    // Check if origin is allowed
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
    const allowOrigin = isAllowed ? origin : allowedOrigins[0] || '*';

    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, PUT, POST, DELETE, OPTIONS, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Depth, If-Modified-Since, If-Unmodified-Since, Lock-Token, Timeout, Destination, Overwrite, X-Requested-With',
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'ETag, Last-Modified, Content-Length, Content-Type, DAV',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  };
}

/**
 * Load configuration from environment variables.
 * Environment variables take precedence over defaults.
 */
export function loadConfigFromEnv(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const config: ServerConfig = {
    ...DEFAULT_CONFIG,
    ...overrides,
  };

  // Override with environment variables
  if (process.env.PORT) {
    config.port = parseInt(process.env.PORT, 10);
  }
  if (process.env.DATA_DIR) {
    config.dataDir = process.env.DATA_DIR;
  }

  // Parse users from environment variable
  // Format: "user1:password1,user2:password2:admin"
  if (process.env.USERS) {
    config.users = process.env.USERS.split(',').map((userStr) => {
      const parts = userStr.trim().split(':');
      return {
        username: parts[0],
        password: parts[1] || '',
        isAdmin: parts[2] === 'admin',
      };
    });
  }

  // CORS configuration
  if (process.env.CORS_ENABLED !== undefined) {
    config.cors = config.cors || { enabled: true };
    config.cors.enabled = process.env.CORS_ENABLED === 'true';
  }
  if (process.env.CORS_ORIGINS) {
    config.cors = config.cors || { enabled: true };
    config.cors.allowedOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
  }

  return config;
}

/**
 * Creates and configures a WebDAV server with the provided configuration.
 *
 * @param config - Server configuration
 * @returns Configured WebDAV server instance
 */
export function createServer(config: Partial<ServerConfig> = {}): {
  server: webdav.WebDAVServer;
  httpServer?: http.Server;
  start: () => Promise<http.Server>;
  stop: () => Promise<void>;
} {
  const fullConfig = loadConfigFromEnv(config);

  // Validate configuration
  if (fullConfig.users.length === 0) {
    console.warn(
      '⚠️  Warning: No users configured. Server will not accept any connections.',
    );
    console.warn('   Set USERS environment variable or pass users in config.');
    console.warn('   Format: USERS="user1:password1,user2:password2"');
  }

  // Ensure data directory exists
  if (!fs.existsSync(fullConfig.dataDir)) {
    fs.mkdirSync(fullConfig.dataDir, { recursive: true });
    console.log(`📁 Created data directory: ${fullConfig.dataDir}`);
  }

  // Set up user manager with configured users
  const userManager = new webdav.SimpleUserManager();
  for (const user of fullConfig.users) {
    userManager.addUser(user.username, user.password, user.isAdmin ?? false);
    console.log(`👤 Added user: ${user.username}${user.isAdmin ? ' (admin)' : ''}`);
  }

  // Create WebDAV server
  const server = new webdav.WebDAVServer({
    port: fullConfig.port,
    requireAuthentification: fullConfig.users.length > 0,
    httpAuthentication:
      fullConfig.users.length > 0
        ? new webdav.HTTPBasicAuthentication(userManager, 'SuperSync Realm')
        : undefined,
  });

  // Add CORS middleware
  const corsMiddleware = createCorsMiddleware(fullConfig.cors);
  server.beforeRequest((ctx, next) => {
    corsMiddleware(ctx.request.request, ctx.response.response, next);
  });

  // Mount physical file system
  server.setFileSystem(
    '/',
    new webdav.PhysicalFileSystem(fullConfig.dataDir),
    (success) => {
      if (!success) {
        console.error(`❌ Failed to mount physical file system at ${fullConfig.dataDir}`);
      }
    },
  );

  let httpServer: http.Server | undefined;

  return {
    server,
    get httpServer() {
      return httpServer;
    },
    start: (): Promise<http.Server> => {
      return new Promise((resolve, reject) => {
        try {
          server.start((s) => {
            if (!s) {
              reject(new Error('Server failed to start'));
              return;
            }
            httpServer = s;
            resolve(s);
          });
        } catch (err) {
          reject(err);
        }
      });
    },
    stop: (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!httpServer) {
          resolve();
          return;
        }
        httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            httpServer = undefined;
            resolve();
          }
        });
      });
    },
  };
}
