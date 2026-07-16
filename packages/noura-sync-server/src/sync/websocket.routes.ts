import type { Hono } from 'hono';
import type { WSContext } from 'hono/ws';
import type { HttpRequest } from '../http';
import { verifyToken } from '../auth';
import { getWsConnectionService } from './services/websocket-connection.service';
import { Logger } from '../logger';
import { isValidClientId } from './sync.const';

export const WS_CONNECTION_RATE_LIMIT_MAX = 120;
export const WS_CONNECTION_RATE_LIMIT_WINDOW = '1 minute';
const WS_CONNECTION_RATE_LIMIT_WINDOW_MS = 60_000;

const attempts = new Map<string, number[]>();

export const wsRateLimitKeyGenerator = (
  request: Pick<HttpRequest, 'query' | 'ip'>,
): string => {
  const clientId = (request.query as { clientId?: unknown } | undefined)?.clientId;
  return isValidClientId(clientId) ? `${request.ip}:${clientId}` : request.ip;
};

const canConnect = (key: string): boolean => {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter(
    (attempt) => attempt > now - WS_CONNECTION_RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= WS_CONNECTION_RATE_LIMIT_MAX) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
};

const requestIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',', 1)[0].trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

export const registerWsRoutes = async (app: Hono, prefix = '/api/sync') => {
  if (typeof Bun === 'undefined') return undefined;

  const { upgradeWebSocket, websocket } = await import('hono/bun');
  app.get(`${prefix}/ws`, async (context) => {
    const token = context.req.query('token');
    const clientId = context.req.query('clientId');
    const ip = requestIp(context.req.raw);
    const key = wsRateLimitKeyGenerator({
      query: { clientId },
      ip,
    } as Pick<HttpRequest, 'query' | 'ip'>);

    if (!canConnect(key)) {
      return context.json({ error: 'Rate limit exceeded' }, 429);
    }

    return upgradeWebSocket(context, {
      onOpen: (_event, socket) => {
        void authenticateSocket(socket, token, clientId);
      },
      onMessage: (event, socket) => {
        getWsConnectionService().handleMessage(socket, event.data);
      },
      onClose: (_event, socket) => {
        getWsConnectionService().handleClose(socket);
      },
      onError: (event, socket) => {
        getWsConnectionService().handleError(socket, event);
      },
    });
  });

  return websocket;
};

const authenticateSocket = async (
  socket: WSContext,
  token: string | undefined,
  clientId: string | undefined,
): Promise<void> => {
  try {
    if (!token) {
      Logger.warn('[ws] Connection rejected: missing token');
      socket.close(4001, 'Missing token');
      return;
    }
    if (!isValidClientId(clientId)) {
      Logger.warn('[ws] Connection rejected: invalid clientId');
      socket.close(4001, 'Invalid clientId');
      return;
    }

    const result = await verifyToken(token);
    if (!result.valid) {
      Logger.warn(`[ws] Connection rejected: ${result.reason}`);
      socket.close(4003, 'Invalid token');
      return;
    }

    getWsConnectionService().addConnection(result.userId, clientId, socket);
  } catch (error) {
    Logger.error('[ws] Unexpected error in WebSocket handler:', error);
    socket.close(1011, 'Internal error');
  }
};

export const clearWsRateLimits = (): void => attempts.clear();
