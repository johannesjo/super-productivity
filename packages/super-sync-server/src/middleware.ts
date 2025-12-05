import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './auth';

// User payload type
export interface AuthUser {
  userId: number;
  email: string;
}

// Extend FastifyRequest to include optional user (before auth)
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// Type for requests after authentication middleware has run
// Use this in route handlers that require auth
export interface AuthenticatedFastifyRequest<T = unknown> extends FastifyRequest<T> {
  user: AuthUser;
}

export const authenticate = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];

  const payload = await verifyToken(token);
  if (!payload) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  req.user = payload;
};
