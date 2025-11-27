import { FastifyInstance } from 'fastify';
import { verifyEmail } from './auth';
import { Logger } from './logger';

// Error response helper
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

interface VerifyEmailQuery {
  token?: string;
}

export async function pageRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: VerifyEmailQuery }>('/verify-email', async (req, reply) => {
    try {
      const { token } = req.query;
      if (!token) {
        return reply.status(400).send('Token is required');
      }

      verifyEmail(token);
      return reply.type('text/html').send(`
        <html>
          <head>
            <title>Email Verified</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; color: white; }
              .container { text-align: center; padding: 2rem; background: rgba(30, 41, 59, 0.7); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); }
              h1 { color: #10b981; }
              a { color: #3b82f6; text-decoration: none; margin-top: 1rem; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Email Verified!</h1>
              <p>Your account has been successfully verified.</p>
              <a href="/">Return to Login</a>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      Logger.error(`Verification error: ${errorMessage(err)}`);
      return reply.status(400).send(`Verification failed: ${errorMessage(err)}`);
    }
  });
}
