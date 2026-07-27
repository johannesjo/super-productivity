import { Injectable } from '@angular/core';
import { decrypt, decryptBatch, encrypt, encryptBatch } from '@sp/sync-core';
import { SyncOperation } from '../sync-providers/provider.interface';
import { DecryptError } from '../core/errors/sync-errors';
import { isFullStateOpType } from '../core/operation.types';
import {
  assertDecryptedFullStateOpIntegrity,
  assertDecryptedOpMetadataIntegrity,
} from './verify-decrypted-op-integrity';

export type OperationDecryptionFailureStage = 'envelope' | 'decrypt' | 'parse';

export interface OperationDecryptionErrorDetails {
  operationId: string;
  encryptedBatchIndex: number;
  stage: OperationDecryptionFailureStage;
}

/**
 * Identifies an encrypted operation that could not be processed without
 * retaining its ciphertext, decrypted payload, or encryption key.
 */
export class OperationDecryptionError extends DecryptError {
  override name = 'OperationDecryptionError';
  readonly operationId: string;
  readonly encryptedBatchIndex: number;
  readonly stage: OperationDecryptionFailureStage;

  constructor(details: OperationDecryptionErrorDetails) {
    super('Encrypted operation payload could not be processed');
    this.operationId = details.operationId;
    this.encryptedBatchIndex = details.encryptedBatchIndex;
    this.stage = details.stage;
  }
}

