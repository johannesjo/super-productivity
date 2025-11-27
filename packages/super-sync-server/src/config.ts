import * as path from 'path';
import { Logger } from './logger';

export interface ServerConfig {
  port: number;
  dataDir: string;
  users: Array<{ username: string; password: string; isAdmin?: boolean }>;
  cors: {
    enabled: boolean;
    allowedOrigins?: string[];
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 1900,
  dataDir: './data',
  users: [],
  cors: {
    enabled: false,
    allowedOrigins: [],
  },
};

/**
 * Load configuration from environment variables.
 * Environment variables take precedence over defaults.
 */
export const loadConfigFromEnv = (
  overrides: Partial<ServerConfig> = {},
): ServerConfig => {
  const config: ServerConfig = {
    ...DEFAULT_CONFIG,
    ...overrides,
    cors: {
      ...DEFAULT_CONFIG.cors,
      ...(overrides.cors || {}),
    },
  };

  // Override with environment variables
  if (process.env.PORT) {
    const parsedPort = parseInt(process.env.PORT, 10);
    if (Number.isInteger(parsedPort) && parsedPort > 0) {
      config.port = parsedPort;
    } else {
      throw new Error(`Invalid PORT: ${process.env.PORT}. Must be a positive integer.`);
    }
  }

  if (process.env.DATA_DIR) {
    const resolvedPath = path.resolve(process.env.DATA_DIR);
    if (!resolvedPath) {
      throw new Error(`Invalid DATA_DIR: ${process.env.DATA_DIR}`);
    }
    config.dataDir = resolvedPath;
  } else {
    // Resolve default data dir relative to cwd
    config.dataDir = path.resolve(config.dataDir);
  }

  // Parse users from environment variable
  // Format: "user1:password1,user2:password2:admin"
  if (process.env.USERS) {
    config.users = process.env.USERS.split(',')
      .map((userStr) => {
        const parts = userStr.trim().split(':');
        if (parts.length < 2) {
          Logger.warn(`Skipping invalid user entry (missing password): ${userStr}`);
          return null;
        }

        const username = parts[0]?.trim();
        if (!username) {
          Logger.warn('Skipping user entry with empty username');
          return null;
        }

        const rest = parts.slice(1);
        let isAdmin = false;

        // Check if the last token is 'admin'
        if (rest.length > 0 && rest[rest.length - 1] === 'admin') {
          isAdmin = true;
          rest.pop(); // Remove 'admin' flag from password parts
        }

        const password = rest.join(':');

        return { username, password, isAdmin };
      })
      .filter((user): user is NonNullable<typeof user> => user !== null);
  }

  // CORS configuration
  if (process.env.CORS_ENABLED !== undefined) {
    config.cors.enabled = process.env.CORS_ENABLED === 'true';
  }
  if (process.env.CORS_ORIGINS) {
    config.cors.allowedOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
    // If origins are provided, implicitly enable CORS if not explicitly disabled
    if (process.env.CORS_ENABLED === undefined) {
      config.cors.enabled = true;
    }
  }

  // Validation
  if (!Number.isInteger(config.port) || config.port <= 0) {
    throw new Error(`Invalid port configuration: ${config.port}`);
  }

  if (!config.dataDir) {
    throw new Error('Data directory configuration is missing');
  }

  return config;
};
