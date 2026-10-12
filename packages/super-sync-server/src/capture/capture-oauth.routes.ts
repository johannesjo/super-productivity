import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CaptureOAuthClient, isAllowedCaptureRedirect } from './capture-oauth-clients';
import {
  approveCaptureAuthorization,
  createCaptureAuthorization,
  exchangeCaptureAuthorization,
  refreshCaptureAuthorization,
} from './capture-oauth.store';
import {
  isCaptureOAuthLimited,
  isAuthFailureLimited,
  recordAuthFailure,
  recordAuthSuccess,
} from './capture-rate-limit';
import { parseRefreshToken } from './capture-oauth-token';
import { parseCaptureToken } from './capture-token';

interface OAuthOptions {
  publicUrl: string;
  signingKey: string;
  clients: CaptureOAuthClient[];
}

const AuthorizeSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().max(2048),
  redirect_uri: z.string().max(2048),
  resource: z.string().max(2048),
  code_challenge_method: z.literal('S256'),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  state: z.string().max(1024).default(''),
  scope: z.string().max(200).default('tasks:capture'),
});
const ExchangeSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1).max(100),
  client_id: z.string().max(2048),
  redirect_uri: z.string().max(2048),
  resource: z.string().max(2048),
  code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
});
const RefreshSchema = z.object({
  grant_type: z.literal('refresh_token'),
  refresh_token: z.string().max(256),
  client_id: z.string().max(2048),
  resource: z.string().max(2048),
  scope: z.string().max(200).optional(),
});
const ApproveSchema = z.object({
  authId: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code: z.string().min(1).max(32),
});
const htmlEscape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const consentPage = (
  id: string,
  client: CaptureOAuthClient,
  redirect: string,
): string => {
  const url = new URL(redirect);
  const local = url.protocol === 'http:';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect to Super Productivity</title><link rel="stylesheet" href="/style.css">
<script src="/capture-oauth.js" defer></script></head><body><main class="container">
<h1>Connect ${htmlEscape(client.name)} to Super Productivity</h1>
<p>This assistant can add tasks to your Inbox. It cannot read your tasks or sync data.</p>
<p>Returning to <strong>${htmlEscape(url.hostname)}</strong>.</p>
${local ? '<p>This assistant runs on your computer. Continue only if you started this connection yourself.</p>' : ''}
<p>Your assistant and sync server see submitted text. Waiting tasks are stored encrypted; enable sync encryption to keep the capture key private.</p>
<p>In Super Productivity, open Settings → Sync → SuperSync → AI assistants, enable task capture, then click Create connection code.</p>
<form id="capture-consent" data-auth-id="${id}">
<label for="connect-code">Connection code</label>
<input id="connect-code" name="code" required maxlength="32" autocomplete="off" spellcheck="false" autofocus>
<p>Only enter a code from your own account. You can revoke this connection in Super Productivity at any time.</p>
<button type="submit">Allow adding tasks</button>
<button type="button" id="cancel">Cancel</button>
<p id="status" role="status"></p></form></main></body></html>`;
};

export const captureOAuthRoutes = async (
  app: FastifyInstance,
  options: OAuthOptions,
): Promise<void> => {
  const { publicUrl, signingKey, clients } = options;
  const resource = `${publicUrl}/mcp`;
  const config = { rateLimit: false as const };
  app.addHook('onRequest', async (_req, reply) => {
    reply
      .header('Cache-Control', 'no-store')
      .header('Pragma', 'no-cache')
      .header('Referrer-Policy', 'no-referrer');
  });
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string', bodyLimit: 8192 },
    (_req, body, done) => {
      const params = new URLSearchParams(body as string);
      const result: Record<string, string> = Object.create(null);
      for (const [key, value] of params) {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          done(null, null);
          return;
        }
        result[key] = value;
      }
      done(null, result);
    },
  );
  const metadata = {
    resource,
    authorization_servers: [publicUrl],
    scopes_supported: ['tasks:capture'],
    bearer_methods_supported: ['header'],
    resource_name: 'Super Productivity task capture',
  };
  app.get('/.well-known/oauth-protected-resource/mcp', { config }, async () => metadata);
  app.get('/.well-known/oauth-protected-resource', { config }, async () => metadata);
  app.get('/.well-known/oauth-authorization-server', { config }, async () => ({
    issuer: publicUrl,
    authorization_endpoint: `${publicUrl}/oauth/authorize`,
    token_endpoint: `${publicUrl}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    client_id_metadata_document_supported: true,
    scopes_supported: ['tasks:capture', 'offline_access'],
  }));
  app.get('/oauth/authorize', { config }, async (req, reply) => {
    if (isCaptureOAuthLimited('authorize', req.ip))
      return reply.code(429).send({ error: 'rate_limited' });
    const parsed = AuthorizeSchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const q = parsed.data;
    const client = clients.find((c) => c.clientId === q.client_id);
    if (!client || !isAllowedCaptureRedirect(client, q.redirect_uri)) {
      return reply
        .code(400)
        .type('text/plain')
        .send('This assistant or its callback is not allowed by this SuperSync server.');
    }
    const scopes = q.scope.split(' ');
    if (
      !scopes.includes('tasks:capture') ||
      scopes.some((s) => !['tasks:capture', 'offline_access'].includes(s))
    ) {
      return reply.code(400).send({ error: 'invalid_scope' });
    }
    if (q.resource !== resource) return reply.code(400).send({ error: 'invalid_target' });
    const id = await createCaptureAuthorization({
      clientId: client.clientId,
      clientName: client.name,
      redirectUri: q.redirect_uri,
      resource,
      codeChallenge: q.code_challenge,
      state: q.state,
      scope: q.scope,
    });
    return reply.type('text/html').send(consentPage(id, client, q.redirect_uri));
  });
  app.post(
    '/oauth/authorize/approve',
    { config, bodyLimit: 1024 },
    async (req, reply) => {
      // JSON + same-origin prevents cross-site form submission. The random authId binds the page.
      if (req.headers.origin && req.headers.origin !== new URL(publicUrl).origin)
        return reply.code(403).send({ error: 'invalid_request' });
      if (isCaptureOAuthLimited('approve', req.ip))
        return reply.code(429).send({ error: 'rate_limited' });
      const parsed = ApproveSchema.safeParse(req.body);
      if (!req.headers['content-type']?.startsWith('application/json') || !parsed.success)
        return reply.code(400).send({ error: 'invalid_request' });
      const redirect = await approveCaptureAuthorization(
        parsed.data.authId,
        parsed.data.code,
        publicUrl,
      );
      return redirect
        ? reply.send({ redirect })
        : reply.code(400).send({ error: 'invalid_grant' });
    },
  );
  app.post('/oauth/token', { config, bodyLimit: 8192 }, async (req, reply) => {
    const exchange = ExchangeSchema.safeParse(req.body);
    const refresh = RefreshSchema.safeParse(req.body);
    const grantId = refresh.success
      ? (parseRefreshToken(signingKey, refresh.data.refresh_token)?.grantId ?? null)
      : null;
    if (isAuthFailureLimited(req.ip, grantId))
      return reply.code(429).header('Retry-After', '60').send({ error: 'rate_limited' });
    if (!exchange.success && !refresh.success) {
      recordAuthFailure(req.ip, grantId);
      const grantType = z.object({ grant_type: z.string() }).safeParse(req.body);
      const unsupported =
        grantType.success &&
        !['authorization_code', 'refresh_token'].includes(grantType.data.grant_type);
      return reply
        .code(400)
        .send({ error: unsupported ? 'unsupported_grant_type' : 'invalid_request' });
    }
    const clientId = exchange.success
      ? exchange.data.client_id
      : refresh.success
        ? refresh.data.client_id
        : null;
    if (!clients.some((c) => c.clientId === clientId)) {
      recordAuthFailure(req.ip, grantId);
      return reply.code(400).send({ error: 'invalid_client' });
    }
    const target = exchange.success
      ? exchange.data.resource
      : refresh.success
        ? refresh.data.resource
        : null;
    if (target !== resource) return reply.code(400).send({ error: 'invalid_target' });
    if (
      refresh.success &&
      refresh.data.scope &&
      (!refresh.data.scope.split(' ').includes('tasks:capture') ||
        refresh.data.scope
          .split(' ')
          .some((s) => !['tasks:capture', 'offline_access'].includes(s)))
    )
      return reply.code(400).send({ error: 'invalid_scope' });
    const result = exchange.success
      ? await exchangeCaptureAuthorization(
          {
            code: exchange.data.code,
            clientId: exchange.data.client_id,
            redirectUri: exchange.data.redirect_uri,
            verifier: exchange.data.code_verifier,
            resource,
          },
          signingKey,
        )
      : refresh.success
        ? await refreshCaptureAuthorization(
            refresh.data.refresh_token,
            refresh.data.client_id,
            resource,
            signingKey,
          )
        : null;
    if (!result) {
      recordAuthFailure(req.ip, grantId);
      return reply.code(400).send({ error: 'invalid_grant' });
    }
    recordAuthSuccess(parseCaptureToken(result.access_token)!.grantId);
    return reply.send({
      ...result,
      scope: refresh.success && refresh.data.scope ? refresh.data.scope : result.scope,
    });
  });
};
