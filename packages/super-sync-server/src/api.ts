import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerUser, loginUser, verifyEmail } from './auth';
import { Logger } from './logger';

// Zod Schemas
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters long'),
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

// Known safe error messages that can be shown to clients
const SAFE_ERROR_MESSAGES = new Set([
  'Invalid credentials',
  'Email not verified',
  'Invalid verification token',
  'Verification token has expired',
  'Registration successful. Please check your email to verify your account.',
  'Failed to send verification email. Please try again later.',
  'Account temporarily locked due to too many failed login attempts. Please try again later.',
]);

// Returns a safe error message for clients (hides internal details)
const getSafeErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && SAFE_ERROR_MESSAGES.has(err.message)) {
    return err.message;
  }
  return fallback;
};

export const apiRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Stricter rate limiting for registration (5 attempts per 15 minutes)
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
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
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(`Registration error: ${errMsg}`);
        return reply.status(400).send({
          error: getSafeErrorMessage(err, 'Registration failed. Please try again.'),
        });
      }
    },
  );

  // Moderate rate limiting for email verification (20 attempts per 15 minutes)
  fastify.post<{ Body: VerifyEmailBody }>(
    '/verify-email',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
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
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(`Verification error: ${errMsg}`);
        return reply.status(400).send({
          error: getSafeErrorMessage(err, 'Verification failed. Please try again.'),
        });
      }
    },
  );

  // Stricter rate limiting for login (10 attempts per 15 minutes)
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
      try {
        const parseResult = LoginSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.issues,
          });
        }
        const { email, password } = parseResult.data;

        const result = await loginUser(email, password);

        return reply.send(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(`Login error: ${errMsg}`);
        return reply.status(401).send({
          error: getSafeErrorMessage(err, 'Authentication failed'),
        });
      }
    },
  );
};
