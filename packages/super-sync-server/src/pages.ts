import { FastifyInstance } from 'fastify';
import { verifyEmail } from './auth';
import { Logger } from './logger';

// Error response helper
const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown error';

// Basic HTML escape
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Safely serialize a value for embedding in a <script> tag.
 * Uses JSON.stringify and escapes sequences that could break out of script context.
 */
const safeJsonForScript = (value: unknown): string => {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c') // Escape < to prevent </script> injection
    .replace(/>/g, '\\u003e') // Escape > for completeness
    .replace(/&/g, '\\u0026'); // Escape & to prevent &lt; from being decoded
};

interface VerifyEmailQuery {
  token?: string;
}

interface ResetPasswordQuery {
  token?: string;
}

export async function pageRoutes(fastify: FastifyInstance) {
  // Password reset page - shows form to enter new password
  fastify.get<{ Querystring: ResetPasswordQuery }>(
    '/reset-password',
    async (req, reply) => {
      const { token } = req.query;
      if (!token) {
        return reply.status(400).send('Token is required');
      }

      // Return HTML form for password reset
      return reply.type('text/html').send(`
      <html>
        <head>
          <title>Reset Password</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; color: white; margin: 0; }
            .container { text-align: center; padding: 2rem; background: rgba(30, 41, 59, 0.7); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; width: 90%; }
            h1 { color: #3b82f6; margin-bottom: 1.5rem; }
            .form-group { margin-bottom: 1rem; text-align: left; }
            label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #94a3b8; }
            input { width: 100%; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; background: rgba(15, 23, 42, 0.8); color: white; font-size: 1rem; box-sizing: border-box; }
            input:focus { outline: none; border-color: #3b82f6; }
            button { width: 100%; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-top: 1rem; }
            button:hover { background: #2563eb; }
            button:disabled { background: #475569; cursor: not-allowed; }
            .error { color: #ef4444; margin-top: 1rem; display: none; }
            .success { color: #10b981; margin-top: 1rem; display: none; }
            .requirements { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reset Password</h1>
            <form id="resetForm">
              <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" name="password" required minlength="12" />
                <div class="requirements">Minimum 12 characters</div>
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required />
              </div>
              <button type="submit" id="submitBtn">Reset Password</button>
            </form>
            <p class="error" id="error"></p>
            <p class="success" id="success"></p>
          </div>
          <script>
            const form = document.getElementById('resetForm');
            const errorEl = document.getElementById('error');
            const successEl = document.getElementById('success');
            const submitBtn = document.getElementById('submitBtn');

            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              errorEl.style.display = 'none';
              successEl.style.display = 'none';

              const password = document.getElementById('password').value;
              const confirmPassword = document.getElementById('confirmPassword').value;

              if (password !== confirmPassword) {
                errorEl.textContent = 'Passwords do not match';
                errorEl.style.display = 'block';
                return;
              }

              submitBtn.disabled = true;
              submitBtn.textContent = 'Resetting...';

              try {
                const response = await fetch('/api/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token: ${safeJsonForScript(token)}, password })
                });

                const data = await response.json();

                if (response.ok) {
                  successEl.textContent = data.message || 'Password reset successfully!';
                  successEl.style.display = 'block';
                  form.style.display = 'none';
                } else {
                  errorEl.textContent = data.error || 'Failed to reset password';
                  errorEl.style.display = 'block';
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Reset Password';
                }
              } catch (err) {
                errorEl.textContent = 'An error occurred. Please try again.';
                errorEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
              }
            });
          </script>
        </body>
      </html>
    `);
    },
  );

  fastify.get<{ Querystring: VerifyEmailQuery }>('/verify-email', async (req, reply) => {
    try {
      const { token } = req.query;
      if (!token) {
        return reply.status(400).send('Token is required');
      }

      await verifyEmail(token);
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
      // Escape the error message to prevent XSS
      const safeError = escapeHtml(errorMessage(err));
      return reply.status(400).send(`Verification failed: ${safeError}`);
    }
  });
}
