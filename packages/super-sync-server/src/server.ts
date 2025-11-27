import { v2 as webdav } from 'webdav-server';
import * as fs from 'fs';
import * as http from 'http';
import { loadConfigFromEnv, ServerConfig } from './config';
import { createCorsMiddleware } from './middleware/cors';
import { Logger } from './logger';

export { ServerConfig, loadConfigFromEnv };

/**
 * Creates and configures a WebDAV server with the provided configuration.
 *
 * @param config - Server configuration
 * @returns Configured WebDAV server instance
 */
export const createServer = (
  config: Partial<ServerConfig> = {},
): {
  server: webdav.WebDAVServer;
  httpServer?: http.Server;
  start: () => Promise<http.Server>;
  stop: () => Promise<void>;
} => {
  const fullConfig = loadConfigFromEnv(config);

  // Validate configuration
  if (fullConfig.users.length === 0) {
    throw new Error(
      'No users configured. Authentication is required. Set USERS env var or pass users in config (e.g. USERS="user:password").',
    );
  }

  // Ensure data directory exists
  if (!fs.existsSync(fullConfig.dataDir)) {
    fs.mkdirSync(fullConfig.dataDir, { recursive: true });
    Logger.info(`Created data directory: ${fullConfig.dataDir}`);
  }

  // Set up user manager with configured users
  const userManager = new webdav.SimpleUserManager();
  for (const user of fullConfig.users) {
    userManager.addUser(user.username, user.password, user.isAdmin ?? false);
    Logger.info(`Added user: ${user.username}${user.isAdmin ? ' (admin)' : ''}`);
  }

  const httpAuthentication = new webdav.HTTPBasicAuthentication(
    userManager,
    'SuperSync Realm',
  );

  // Create WebDAV server
  const server = new webdav.WebDAVServer({
    port: fullConfig.port,
    requireAuthentification: true,
    httpAuthentication,
  });

  // Mount physical file system
  server.setFileSystem(
    '/',
    new webdav.PhysicalFileSystem(fullConfig.dataDir),
    (success) => {
      if (!success) {
        Logger.error(`Failed to mount physical file system at ${fullConfig.dataDir}`);
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
          const corsMiddleware = createCorsMiddleware(fullConfig.cors);

          httpServer = http.createServer((req, res) => {
            // Apply CORS middleware
            corsMiddleware(req, res, () => {
              // If middleware calls next(), pass to WebDAV server
              server.executeRequest(req, res);
            });
          });

          httpServer.listen(fullConfig.port, () => {
            Logger.info(`Server started on port ${fullConfig.port}`);
            resolve(httpServer!);
          });

          httpServer.on('error', (err) => {
            reject(err);
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
};
