import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { PGlite } from '@electric-sql/pglite';
import * as jwt from 'jsonwebtoken';
import { revokeAllTokens } from '../src/auth';
import { captureMcpRoutes, captureRoutes } from '../src/capture';
import { captureKeyFingerprint } from '../src/capture/capture-seal';
import { resetCaptureMemoryForTests } from '../src/capture/capture-retry-window';
import { resetCaptureRateLimitForTests } from '../src/capture/capture-rate-limit';
import {
  CAPTURE_SAVED_TEXT,
  CAPTURE_SWITCHED_OFF_TEXT,
} from '../src/capture/capture.const';
import {
  addUser,
  createCapturePrisma,
  createCaptureSchema,
  newCaptureKeyPair,
  openCapture,
} from './capture-pglite.helper';

/**
 * The capture routes end to end on PGlite, with the real sync `verifyToken`:
 * a capture token and a sync JWT must each be refused where the other belongs.
 */

const mocked = vi.hoisted(() => {
  // auth.ts reads it at module scope.
  process.env.JWT_SECRET = 'capture-routes-spec-secret-0123456789';
  return { prisma: {} as Record<string, unknown> };
});
vi.mock('../src/db', () => ({ prisma: mocked.prisma }));
// tests/setup.ts mocks auth; these tests need the real token check.
vi.mock('../src/auth', async (importOriginal) => importOriginal());

const toolCall = (
  id: number,
  title: string,
  notes?: string,
  due: { dueDate?: string; dueTime?: string; repeat?: Record<string, unknown> } = {},
): Record<string, unknown> => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: {
    name: 'create_task',
    arguments: { title, ...(notes ? { notes } : {}), ...due },
  },
});

