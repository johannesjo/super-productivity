import * as http from 'http';
import { ServerConfig } from '../config';
import { Logger } from '../logger';

/**
 * Create CORS middleware for handling cross-origin requests.
 * This is required for web browser clients to access the WebDAV server.
 */
export const createCorsMiddleware = (
  config: ServerConfig['cors'],
): ((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void) => {
  if (config.enabled && config.allowedOrigins?.includes('*')) {
    Logger.warn(
      'CORS is enabled with wildcard origin (*). This is not recommended for production.',
    );
  }

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
    const allowedOrigins = config.allowedOrigins || [];

    // Check if origin is allowed
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
    const allowOrigin = isAllowed ? origin : allowedOrigins[0] || '*';

    // If we have specific allowed origins and the current origin isn't one of them (and no wildcard),
    // we might want to block it or just not send CORS headers.
    // For now, we follow the previous logic of sending the first allowed origin if not matched,
    // which effectively blocks it in the browser since the origin won't match.

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
      res.statusCode = 204; // No Content is more appropriate for preflight
      res.end();
      return;
    }

    next();
  };
};
