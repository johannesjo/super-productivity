import { OperationBatchDecryptionDiagnosis } from './operation-encryption.service';

/**
 * Wrong-password batches fail on every operation; logging one capped sample
 * plus the total keeps the exported Logs readable while `failureCount` and
 * `passwordEvidence` still make the systemic case unambiguous.
 */
export const MAX_LOGGED_DECRYPT_FAILURES = 3;

interface EncryptedServerOpRef {
  serverSeq: number;
  op: { id: string };
}

/**
 * Builds the safe-to-log payload for a failed encrypted download batch.
 * Contains only operation identifiers, sequence numbers, counts, and fixed
 * stages — never ciphertext, plaintext, or key material (sync rule 9).
 *
 * `encryptedServerOps` must be the same isPayloadEncrypted-filtered, ordered
 * view of the page the encryption service classified, so `encryptedBatchIndex`
 * maps back to a server envelope. `serverSeq` is attached per failure only
 * when the envelope at that index carries the attributed operation id — the
 * ids are untrusted and the mapping must never mislabel an operation.
 *
 * `decryptedOpsInEarlierBatches` carries run-level password evidence across
 * pages: a failure on page N with pages 1..N-1 decrypted proves the password
 * is not globally wrong even when nothing in the failing batch decrypted.
 */
export const buildDecryptFailureLogPayload = (
  diagnosis: OperationBatchDecryptionDiagnosis,
  encryptedServerOps: readonly EncryptedServerOpRef[],
  decryptedOpsInEarlierBatches: number,
): Record<string, unknown> => {
  const failures = diagnosis.failures
    .slice(0, MAX_LOGGED_DECRYPT_FAILURES)
    .map((failure) => {
      const serverOp = encryptedServerOps[failure.encryptedBatchIndex];
      return {
        opId: failure.operationId,
        encryptedBatchIndex: failure.encryptedBatchIndex,
        stage: failure.stage,
        ...(serverOp?.op.id === failure.operationId
          ? { serverSeq: serverOp.serverSeq }
          : {}),
      };
    });
  return {
    encryptedOperationCount: diagnosis.encryptedOperationCount,
    decryptedCount: diagnosis.decryptedCount,
    parsedCount: diagnosis.parsedCount,
    decryptedOpsInEarlierBatches,
    passwordEvidence:
      diagnosis.decryptedCount > 0 || decryptedOpsInEarlierBatches > 0
        ? 'confirmed-for-some-operations'
        : diagnosis.passwordEvidence,
    failureCount: diagnosis.failures.length,
    failures,
  };
};
