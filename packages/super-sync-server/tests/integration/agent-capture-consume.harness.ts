/**
 * Test-only consume-on-accept experiment. Installs around the REAL per-operation
 * upload implementation, inside its existing transaction. No production route,
 * queue migration, replacement clock, or replacement upload implementation.
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { getStoredEntityIds, stableJsonStringify } from '../../src/sync/conflict';
import { OperationUploadService } from '../../src/sync/services/operation-upload.service';
import { ValidationService } from '../../src/sync/services/validation.service';
import {
  DEFAULT_SYNC_CONFIG,
  Operation,
  ProcessOperationResult,
  SYNC_ERROR_CODES,
  UploadResult,
} from '../../src/sync/sync.types';

const TABLE = 'agent_capture_consume_spike_queue';
export const getConsumedCaptureTaskId = (captureId: string): string =>
  `capture-${captureId}`;
export interface ConsumeCaptureReceipt {
  captureId: string;
  opId: string;
  serverSeq: number;
}
type CaptureRow = {
  captureId: string;
  opId: string | null;
  serverSeq: number | null;
  fingerprint: string | null;
};

// Reuse ordinary duplicate identity conventions: encrypted retries use a fresh
// IV, so ciphertext bytes cannot identify the same operation. Receipt content
// is a digest of structural metadata; it contains no readable task payload.
const fingerprint = (op: Operation): string =>
  createHash('sha256')
    .update(
      stableJsonStringify({
        ...op,
        entityIds: getStoredEntityIds(op),
        payload: op.isPayloadEncrypted ? null : op.payload,
      }),
    )
    .digest('hex');
const reject = (
  op: Operation,
  errorCode: UploadResult['errorCode'],
  error: string,
  serverSeq?: number,
): ProcessOperationResult => ({
  result: { opId: op.id, accepted: false, errorCode, error, serverSeq },
  storageBytes: 0,
  fallback: false,
});

export const createAgentCaptureConsumeHarness = (
  prisma: PrismaClient,
  options: { afterReceiptWritten?: () => Promise<void> | void } = {},
) => ({
  async initialize(): Promise<void> {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      capture_id TEXT NOT NULL,
      title TEXT NULL,
      notes TEXT NULL,
      consumed_op_id TEXT UNIQUE NULL,
      consumed_server_seq INTEGER NULL,
      fingerprint TEXT NULL,
      PRIMARY KEY (user_id, capture_id),
      CHECK ((consumed_op_id IS NULL) = (consumed_server_seq IS NULL)),
      CHECK ((consumed_op_id IS NULL) = (fingerprint IS NULL))
    )`);
  },
  async enqueueCapture(input: {
    userId: number;
    captureId: string;
    title: string;
    notes?: string;
  }): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE} (user_id, capture_id, title, notes)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, capture_id) DO NOTHING`,
      input.userId,
      input.captureId,
      input.title,
      input.notes ?? null,
    );
  },
  async readCaptureReceipt(input: {
    userId: number;
    captureId: string;
  }): Promise<ConsumeCaptureReceipt | null> {
    const rows = await prisma.$queryRawUnsafe<ConsumeCaptureReceipt[]>(
      `SELECT capture_id AS "captureId", consumed_op_id AS "opId",
       consumed_server_seq AS "serverSeq" FROM ${TABLE}
       WHERE user_id = $1 AND capture_id = $2 AND consumed_op_id IS NOT NULL`,
      input.userId,
      input.captureId,
    );
    return rows[0] ?? null;
  },
  install(): () => void {
    const original = OperationUploadService.prototype.processOperation;
    const validator = new ValidationService(DEFAULT_SYNC_CONFIG);
    OperationUploadService.prototype.processOperation = async function (...args) {
      const [userId, clientId, op, , tx, prevalidated] = args;
      if (op.captureId === undefined) return original.apply(this, args);
      const validation = prevalidated ?? validator.validateOp(op, clientId);
      if (!validation.valid) return original.apply(this, args);
      if (
        op.opType !== 'CRT' ||
        op.entityType !== 'TASK' ||
        op.actionType !== '[Task Shared] addTask' ||
        op.entityId !== getConsumedCaptureTaskId(op.captureId) ||
        (op.entityIds !== undefined &&
          (op.entityIds.length !== 1 || op.entityIds[0] !== op.entityId))
      ) {
        return reject(op, SYNC_ERROR_CODES.INVALID_PAYLOAD, 'Invalid capture binding');
      }
      const rows = await tx.$queryRawUnsafe<CaptureRow[]>(
        `SELECT capture_id AS "captureId", consumed_op_id AS "opId",
         consumed_server_seq AS "serverSeq", fingerprint FROM ${TABLE}
         WHERE user_id = $1 AND capture_id = $2 FOR UPDATE`,
        userId,
        op.captureId,
      );
      const capture = rows[0];
      if (!capture) {
        return reject(op, SYNC_ERROR_CODES.INVALID_PAYLOAD, 'Capture unavailable');
      }
      const digest = fingerprint(op);
      if (capture.opId !== null) {
        if (capture.opId === op.id) {
          return capture.fingerprint === digest
            ? reject(
                op,
                SYNC_ERROR_CODES.DUPLICATE_OPERATION,
                'Duplicate operation ID',
                capture.serverSeq ?? undefined,
              )
            : reject(op, SYNC_ERROR_CODES.INVALID_OP_ID, 'Capture retry changed');
        }
        return reject(
          op,
          SYNC_ERROR_CODES.CAPTURE_ALREADY_CONSUMED,
          'Capture already consumed',
        );
      }
      const bound = await tx.$queryRawUnsafe<Array<{ captureId: string }>>(
        `SELECT capture_id AS "captureId" FROM ${TABLE} WHERE consumed_op_id = $1`,
        op.id,
      );
      if (bound.length) {
        return reject(op, SYNC_ERROR_CODES.INVALID_OP_ID, 'Operation already bound');
      }
      const result = await original.apply(this, args);
      if (!result.result.accepted) return result;
      await tx.$executeRawUnsafe(
        `UPDATE ${TABLE} SET consumed_op_id = $3, consumed_server_seq = $4,
         fingerprint = $5, title = NULL, notes = NULL
         WHERE user_id = $1 AND capture_id = $2`,
        userId,
        op.captureId,
        op.id,
        result.result.serverSeq,
        digest,
      );
      await options.afterReceiptWritten?.();
      return result;
    };
    return () => {
      OperationUploadService.prototype.processOperation = original;
    };
  },
});
