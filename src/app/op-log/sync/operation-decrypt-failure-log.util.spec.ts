import {
  buildDecryptFailureLogPayload,
  MAX_LOGGED_DECRYPT_FAILURES,
} from './operation-decrypt-failure-log.util';
import { OperationBatchDecryptionDiagnosis } from './operation-encryption.service';

describe('buildDecryptFailureLogPayload', () => {
  const serverOp = (
    serverSeq: number,
    id: string,
  ): { serverSeq: number; op: { id: string } } => ({
    serverSeq,
    op: { id },
  });

  const diagnosisWith = (
    partial: Partial<OperationBatchDecryptionDiagnosis>,
  ): OperationBatchDecryptionDiagnosis => ({
    encryptedOperationCount: 1,
    decryptedCount: 0,
    parsedCount: 0,
    passwordEvidence: 'no-operation-decrypted',
    failures: [],
    ...partial,
  });

  it('maps a failure to its server sequence by batch index, not by untrusted id', () => {
    // Both envelopes carry the same id; only the index may pick the seq.
    const payload = buildDecryptFailureLogPayload(
      diagnosisWith({
        encryptedOperationCount: 2,
        decryptedCount: 1,
        parsedCount: 1,
        passwordEvidence: 'confirmed-for-some-operations',
        failures: [{ operationId: 'op-dup', encryptedBatchIndex: 1, stage: 'decrypt' }],
      }),
      [serverOp(41, 'op-dup'), serverOp(42, 'op-dup')],
      0,
    );

    expect(payload).toEqual({
      encryptedOperationCount: 2,
      decryptedCount: 1,
      parsedCount: 1,
      decryptedOpsInEarlierBatches: 0,
      passwordEvidence: 'confirmed-for-some-operations',
      failureCount: 1,
      failures: [
        { opId: 'op-dup', encryptedBatchIndex: 1, stage: 'decrypt', serverSeq: 42 },
      ],
    });
  });

  it('omits serverSeq when the envelope at the index does not carry the attributed op', () => {
    const payload = buildDecryptFailureLogPayload(
      diagnosisWith({
        failures: [{ operationId: 'op-a', encryptedBatchIndex: 0, stage: 'decrypt' }],
      }),
      [serverOp(7, 'a-different-op')],
      0,
    );

    expect((payload.failures as unknown[])[0]).toEqual({
      opId: 'op-a',
      encryptedBatchIndex: 0,
      stage: 'decrypt',
    });
  });

  it('caps logged failures while reporting the systemic wrong-password shape', () => {
    const failures = Array.from({ length: 500 }, (_, i) => ({
      operationId: `op-${i}`,
      encryptedBatchIndex: i,
      stage: 'decrypt' as const,
    }));
    const payload = buildDecryptFailureLogPayload(
      diagnosisWith({
        encryptedOperationCount: 500,
        passwordEvidence: 'no-operation-decrypted',
        failures,
      }),
      failures.map((f, i) => serverOp(i + 1, f.operationId)),
      0,
    );

    expect(payload.passwordEvidence).toBe('no-operation-decrypted');
    expect(payload.failureCount).toBe(500);
    expect((payload.failures as unknown[]).length).toBe(MAX_LOGGED_DECRYPT_FAILURES);
  });

  it('promotes password evidence when earlier batches decrypted with the same key', () => {
    // The #9256 shape: a single corrupt op alone on the final page decrypts
    // nothing in ITS batch, but the pages before it prove the password.
    const payload = buildDecryptFailureLogPayload(
      diagnosisWith({
        failures: [{ operationId: 'op-final', encryptedBatchIndex: 0, stage: 'decrypt' }],
      }),
      [serverOp(43, 'op-final')],
      42,
    );

    expect(payload.passwordEvidence).toBe('confirmed-for-some-operations');
    expect(payload.decryptedOpsInEarlierBatches).toBe(42);
  });

  it('reports a batch-runtime-only failure as zero failures with full counts', () => {
    const payload = buildDecryptFailureLogPayload(
      diagnosisWith({
        encryptedOperationCount: 3,
        decryptedCount: 3,
        parsedCount: 3,
        passwordEvidence: 'confirmed-for-some-operations',
        failures: [],
      }),
      [serverOp(1, 'op-1'), serverOp(2, 'op-2'), serverOp(3, 'op-3')],
      0,
    );

    expect(payload.failureCount).toBe(0);
    expect(payload.failures).toEqual([]);
    expect(payload.decryptedCount).toBe(3);
  });
});
