import { Injectable } from '@angular/core';
import { encrypt, decrypt } from '../../../../pfapi/api/encryption/encryption';
import { SyncOperation } from '../../../../pfapi/api/sync/sync-provider.interface';
import { DecryptError } from '../../../../pfapi/api/errors/errors';

/**
 * Handles E2E encryption/decryption of operation payloads for SuperSync.
 * Uses AES-256-GCM with Argon2id key derivation (same as legacy sync providers).
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
    try {
      const decryptedStr = await decrypt(op.payload, encryptKey);
      return {
        ...op,
        payload: JSON.parse(decryptedStr),
        isPayloadEncrypted: false,
      };
    } catch (e) {
      throw new DecryptError('Failed to decrypt operation payload', e);
    }
  }

  /**
   * Batch encrypt operations for upload.
   */
  async encryptOperations(
    ops: SyncOperation[],
    encryptKey: string,
  ): Promise<SyncOperation[]> {
    return Promise.all(ops.map((op) => this.encryptOperation(op, encryptKey)));
  }

  /**
   * Batch decrypt operations after download.
   * Non-encrypted ops pass through unchanged.
   */
  async decryptOperations(
    ops: SyncOperation[],
    encryptKey: string,
  ): Promise<SyncOperation[]> {
    return Promise.all(ops.map((op) => this.decryptOperation(op, encryptKey)));
  }

  /**
   * Encrypts an arbitrary payload (for snapshot uploads).
   * Returns the encrypted string.
   */
  async encryptPayload(payload: unknown, encryptKey: string): Promise<string> {
    const payloadStr = JSON.stringify(payload);
    return encrypt(payloadStr, encryptKey);
  }

  /**
   * Decrypts an encrypted payload string.
   * Returns the parsed payload object.
   */
  async decryptPayload<T = unknown>(
    encryptedPayload: string,
    encryptKey: string,
  ): Promise<T> {
    try {
      const decryptedStr = await decrypt(encryptedPayload, encryptKey);
      return JSON.parse(decryptedStr) as T;
    } catch (e) {
      throw new DecryptError('Failed to decrypt payload', e);
    }
  }
}
