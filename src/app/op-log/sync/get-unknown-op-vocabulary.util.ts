import { SUPER_SYNC_IMPORT_REASONS } from '@sp/shared-schema';
import { OpType, Operation } from '../core/operation.types';

const KNOWN_OP_TYPES: ReadonlySet<string> = new Set<string>(Object.values(OpType));
const KNOWN_IMPORT_REASONS: ReadonlySet<string> = new Set<string>(
  SUPER_SYNC_IMPORT_REASONS,
);

export type UnknownOpVocabulary = 'opType' | 'syncImportReason';

/**
 * Names the vocabulary field of a remote op this client cannot interpret, or
 * `null` when every value is known.
 *
 * The wire contract deliberately parses `opType` / `syncImportReason` as loose
 * strings (#8764) so a newer client's ops never wedge an older one at the
 * transport layer. The receiver must therefore make the call per op: an
 * unknown value means a newer client widened the vocabulary, and this client
 * can neither apply the op (unknown semantics) nor skip it (silent loss).
 */
export const getUnknownOpVocabulary = (
  op: Pick<Operation, 'opType' | 'syncImportReason'>,
): UnknownOpVocabulary | null => {
  // Only a PRESENT value can be unknown. Structural validity (opType is a
  // required non-empty string) is the transport schema's job, not this one's.
  if (isPresentUnknown(op.opType, KNOWN_OP_TYPES)) {
    return 'opType';
  }
  if (isPresentUnknown(op.syncImportReason, KNOWN_IMPORT_REASONS)) {
    return 'syncImportReason';
  }
  return null;
};

const isPresentUnknown = (value: unknown, known: ReadonlySet<string>): boolean =>
  typeof value === 'string' && !known.has(value);

/**
 * Everything before the first op with unknown vocabulary. `processRemoteOps`
 * blocks at that op, so pre-processing steps (e.g. the full-state conflict
 * gate) must not act on — or prompt the user about — anything after it.
 * Schema-version blocks are NOT covered here; they are a separate axis.
 */
export const takeInterpretableOpPrefix = <
  T extends Pick<Operation, 'opType' | 'syncImportReason'>,
>(
  ops: readonly T[],
): T[] => {
  const blockedIndex = ops.findIndex((op) => getUnknownOpVocabulary(op) !== null);
  return blockedIndex === -1 ? [...ops] : ops.slice(0, blockedIndex);
};