/**
 * Handles E2E encryption/decryption of operation payloads for SuperSync.
 * Uses AES-256-GCM with Argon2id key derivation.
 *
 * The single-item and batch primitives all share the @sp/sync-core session
 * cache, so repeated calls with the same password reuse the derived key —
 * critical on mobile where Argon2id (64MB, 3 iterations) takes 500ms-2000ms.
 *
 * Tests should use real encryption with weakened Argon2 params
 * (`setArgon2ParamsForTesting({ memorySize: 8, iterations: 1 })`) rather than
 * mocking the package exports.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationEncryptionService {
  /**
   * Encrypts the payload of a SyncOperation.
   * Returns a new operation with encrypted payload and isPayloadEncrypted=true.
   */
  async encryptOperation(op: SyncOperation, encryptKey: string): Promise<SyncOperation> {
    const payloadStr = JSON.stringify(op.payload);
    const encryptedPayload = await encrypt(payloadStr, encryptKey);
    return {
      ...op,
      payload: encryptedPayload,
      isPayloadEncrypted: true,
    };
  }

  /**
   * Decrypts the payload of a SyncOperation.
   * Returns a new operation with decrypted payload.
   * Throws DecryptError if decryption fails.
   * Non-encrypted operations pass through unchanged.
   */
  async decryptOperation(op: SyncOperation, encryptKey: string): Promise<SyncOperation> {
    if (!op.isPayloadEncrypted) {
      return op;
    }
    if (typeof op.payload !== 'string') {
      throw new DecryptError('Encrypted payload must be a string');
    }
    let decryptedStr: string;
    try {
      decryptedStr = await decrypt(op.payload, encryptKey);
    } catch (e) {
      throw new DecryptError('Failed to decrypt operation payload', e);
    }
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(decryptedStr);
    } catch (e) {
      throw new DecryptError('Failed to parse decrypted operation payload as JSON', e);
    }
    // Verify the untrusted metadata against the now-authenticated payload before
    // trusting it downstream (GHSA-8pxh-mgc7-gp3g). Throws on tampering.
    assertDecryptedOpMetadataIntegrity(op, parsedPayload);
    if (isFullStateOpType(op.opType)) {
      await assertDecryptedFullStateOpIntegrity(op, parsedPayload);
    }
    return {
      ...op,
      payload: parsedPayload,
      isPayloadEncrypted: false,
    };
  }

  /**
   * Batch encrypt operations for upload. Derives the Argon2id key once.
   */
  async encryptOperations(
    ops: SyncOperation[],
    encryptKey: string,
  ): Promise<SyncOperation[]> {
    if (ops.length === 0) {
      return [];
    }

    const payloadStrings = ops.map((op) => JSON.stringify(op.payload));
    const encryptedPayloads = await encryptBatch(payloadStrings, encryptKey);

    return ops.map((op, index) => ({
      ...op,
      payload: encryptedPayloads[index],
      isPayloadEncrypted: true,
    }));
  }

  /**
   * Batch decrypt operations after download. Caches keys by salt.
   * Non-encrypted ops pass through unchanged.
   */
  async decryptOperations(
    ops: SyncOperation[],
    encryptKey: string,
  ): Promise<SyncOperation[]> {
    if (ops.length === 0) {
      return [];
    }

    const encryptedOps: { index: number; op: SyncOperation }[] = [];
    const results: SyncOperation[] = new Array(ops.length);

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.isPayloadEncrypted) {
        if (typeof op.payload !== 'string') {
          throw new OperationDecryptionError({
            operationId: op.id,
            encryptedBatchIndex: encryptedOps.length,
            stage: 'envelope',
          });
        }
        encryptedOps.push({ index: i, op });
      } else {
        results[i] = op;
      }
    }

    if (encryptedOps.length === 0) {
      return ops;
    }

    const encryptedPayloads = encryptedOps.map((item) => item.op.payload as string);
    let decryptedStrings: string[];
    try {
      decryptedStrings = await decryptBatch(encryptedPayloads, encryptKey);
    } catch {
      let failedIndex: number | undefined;
      try {
        failedIndex = await this._findFirstDecryptionFailureIndex(
          encryptedPayloads,
          encryptKey,
        );
      } catch {
        // Attribution is best-effort and must never mask the original batch failure.
      }
      if (failedIndex !== undefined) {
        throw new OperationDecryptionError({
          operationId: encryptedOps[failedIndex].op.id,
          encryptedBatchIndex: failedIndex,
          stage: 'decrypt',
        });
      }
      throw new DecryptError('Failed to decrypt operation payloads');
    }

    for (let i = 0; i < encryptedOps.length; i++) {
      const { index, op } = encryptedOps[i];
      let parsedPayload: unknown;
      try {
        parsedPayload = JSON.parse(decryptedStrings[i]);
      } catch {
        throw new OperationDecryptionError({
          operationId: op.id,
          encryptedBatchIndex: i,
          stage: 'parse',
        });
      }
      // Verify the untrusted metadata against the now-authenticated payload
      // before trusting it downstream (GHSA-8pxh-mgc7-gp3g). Throws on tampering.
      assertDecryptedOpMetadataIntegrity(op, parsedPayload);
      if (isFullStateOpType(op.opType)) {
        await assertDecryptedFullStateOpIntegrity(op, parsedPayload);
      }
      results[index] = {
        ...op,
        payload: parsedPayload,
        isPayloadEncrypted: false,
      };
    }

    return results;
  }

  /**
   * The batch primitive does not identify which ciphertext failed. Re-check
   * items serially only after a batch failure and stop at the first failure.
   * The shared session cache avoids repeating normal key derivation work.
   */
  private async _findFirstDecryptionFailureIndex(
    encryptedPayloads: string[],
    encryptKey: string,
  ): Promise<number | undefined> {
    for (let i = 0; i < encryptedPayloads.length; i++) {
      try {
        await decrypt(encryptedPayloads[i], encryptKey);
      } catch {
        return i;
      }
    }
    return undefined;
  }

  /**
   * Encrypts an arbitrary payload (for snapshot uploads).
   */
  async encryptPayload(payload: unknown, encryptKey: string): Promise<string> {
    const payloadStr = JSON.stringify(payload);
    return encrypt(payloadStr, encryptKey);
  }

  /**
   * Decrypts an encrypted payload string and JSON-parses the result.
   */
  async decryptPayload<T = unknown>(
    encryptedPayload: string,
    encryptKey: string,
  ): Promise<T> {
    let decryptedStr: string;
    try {
      decryptedStr = await decrypt(encryptedPayload, encryptKey);
    } catch (e) {
      throw new DecryptError('Failed to decrypt payload', e);
    }
    try {
      return JSON.parse(decryptedStr) as T;
    } catch (e) {
      throw new DecryptError('Failed to parse decrypted payload as JSON', e);
    }
  }
}
