import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerUser, loginUser, verifyEmail } from './auth';
import { Logger } from './logger';

// Zod Schemas
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

type RegisterBody = z.infer<typeof RegisterSchema>;
type LoginBody = z.infer<typeof LoginSchema>;
type VerifyEmailBody = z.infer<typeof VerifyEmailSchema>;

// Error response helper
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

export const apiRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Body: RegisterBody }>('/register', async (req, reply) => {
    try {
      // Validate input
      const parseResult = RegisterSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.issues,
        });
      }
      const { email, password } = parseResult.data;

      const result = await registerUser(email, password);
      return reply.status(201).send(result);
    } catch (err) {
      Logger.error(`Registration error: ${errorMessage(err)}`);
      // Generic error message to avoid leaking implementation details (e.g. specific DB errors)
      // unless it's a known business logic error (which we might want to refine later)
      return reply.status(400).send({ error: errorMessage(err) });
    }
  });

  fastify.post<{ Body: VerifyEmailBody }>('/verify-email', async (req, reply) => {
    try {
      const parseResult = VerifyEmailSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.issues,
        });
      }
      const { token } = parseResult.data;

      verifyEmail(token);
      return reply.send({ message: 'Email verified successfully' });
    } catch (err) {
      Logger.error(`Verification error: ${errorMessage(err)}`);
      return reply.status(400).send({ error: errorMessage(err) });
    }
  });

  fastify.post<{ Body: LoginBody }>('/login', async (req, reply) => {
    try {
      const parseResult = LoginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.issues,
        });
      }
      const { email, password } = parseResult.data;

      const result = loginUser(email, password);
      return reply.send(result);
    } catch (err) {
      Logger.error(`Login error: ${errorMessage(err)}`);
      return reply.status(401).send({ error: errorMessage(err) });
    }
  });
};
