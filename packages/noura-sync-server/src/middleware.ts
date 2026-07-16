import { HttpRequest, HttpReply } from './http';
import { verifyToken } from './auth';

// User payload type
export interface AuthUser {
  userId: number;
  email: string;
}

/**
 * Helper to get authenticated user from request.
 * Use this in route handlers protected by the authenticate preHandler hook.
 * Throws if user is not set (should never happen after authenticate hook).
 */
export const getAuthUser = (req: HttpRequest): AuthUser => {
  if (!req.user) {
    throw new Error('User not authenticated - missing auth middleware?');
  }
  return req.user;
};

export const authenticate = async (
  req: HttpRequest,
  reply: HttpReply,
): Promise<HttpReply | void> => {
  const authHeader = req.headers.authorization;
  const normalizedAuthHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!normalizedAuthHeader || !normalizedAuthHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
  }
  const token = normalizedAuthHeader.split(' ')[1];

  const result = await verifyToken(token);
  if (!result.valid) {
    return reply.code(401).send({ error: result.reason });
  }

  req.user = { userId: result.userId, email: result.email };
};
