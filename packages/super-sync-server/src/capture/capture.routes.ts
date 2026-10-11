import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate, getAuthUser } from '../middleware';
import { Logger } from '../logger';
import {
  CAPTURE_CLAIM_BATCH_SIZE,
  CAPTURE_CLIENT_NAME_MAX_CHARS,
  CAPTURE_DEVICE_ID_MAX_CHARS,
} from './capture.const';
import { InvalidCaptureKeyError, parseCapturePublicKey } from './capture-seal';
import { disableCaptureKey, registerCaptureKey } from './capture-key.store';
import {
  createCaptureTokenGrant,
  listCaptureGrants,
  revokeCaptureGrant,
} from './capture-grant.store';
import { ackCaptures, claimCaptures } from './capture-queue.store';

/**
 * `/api/capture/*`: what the app calls, behind the sync `authenticate`. A
 * capture token is not a JWT and fails there.
 */

const DeviceIdSchema = z.string().min(1).max(CAPTURE_DEVICE_ID_MAX_CHARS);
const IdSchema = z.string().min(1).max(64);

const RegisterKeySchema = z.object({ publicKey: z.string().min(1).max(512) });
const ClaimSchema = z.object({
  deviceId: DeviceIdSchema,
  fingerprint: z.string().min(1).max(64),
});
const AckSchema = z.object({
  deviceId: DeviceIdSchema,
  acks: z
    .array(z.object({ itemId: IdSchema, taskId: IdSchema }))
    .max(CAPTURE_CLAIM_BATCH_SIZE),
});
const CreateTokenSchema = z.object({
  clientName: z.string().trim().min(1).max(CAPTURE_CLIENT_NAME_MAX_CHARS),
});

const badRequest = (reply: FastifyReply, error: string): FastifyReply =>
  reply.code(400).send({ error });

const putKey = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const parsed = RegisterKeySchema.safeParse(req.body);
  if (!parsed.success) return badRequest(reply, 'Invalid body');
  try {
    parseCapturePublicKey(parsed.data.publicKey);
  } catch (err) {
    if (err instanceof InvalidCaptureKeyError) return badRequest(reply, err.message);
    throw err;
  }
  const { userId } = getAuthUser(req);
  const result = await registerCaptureKey(userId, parsed.data.publicKey);
  if (result.status === 'disabled') {
    return reply.code(409).send({ error: 'capture_disabled' });
  }
  if (result.discarded > 0) {
    Logger.info(
      `[user:${userId}] Capture key replaced, ${result.discarded} items dropped`,
    );
  }
  return reply.send(result);
};

const deleteKey = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => reply.send(await disableCaptureKey(getAuthUser(req).userId));

const claim = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
  const parsed = ClaimSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(reply, 'Invalid body');
  const { deviceId, fingerprint } = parsed.data;
  return reply.send(await claimCaptures(getAuthUser(req).userId, deviceId, fingerprint));
};

const ack = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
  const parsed = AckSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(reply, 'Invalid body');
  const { deviceId, acks } = parsed.data;
  const deleted = await ackCaptures(getAuthUser(req).userId, deviceId, acks);
  return reply.send({ deleted });
};

const createToken = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const parsed = CreateTokenSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(reply, 'Invalid body');
  return reply.send(
    await createCaptureTokenGrant(getAuthUser(req).userId, parsed.data.clientName),
  );
};

const listGrants = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> =>
  reply.send({ grants: await listCaptureGrants(getAuthUser(req).userId) });

const deleteGrant = async (
  req: FastifyRequest<{ Params: { id: string }; Querystring: { discard?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const id = IdSchema.safeParse(req.params.id);
  if (!id.success) return badRequest(reply, 'Invalid grant id');
  const result = await revokeCaptureGrant(
    getAuthUser(req).userId,
    id.data,
    req.query.discard === '1',
  );
  return result ? reply.send(result) : reply.code(404).send({ error: 'Not found' });
};

export const captureRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // The app's _fetchApi sends a JSON content type on bodyless DELETEs too,
  // which Fastify's default parser rejects with 400. Encapsulated to this plugin.
  const parseJson = fastify.getDefaultJsonParser('error', 'ignore');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) =>
      body === '' ? done(null, undefined) : parseJson(req, body as string, done),
  );
  fastify.addHook('preHandler', authenticate);

  fastify.put('/key', putKey);
  fastify.delete('/key', deleteKey);
  fastify.post('/claim', claim);
  fastify.post('/ack', ack);
  // Tokens are long-lived; a burst of creation is never a legitimate pattern.
  fastify.post(
    '/tokens',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    createToken,
  );
  fastify.get('/grants', listGrants);
  fastify.delete('/grants/:id', deleteGrant);
};