describe('capture routes (PGlite)', () => {
  let db: PGlite;
  let app: FastifyInstance;
  let userId: number;
  let syncJwt: string;
  let key: ReturnType<typeof newCaptureKeyPair>;

  const api = (
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    url: string,
    payload?: unknown,
    token = syncJwt,
  ): Promise<LightMyRequestResponse> =>
    app.inject({
      method,
      url: `/api/capture${url}`,
      // Like the app's _fetchApi: JSON content type even on bodyless DELETEs.
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });

  const mcp = (
    token: string | null,
    body: unknown,
    headers: Record<string, string> = {},
  ): Promise<LightMyRequestResponse> =>
    app.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      payload: typeof body === 'string' ? body : JSON.stringify(body),
    });

  const newToken = async (): Promise<string> =>
    (await api('POST', '/tokens', { clientName: 'Claude' })).json().token;

  const toolText = (res: LightMyRequestResponse): { text: string; isError?: boolean } => {
    const { result } = res.json();
    return { text: result.content[0].text, isError: result.isError };
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    Object.assign(mocked.prisma, createCapturePrisma(db));
    app = Fastify();
    await app.register(captureMcpRoutes);
    await app.register(captureRoutes, { prefix: '/api/capture' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  beforeEach(async () => {
    resetCaptureMemoryForTests();
    resetCaptureRateLimitForTests();
    await createCaptureSchema(db);
    userId = await addUser(db, 'a@example.com');
    syncJwt = jwt.sign(
      { userId, email: 'a@example.com', tokenVersion: 0 },
      process.env.JWT_SECRET as string,
    );
    key = newCaptureKeyPair();
  });

  it('captures through /mcp and hands the sealed item to a device', async () => {
    expect((await api('PUT', '/key', { publicKey: key.publicKey })).json()).toEqual({
      status: 'registered',
      discarded: 0,
    });
    const token = await newToken();

    const init = await mcp(token, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 't' },
      },
    });
    expect(init.json().result.protocolVersion).toBe('2025-06-18');
    const list = await mcp(token, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(list.json().result.tools.map((t: { name: string }) => t.name)).toEqual([
      'create_task',
    ]);
    const call = await mcp(token, toolCall(3, 'Buy milk', 'two litres'));
    expect(toolText(call)).toEqual({ text: CAPTURE_SAVED_TEXT, isError: undefined });

    const fingerprint = captureKeyFingerprint(key.publicKey);
    const claim = (
      await api('POST', '/claim', { deviceId: 'dev-a', fingerprint })
    ).json();
    expect(claim.status).toBe('ok');
    const [item] = claim.items;
    expect(openCapture(key.ecdh, item.itemId, item.ciphertext)).toMatchObject({
      v: 1,
      title: 'Buy milk',
      notes: 'two litres',
      client: 'Claude',
    });
    const ack = await api('POST', '/ack', {
      deviceId: 'dev-a',
      acks: [{ itemId: item.itemId, taskId: item.taskId }],
    });
    expect(ack.json()).toEqual({ deleted: 1 });
  });

  it('refuses a sync JWT on /mcp and a capture token on /api/capture', async () => {
    const token = await newToken();
    const noToken = await mcp(null, toolCall(1, 'x'));
    expect(noToken.statusCode).toBe(401);
    expect(noToken.headers['www-authenticate']).toBe('Bearer scope="tasks:capture"');

    const withJwt = await mcp(syncJwt, toolCall(1, 'x'));
    expect(withJwt.statusCode).toBe(401);
    expect(withJwt.headers['www-authenticate']).toContain('error="invalid_token"');

    expect((await api('GET', '/grants', undefined, token)).statusCode).toBe(401);
    expect((await api('GET', '/grants')).statusCode).toBe(200);
  });

  it('answers a tool error while capture is switched off', async () => {
    const token = await newToken();
    expect(toolText(await mcp(token, toolCall(1, 'x')))).toEqual({
      text: CAPTURE_SWITCHED_OFF_TEXT,
      isError: true,
    });
  });

  it('stores one item for identical concurrent retries', async () => {
    await api('PUT', '/key', { publicKey: key.publicKey });
    const token = await newToken();
    const replies = await Promise.all(
      [1, 2, 3].map((id) => mcp(token, toolCall(id, 'Same'))),
    );
    for (const reply of replies) expect(toolText(reply).text).toBe(CAPTURE_SAVED_TEXT);
    const grants = (await api('GET', '/grants')).json().grants;
    expect(grants[0].pendingCount).toBe(1);
  });

  it('seals due day, time and repeat, and keeps differing schedules apart', async () => {
    await api('PUT', '/key', { publicKey: key.publicKey });
    const token = await newToken();
    const due = { dueDate: '2026-10-16', dueTime: '09:30' };
    await mcp(token, toolCall(1, 'Dentist', undefined, due));
    await mcp(token, toolCall(2, 'Dentist', undefined, due));
    await mcp(token, toolCall(3, 'Dentist', undefined, { dueDate: '2026-10-17' }));
    await mcp(
      token,
      toolCall(4, 'Dentist', undefined, {
        dueDate: '2026-10-17',
        repeat: { cycle: 'weekly', weekdays: ['fri', 'mon'] },
      }),
    );

    const claim = (
      await api('POST', '/claim', {
        deviceId: 'dev-a',
        fingerprint: captureKeyFingerprint(key.publicKey),
      })
    ).json();
    const payloads = claim.items.map((item: { itemId: string; ciphertext: string }) =>
      openCapture(key.ecdh, item.itemId, item.ciphertext),
    );
    expect(payloads).toEqual([
      expect.objectContaining({ v: 1, title: 'Dentist', ...due }),
      expect.objectContaining({ v: 1, title: 'Dentist', dueDate: '2026-10-17' }),
      expect.objectContaining({
        dueDate: '2026-10-17',
        repeat: { cycle: 'weekly', weekdays: ['mon', 'fri'] },
      }),
    ]);
    expect(payloads[1].dueTime).toBeUndefined();
    expect(payloads[0].repeat).toBeUndefined();
    expect(payloads[1].repeat).toBeUndefined();
  });

  it('refuses a disabled key and revokes its tokens', async () => {
    await api('PUT', '/key', { publicKey: key.publicKey });
    const token = await newToken();
    await api('DELETE', '/key');
    expect((await mcp(token, toolCall(1, 'x'))).statusCode).toBe(401);
    const again = await api('PUT', '/key', { publicKey: key.publicKey });
    expect(again.statusCode).toBe(409);
    expect((await api('PUT', '/key', { publicKey: 'bm90IGEga2V5' })).statusCode).toBe(
      400,
    );
  });

  it('signing out everywhere revokes capture tokens too', async () => {
    const token = await newToken();
    await revokeAllTokens(userId);
    expect((await mcp(token, toolCall(1, 'x'))).statusCode).toBe(401);
  });

  it('revokes a grant and 404s an unknown one', async () => {
    const token = await newToken();
    const [grant] = (await api('GET', '/grants')).json().grants;
    expect((await api('DELETE', `/grants/${grant.id}?discard=1`)).json()).toEqual({
      discarded: 0,
    });
    expect((await api('DELETE', `/grants/${grant.id}`)).statusCode).toBe(404);
    expect((await mcp(token, toolCall(1, 'x'))).statusCode).toBe(401);
  });

  it('handles transport errors: method, version, parse, size, rate', async () => {
    const token = await newToken();
    const get = await app.inject({ method: 'GET', url: '/mcp' });
    expect(get.statusCode).toBe(405);
    expect(get.headers.allow).toBe('POST');

    const badVersion = await mcp(token, toolCall(1, 'x'), {
      'mcp-protocol-version': '1999-01-01',
    });
    expect(badVersion.statusCode).toBe(400);
    const badJson = await mcp(token, '{nope');
    expect(badJson.json().error.code).toBe(-32700);
    const tooBig = await mcp(token, toolCall(1, 'x'.repeat(65 * 1024)));
    expect(tooBig.statusCode).toBe(413);

    // 30 per minute per grant. The version and parse errors count; the
    // oversized body never reaches the handler.
    const statuses: number[] = [];
    for (let i = 0; i < 29; i++) {
      statuses.push(
        (await mcp(token, { jsonrpc: '2.0', id: i, method: 'ping' })).statusCode,
      );
    }
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
    expect(statuses[statuses.length - 1]).toBe(429);
  });

  it('limits failed auths per IP before looking up the token', async () => {
    const fake = `sp_cap_00000000-0000-4000-8000-000000000000_x`;
    const statuses: number[] = [];
    for (let i = 0; i < 121; i++) {
      statuses.push((await mcp(fake, toolCall(i, 'x'))).statusCode);
    }
    expect(statuses.slice(0, 120).every((s) => s === 401)).toBe(true);
    expect(statuses[120]).toBe(429);
  });

  it('does not let failed auths behind a shared IP lock out a working token', async () => {
    const token = await newToken();
    expect((await mcp(token, { jsonrpc: '2.0', id: 0, method: 'ping' })).statusCode).toBe(
      200,
    );
    const fake = `sp_cap_00000000-0000-4000-8000-000000000000_x`;
    for (let i = 0; i < 121; i++) await mcp(fake, toolCall(i, 'x'));
    expect((await mcp(fake, toolCall(0, 'x'))).statusCode).toBe(429);
    expect((await mcp(token, { jsonrpc: '2.0', id: 1, method: 'ping' })).statusCode).toBe(
      200,
    );
  });
});
