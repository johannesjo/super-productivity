import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './auth';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: { userId: number; email: string };
  }
}

export const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
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
