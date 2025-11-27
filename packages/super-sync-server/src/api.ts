import { FastifyInstance } from 'fastify';
import { registerUser, loginUser, verifyEmail } from './auth';
import { Logger } from './logger';

// Request body interfaces
interface RegisterBody {
  email?: string;
  password?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface VerifyEmailBody {
  token?: string;
}

// Error response helper
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

export async function apiRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterBody }>('/register', async (req, reply) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }

      const result = registerUser(email, password);
      return reply
        .status(201)
        .send({ message: 'User registered. Please verify your email.', ...result });
    } catch (err) {
      Logger.error(`Registration error: ${errorMessage(err)}`);
      return reply.status(400).send({ error: errorMessage(err) });
    }
  });

  fastify.post<{ Body: VerifyEmailBody }>('/verify-email', async (req, reply) => {
    try {
      const { token } = req.body;
      if (!token) {
        return reply.status(400).send({ error: 'Token is required' });
      }

      verifyEmail(token);
      return reply.send({ message: 'Email verified successfully' });
    } catch (err) {
      Logger.error(`Verification error: ${errorMessage(err)}`);
      return reply.status(400).send({ error: errorMessage(err) });
    }
  });

  fastify.post<{ Body: LoginBody }>('/login', async (req, reply) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }

      const result = loginUser(email, password);
      return reply.send(result);
    } catch (err) {
      Logger.error(`Login error: ${errorMessage(err)}`);
      return reply.status(401).send({ error: errorMessage(err) });
    }
  });
}
